<div align="center">

<img src="docs/icons/app-icon.svg" width="128" height="128" alt="Worktree Manager">

# Worktree Manager

**Git Worktree 可视化管理工具**

多分支并行开发，多仓库联动，告别 `stash`、`clone` 和上下文切换的痛苦。

桌面端 + 浏览器远程访问。基于 Tauri 2 + React 19 + Rust 构建。

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![GitHub release](https://img.shields.io/github/v/release/guoyongchang/worktree-manager)](https://github.com/guoyongchang/worktree-manager/releases)
[![CI](https://github.com/guoyongchang/worktree-manager/actions/workflows/ci.yml/badge.svg)](https://github.com/guoyongchang/worktree-manager/actions/workflows/ci.yml)

[**下载**](https://github.com/guoyongchang/worktree-manager/releases) |
[文档](https://guoyongchang.github.io/worktree-manager/) |
[MCP 集成](docs/MCP.md) |
[English](README.md)

</div>

---

## 痛点场景

### 线上着火，但你手里的活还没提交

你正在 `feature/checkout-v2` 上重构结算流程，改了十几个文件，`npm run dev` 跑着热更新。这时候 Slack 弹出告警：线上支付回调 500 了。

传统做法：`git stash` &rarr; 切分支 &rarr; `npm install`（依赖版本不同，得重装）&rarr; 等构建 &rarr; 修 bug &rarr; 切回来 &rarr; `git stash pop` &rarr; 祈祷没冲突 &rarr; 重启 dev server。**15 分钟起步**，线上还在报错。

**用 Worktree Manager**：点「新建」，输入 `hotfix-payment`，完成。你的 feature 分支 dev server 还在跑，`node_modules` 通过 symlink 共享，秒级就绪。**切换成本 30 秒。**

### 前后端联调，分支对不上就炸

前后端分仓，做「会员体系」时两个仓库都要切到 `feature/membership`。同事让你看一个 `feature/search` 的问题，你切了前端忘了切后端——白屏、404，排查半天发现是分支没对齐。

**用 Worktree Manager**：一个 worktree 绑定多个仓库，切换 worktree 就是切换整套环境，不存在「只切了一半」。

### 提测合并全靠命令行肌肉记忆

需求完了要合 `test` 分支：`checkout test` &rarr; `pull` &rarr; `merge feature/xxx` &rarr; 解冲突 &rarr; `push` &rarr; 切回来。一天提测三四个需求，这套操作重复到麻木。

**用 Worktree Manager**：项目卡片直接有「合并到 test」「同步 base」「推送」按钮，一键操作，不离开当前分支。

## 核心功能

### 多分支并行

同时在多个分支上工作，互不干扰。每个 worktree 有独立的文件目录，共享同一个 `.git` 数据。不用 `stash`，不用 `clone` 多份。

### 多仓库工作区

将相关仓库（前端 + 后端 + 公共库）组成一个工作区。创建 worktree 时**所有仓库同步切换**，不会再出现「忘了切 API 仓库」的问题。

### 智能 Symlink

创建 worktree 时自动链接 `node_modules`、`.next`、`vendor`、`target` 等大目录。零额外磁盘占用，零依赖重装时间。

### 一键 Git 操作

同步 base 分支、合并到 test、拉取、推送——全在界面上完成。实时 diff 统计显示领先/落后多少个 commit。支持批量触发 worktree 内所有项目的操作。

### 内置终端

完整的终端模拟器（xterm.js + PTY），每个 worktree 独立会话。Shell 集成、搜索、语音输入、按项目分标签。

### 浏览器远程访问

通过网络分享你的工作区。密码保护，可选 ngrok 隧道穿透内网。在任意浏览器中查看代码、运行终端命令、管理 worktree——无需安装客户端。

### IDE 集成

一键用 VS Code、Cursor 或 IntelliJ IDEA 打开任意 worktree。自动检测已安装的编辑器并显示原生图标。

### 安全归档

分支开发完毕后归档 worktree。归档前自动检查未提交更改、未推送 commit、运行中的进程。随时一键恢复。

### AI 就绪（MCP）

内置 [Model Context Protocol](docs/MCP.md) 服务器，让 AI 助手（Claude Code、Cursor、Codex）通过自然语言创建 worktree、查看状态、执行 git 操作。

### 标签分组

按团队、领域或技术栈给项目打标签。创建 worktree 时按标签筛选和批量选择，项目卡片全局显示标签。

## 快速开始

### 直接下载（推荐）

| 平台 | 下载 |
|------|------|
| macOS | [`.dmg`](https://github.com/guoyongchang/worktree-manager/releases/latest) |
| Windows | [`-setup.exe`](https://github.com/guoyongchang/worktree-manager/releases/latest) |
| Linux | [`.AppImage` / `.deb`](https://github.com/guoyongchang/worktree-manager/releases/latest) |

**唯一要求：Git 2.0+。** 运行时不需要 Node.js 或 Rust。

### 三步上手

1. **创建工作区** &mdash; 导入你的项目目录，或新建一个 Workspace
2. **添加项目** &mdash; 通过 GitHub 简写（`owner/repo`）、SSH 或 HTTPS 添加仓库
3. **新建 Worktree** &mdash; 点击「+」，输入分支名，选择项目，开始开发

## 工作原理

Worktree Manager 基于 Git 原生的 [`git worktree`](https://git-scm.com/docs/git-worktree) 能力，在同一仓库中将多个分支检出到独立目录，共享 `.git` 数据。

```
workspace/
├── .worktree-manager.json        # 工作区配置
├── projects/                     # 主仓库（base 分支）
│   ├── frontend/
│   └── backend/
└── worktrees/                    # Worktree 目录
    ├── feature-checkout-v2/
    │   ├── projects/
    │   │   ├── frontend/         # ← git worktree（独立分支）
    │   │   │   └── node_modules  # ← symlink 到主仓库
    │   │   └── backend/
    │   ├── .claude -> ../../.claude       # 共享文件
    │   └── CLAUDE.md -> ../../CLAUDE.md
    └── hotfix-payment/
        └── ...
```

**共享文件**（`.claude`、`CLAUDE.md`、配置文件）自动 symlink 到所有 worktree，AI 助手和工具配置始终保持同步。

## 配置

### 工作区配置（`.worktree-manager.json`）

```jsonc
{
  "name": "我的项目",
  "worktrees_dir": "worktrees",
  "linked_workspace_items": [".claude", "CLAUDE.md"],
  "tags": [
    { "id": "fe", "name": "前端", "color": "#3B82F6" },
    { "id": "be", "name": "后端", "color": "#10B981" }
  ],
  "projects": [
    {
      "name": "web-app",
      "base_branch": "main",
      "test_branch": "test",
      "merge_strategy": "merge",
      "linked_folders": ["node_modules", ".next"],
      "tags": ["fe"]
    }
  ]
}
```

### 添加项目

| 格式 | 示例 |
|------|------|
| GitHub 简写 | `facebook/react` |
| SSH | `git@github.com:facebook/react.git` |
| SSH（自定义端口） | `ssh://git@gitlab.com:1022/org/repo.git` |
| HTTPS | `https://github.com/facebook/react.git` |

## 从源码构建

<details>
<summary>面向贡献者和开发者</summary>

**环境要求：** Node.js 20+、Rust 1.70+（[安装](https://rustup.rs)）、Git 2.0+

```bash
git clone https://github.com/guoyongchang/worktree-manager.git
cd worktree-manager
npm install

# 开发模式
npm run build && npm run tauri dev

# 生产构建
npm run tauri build

# 验证命令契约（IPC ↔ HTTP 同步）
npm run contracts
```

详见 [TESTING.md](docs/TESTING.md) 了解测试策略。

</details>

## 技术栈

| 层级 | 技术 |
|------|------|
| 框架 | Tauri 2 |
| 前端 | React 19 + TypeScript 5 |
| 样式 | Tailwind CSS 4 + Radix UI |
| 构建 | Vite 7 |
| 后端 | Rust（axum, git2, tokio） |
| 终端 | xterm.js + portable-pty |

## 参与贡献

欢迎贡献！请先开一个 issue 讨论你想改的内容。

1. Fork 本仓库
2. 创建特性分支（`git checkout -b feature/amazing-feature`）
3. 提交更改
4. 推送分支
5. 发起 Pull Request

## 许可证

[MIT](LICENSE)

---

<div align="center">

**如果 Worktree Manager 为你节省了时间，请给个 Star！**

[报告 Bug](https://github.com/guoyongchang/worktree-manager/issues) &middot;
[功能建议](https://github.com/guoyongchang/worktree-manager/issues) &middot;
[文档](https://guoyongchang.github.io/worktree-manager/)

</div>
