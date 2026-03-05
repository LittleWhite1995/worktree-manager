use std::path::PathBuf;
use std::process::Command;

use crate::types::OpenEditorRequest;
use crate::utils::normalize_path;

// ==================== Tauri 命令：工具 ====================

#[tauri::command]
pub(crate) fn open_in_terminal(path: String, terminal: Option<String>) -> Result<(), String> {
    let normalized = normalize_path(&path);
    let term = terminal.as_deref().unwrap_or("auto");
    log::info!("[system] Opening terminal at: {} (type: {})", normalized, term);

    #[cfg(target_os = "macos")]
    {
        match Command::new("open")
            .args(["-a", "Terminal", &normalized])
            .spawn()
        {
            Ok(_) => log::info!("[system] Spawned Terminal.app for: {}", normalized),
            Err(e) => {
                log::error!("[system] Failed to spawn Terminal.app: {}", e);
                return Err(format!("Failed to open terminal: {}", e));
            }
        }
    }

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;

        let result = match term {
            "cmd" => {
                Command::new("cmd")
                    .args(["/c", "start", "cmd", "/k", &format!("cd /d {}", normalized)])
                    .creation_flags(CREATE_NO_WINDOW)
                    .spawn()
            }
            "powershell" => {
                Command::new("cmd")
                    .args(["/c", "start", "powershell", "-NoExit", "-Command", &format!("Set-Location '{}'", normalized)])
                    .creation_flags(CREATE_NO_WINDOW)
                    .spawn()
            }
            "windowsterminal" => {
                Command::new("wt").args(["-d", &normalized]).spawn()
            }
            "gitbash" => {
                // Search common Git Bash locations
                let candidates = [
                    r"C:\Program Files\Git\git-bash.exe",
                    r"C:\Program Files (x86)\Git\git-bash.exe",
                ];
                let mut git_bash_path: Option<String> = None;
                for p in &candidates {
                    if std::path::Path::new(p).exists() {
                        git_bash_path = Some(p.to_string());
                        break;
                    }
                }
                if git_bash_path.is_none() {
                    if let Ok(local) = std::env::var("LOCALAPPDATA") {
                        let p = format!(r"{}\Programs\Git\git-bash.exe", local);
                        if std::path::Path::new(&p).exists() {
                            git_bash_path = Some(p);
                        }
                    }
                }
                match git_bash_path {
                    Some(p) => Command::new(p).arg(&format!("--cd={}", normalized)).spawn(),
                    None => Err(std::io::Error::new(std::io::ErrorKind::NotFound, "Git Bash not found")),
                }
            }
            _ => {
                // "auto": try WT first, then cmd
                let wt_result = Command::new("wt").args(["-d", &normalized]).spawn();
                if wt_result.is_ok() {
                    wt_result
                } else {
                    Command::new("cmd")
                        .args(["/c", "start", "cmd", "/k", &format!("cd /d {}", normalized)])
                        .creation_flags(CREATE_NO_WINDOW)
                        .spawn()
                }
            }
        };

        match result {
            Ok(_) => log::info!("[system] Spawned terminal '{}' for: {}", term, normalized),
            Err(e) => {
                log::error!("[system] Failed to spawn terminal '{}': {}", term, e);
                return Err(format!("Failed to open terminal: {}", e));
            }
        }
    }

    #[cfg(target_os = "linux")]
    {
        let terminals = ["x-terminal-emulator", "gnome-terminal", "konsole", "xterm"];
        let mut opened = false;
        for t in &terminals {
            let result = if *t == "gnome-terminal" {
                Command::new(t)
                    .args(["--working-directory", &normalized])
                    .spawn()
            } else {
                Command::new(t).current_dir(&normalized).spawn()
            };
            if result.is_ok() {
                log::info!("[system] Spawned {} for: {}", t, normalized);
                opened = true;
                break;
            }
        }
        if !opened {
            log::error!("[system] No terminal emulator found on Linux");
            return Err("No terminal emulator found".to_string());
        }
    }

    Ok(())
}

fn editor_cli_command(editor: &str) -> &'static str {
    match editor {
        "vscode" => "code",
        "cursor" => "cursor",
        "antigravity" => "antigravity",
        "idea" => "idea",
        _ => "code",
    }
}

#[cfg(target_os = "macos")]
fn editor_app_name(editor: &str) -> &'static str {
    match editor {
        "vscode" => "Visual Studio Code",
        "cursor" => "Cursor",
        "antigravity" => "Antigravity",
        "idea" => "IntelliJ IDEA",
        _ => "Visual Studio Code",
    }
}

pub(crate) fn open_editor_at_path(request: &OpenEditorRequest) -> Result<(), String> {
    let path = &request.path;
    log::info!(
        "[system] Opening editor: type={}, path={}",
        request.editor,
        path
    );

    #[cfg(target_os = "macos")]
    {
        let app_name = editor_app_name(&request.editor);
        if Command::new("open")
            .args(["-a", app_name, path])
            .spawn()
            .is_ok()
        {
            log::info!("[system] Spawned {} via open -a for: {}", app_name, path);
            return Ok(());
        }
        let cmd = editor_cli_command(&request.editor);
        match Command::new(cmd).arg(path).spawn() {
            Ok(_) => {
                log::info!("[system] Spawned {} CLI for: {}", cmd, path);
            }
            Err(e) => {
                log::error!("[system] Failed to spawn editor process: {}", e);
                return Err(format!("无法打开 {}，请确认已安装该编辑器", app_name));
            }
        }
    }

    #[cfg(not(target_os = "macos"))]
    {
        let cmd = editor_cli_command(&request.editor);
        match Command::new(cmd).arg(path).spawn() {
            Ok(_) => {
                log::info!("[system] Spawned {} for: {}", cmd, path);
            }
            Err(e) => {
                log::error!("[system] Failed to spawn editor process: {}", e);
                return Err(format!("无法打开编辑器 {}: {}", cmd, e));
            }
        }
    }

    Ok(())
}

#[tauri::command]
pub(crate) fn open_in_editor(request: OpenEditorRequest) -> Result<(), String> {
    open_editor_at_path(&request)
}

#[tauri::command]
pub(crate) fn reveal_in_finder(path: String) -> Result<(), String> {
    let normalized = normalize_path(&path);
    log::info!("[system] Revealing in file manager: {}", normalized);

    #[cfg(target_os = "macos")]
    {
        match Command::new("open").arg(&normalized).spawn() {
            Ok(_) => log::info!("[system] Spawned Finder for: {}", normalized),
            Err(e) => {
                log::error!("[system] Failed to spawn Finder: {}", e);
                return Err(format!("无法打开文件夹: {}", e));
            }
        }
    }

    #[cfg(target_os = "windows")]
    {
        match Command::new("explorer").arg(&normalized).spawn() {
            Ok(_) => log::info!("[system] Spawned Explorer for: {}", normalized),
            Err(e) => {
                log::error!("[system] Failed to spawn Explorer: {}", e);
                return Err(format!("无法打开文件夹: {}", e));
            }
        }
    }

    #[cfg(target_os = "linux")]
    {
        match Command::new("xdg-open").arg(&normalized).spawn() {
            Ok(_) => log::info!("[system] Spawned xdg-open for: {}", normalized),
            Err(e) => {
                log::error!("[system] Failed to spawn xdg-open: {}", e);
                return Err(format!("无法打开文件夹: {}", e));
            }
        }
    }

    Ok(())
}

#[tauri::command]
pub(crate) fn open_log_dir() -> Result<(), String> {
    let log_dir = get_platform_log_dir()?;
    log::info!("[system] Opening log directory: {:?}", log_dir);

    if !log_dir.exists() {
        log::warn!("[system] Log directory does not exist: {:?}", log_dir);
        return Err("日志目录不存在".to_string());
    }

    let dir_str = log_dir.to_str().unwrap_or("");

    #[cfg(target_os = "macos")]
    {
        match Command::new("open").arg(dir_str).spawn() {
            Ok(_) => log::info!("[system] Spawned Finder for log directory"),
            Err(e) => {
                log::error!("[system] Failed to open log directory: {}", e);
                return Err(format!("无法打开日志目录: {}", e));
            }
        }
    }

    #[cfg(target_os = "windows")]
    {
        match Command::new("explorer").arg(dir_str).spawn() {
            Ok(_) => log::info!("[system] Spawned Explorer for log directory"),
            Err(e) => {
                log::error!("[system] Failed to open log directory: {}", e);
                return Err(format!("无法打开日志目录: {}", e));
            }
        }
    }

    #[cfg(target_os = "linux")]
    {
        match Command::new("xdg-open").arg(dir_str).spawn() {
            Ok(_) => log::info!("[system] Spawned xdg-open for log directory"),
            Err(e) => {
                log::error!("[system] Failed to open log directory: {}", e);
                return Err(format!("无法打开日志目录: {}", e));
            }
        }
    }

    Ok(())
}

/// Get the platform-appropriate log directory.
fn get_platform_log_dir() -> Result<PathBuf, String> {
    #[cfg(target_os = "macos")]
    {
        let home = std::env::var("HOME").map_err(|_| "无法获取用户目录".to_string())?;
        Ok(PathBuf::from(home).join("Library/Logs/com.guo.worktree-manager"))
    }
    #[cfg(target_os = "windows")]
    {
        // Tauri on Windows logs to %APPDATA%/{identifier}/logs
        let appdata = std::env::var("APPDATA")
            .or_else(|_| std::env::var("LOCALAPPDATA"))
            .map_err(|_| "无法获取 APPDATA 目录".to_string())?;
        Ok(PathBuf::from(appdata)
            .join("com.guo.worktree-manager")
            .join("logs"))
    }
    #[cfg(target_os = "linux")]
    {
        // Tauri on Linux logs to $XDG_DATA_HOME/{identifier}/logs or ~/.local/share/...
        let data_home = std::env::var("XDG_DATA_HOME").unwrap_or_else(|_| {
            let home = std::env::var("HOME").unwrap_or_default();
            format!("{}/.local/share", home)
        });
        Ok(PathBuf::from(data_home)
            .join("com.guo.worktree-manager")
            .join("logs"))
    }
}

// ==================== HTTP Server 共享接口 ====================

pub fn open_in_terminal_internal(path: &str, terminal: Option<&str>) -> Result<(), String> {
    open_in_terminal(path.to_string(), terminal.map(|s| s.to_string()))
}

pub fn open_in_editor_internal(request: &OpenEditorRequest) -> Result<(), String> {
    open_editor_at_path(request)
}

pub fn reveal_in_finder_internal(path: &str) -> Result<(), String> {
    reveal_in_finder(path.to_string())
}

pub fn open_log_dir_internal() -> Result<(), String> {
    open_log_dir()
}
