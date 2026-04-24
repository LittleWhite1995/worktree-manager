# OSC 633 shell integration for PowerShell
# Supports Windows PowerShell 5.1 and PowerShell 7+

# Only load inside worktree-manager terminals
if ($env:WORKTREE_MANAGER_SHELL_INTEGRATION -ne '1') { return }

# Guard: only load once
if ($Global:__WMState) { return }

# Protect against user profiles that set ErrorActionPreference = 'Stop'
$__wmOrigEAP = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
try {

# Load user profiles (all four paths, standard order)
$__wmProfiles = @(
    $PROFILE.AllUsersAllHosts,
    $PROFILE.AllUsersCurrentHost,
    $PROFILE.CurrentUserAllHosts,
    $PROFILE.CurrentUserCurrentHost
)
foreach ($__wmP in $__wmProfiles) {
    if ($__wmP -and (Test-Path $__wmP)) { . $__wmP }
}

# Initialize global state (after profile load to capture user's Prompt)
$Global:__WMState = @{
    OriginalPrompt = $function:Prompt
    LastHistoryId  = -1
    IsInExecution  = $false
}

# Escape control characters (\x00-\x1f), backslashes, and semicolons as \xHH.
# Compatible with PowerShell 5.1+ ([regex]::Replace with scriptblock).
function Global:__WM-Escape-Value([string]$value) {
    [regex]::Replace($value, '[\x00-\x1f\\;]', {
        param($match)
        -Join (
            [System.Text.Encoding]::UTF8.GetBytes($match.Value) |
            ForEach-Object { '\x{0:x2}' -f $_ }
        )
    })
}

# Custom Prompt function: emits OSC 633 sequences around the original prompt.
function Global:Prompt {
    # Exit code: prefer $LASTEXITCODE for native commands, fall back to $? boolean
    $ExitCode = if ($global:?) { 0 }
                elseif ($global:LASTEXITCODE) { $global:LASTEXITCODE }
                else { 1 }
    $LastHistoryEntry = Get-History -Count 1
    $Result = ""

    # D: previous command finished (only if a command was actually executed)
    if ($Global:__WMState.LastHistoryId -ne -1) {
        if ($Global:__WMState.IsInExecution) {
            $Global:__WMState.IsInExecution = $false
            if ($LastHistoryEntry.Id -eq $Global:__WMState.LastHistoryId) {
                # No new command (Ctrl+C or empty enter)
                $Result += "$([char]0x1b)]633;D`a"
            } else {
                $Result += "$([char]0x1b)]633;D;$ExitCode`a"
            }
        }
    }

    # Update history tracking
    if ($LastHistoryEntry) {
        $Global:__WMState.LastHistoryId = $LastHistoryEntry.Id
    }

    # A: prompt start
    $Result += "$([char]0x1b)]633;A`a"

    # P;Cwd: report current directory (FileSystem provider only)
    if ($pwd.Provider.Name -eq 'FileSystem') {
        $Result += "$([char]0x1b)]633;P;Cwd=$(__WM-Escape-Value $pwd.ProviderPath)`a"
    }

    # Execute original prompt
    $OriginalPrompt = ""
    try {
        $OriginalPrompt = & $Global:__WMState.OriginalPrompt
    } catch {}
    $Result += $OriginalPrompt

    # B: prompt end (user input begins)
    $Result += "$([char]0x1b)]633;B`a"

    return $Result
}

# PSConsoleHostReadLine wrapper: captures command text via PSReadLine
if (Get-Module -Name PSReadLine) {
    function Global:PSConsoleHostReadLine {
        $CommandLine = [Microsoft.PowerShell.PSConsoleReadLine]::ReadLine(
            $host.Runspace, $ExecutionContext, $null)
        $Global:__WMState.IsInExecution = $true

        # E: command text (\xHH escaped)
        [Console]::Write("$([char]0x1b)]633;E;$(__WM-Escape-Value $CommandLine)`a")
        # C: command execution started
        [Console]::Write("$([char]0x1b)]633;C`a")

        return $CommandLine
    }
}

} catch {
    # Shell integration failed to load — shell still works normally
} finally {
    $ErrorActionPreference = $__wmOrigEAP
}
