<div align="center">

<img src="docs/icons/app-icon.svg" width="128" height="128" alt="Worktree Manager">

# Worktree Manager

**The missing GUI for Git Worktrees.**

Work on multiple branches simultaneously, across multiple repos, without `stash`, `clone`, or context-switching pain.

Desktop app + browser remote access. Built with Tauri 2, React 19, and Rust.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![GitHub release](https://img.shields.io/github/v/release/guoyongchang/worktree-manager)](https://github.com/guoyongchang/worktree-manager/releases)
[![CI](https://github.com/guoyongchang/worktree-manager/actions/workflows/ci.yml/badge.svg)](https://github.com/guoyongchang/worktree-manager/actions/workflows/ci.yml)

[**Download**](https://github.com/guoyongchang/worktree-manager/releases) |
[Documentation](https://guoyongchang.github.io/worktree-manager/) |
[MCP Integration](docs/MCP.md) |
[中文](README.zh-CN.md)

</div>

---

## The Problem

You're deep in a feature branch. Fifteen files changed. Dev server running. Then Slack pings: **production is down**.

Traditional workflow: `git stash` &rarr; switch branch &rarr; `npm install` (different lockfile) &rarr; wait for rebuild &rarr; fix the bug &rarr; switch back &rarr; `git stash pop` &rarr; pray for no conflicts &rarr; restart dev server. **15 minutes minimum**, while production burns.

**With Worktree Manager**: click "New Worktree", type `hotfix-payment`, done. Your feature branch dev server keeps running. Dependencies are shared via symlink &mdash; instant setup. Fix, push, archive. **30 seconds of switching cost.**

## Key Features

### Parallel Branch Development

Work on multiple branches at the same time in isolated directories. Each worktree has its own file tree, but shares the same `.git` data. No cloning, no stashing.

### Multi-Repo Workspaces

Group related repositories (frontend + backend + shared libs) into a single workspace. Create a worktree and **all repos switch together** &mdash; no more "I forgot to switch the API repo" debugging sessions.

### Smart Symlinks

Automatically symlink `node_modules`, `.next`, `vendor`, `target`, and other heavy directories when creating worktrees. Zero extra disk space. Zero dependency reinstall time.

### One-Click Git Operations

Sync with base branch, merge to test, pull, push &mdash; all from the UI. Real-time diff stats show how many commits you're ahead/behind. Batch-trigger operations across all projects in a worktree.

### Built-in Terminal

Full terminal emulator (xterm.js + PTY) per worktree. Split your workflow without leaving the app. Shell integration, search, voice input, and per-project terminal tabs.

### Browser Remote Access

Share your workspace over the network. Password-protected, with optional ngrok tunneling for public access. View code, run terminal commands, and manage worktrees from any browser &mdash; no client installation needed.

### IDE Integration

One-click open in VS Code, Cursor, or IntelliJ IDEA. Auto-detects installed editors with native app icons.

### Safe Archiving

When a branch is done, archive the worktree. Pre-archive checks catch uncommitted changes, unpushed commits, and running processes. Restore anytime with one click.

### AI-Ready (MCP)

Built-in [Model Context Protocol](docs/MCP.md) server lets AI assistants (Claude Code, Cursor, Codex) create worktrees, check status, and run git operations through natural language.

### Tag-Based Organization

Tag projects by team, domain, or stack. Filter and batch-select by tags when creating worktrees. Visual tag chips throughout the UI.

## Quick Start

### Download (Recommended)

Grab the latest release for your platform:

| Platform | Download |
|----------|----------|
| macOS    | [`.dmg`](https://github.com/guoyongchang/worktree-manager/releases/latest) |
| Windows  | [`-setup.exe`](https://github.com/guoyongchang/worktree-manager/releases/latest) |
| Linux    | [`.AppImage` / `.deb`](https://github.com/guoyongchang/worktree-manager/releases/latest) |

**Only requirement: Git 2.0+.** No Node.js or Rust needed at runtime.

### Get Started in 3 Steps

1. **Create a Workspace** &mdash; Point to your project directory or create a new one
2. **Add Projects** &mdash; Import repos via GitHub shorthand (`owner/repo`), SSH, or HTTPS
3. **Create Worktrees** &mdash; Click "+", name your branch, select projects, go

## How It Works

Worktree Manager builds on Git's native [`git worktree`](https://git-scm.com/docs/git-worktree) feature, which lets you check out multiple branches into separate directories while sharing a single `.git` database.

```
workspace/
├── .worktree-manager.json        # Workspace config
├── projects/                     # Main repos (base branches)
│   ├── frontend/
│   └── backend/
└── worktrees/                    # Your worktrees
    ├── feature-checkout-v2/
    │   ├── projects/
    │   │   ├── frontend/         # ← git worktree (own branch)
    │   │   │   └── node_modules  # ← symlink to main
    │   │   └── backend/
    │   ├── .claude -> ../../.claude       # Shared files
    │   └── CLAUDE.md -> ../../CLAUDE.md
    └── hotfix-payment/
        └── ...
```

**Shared items** (`.claude`, `CLAUDE.md`, config files) are automatically symlinked across all worktrees so AI assistants and tooling configs stay in sync.

## Configuration

### Workspace Config (`.worktree-manager.json`)

```jsonc
{
  "name": "My Project",
  "worktrees_dir": "worktrees",
  "linked_workspace_items": [".claude", "CLAUDE.md"],
  "tags": [
    { "id": "fe", "name": "Frontend", "color": "#3B82F6" },
    { "id": "be", "name": "Backend", "color": "#10B981" }
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

### Adding Projects

| Format | Example |
|--------|---------|
| GitHub shorthand | `facebook/react` |
| SSH | `git@github.com:facebook/react.git` |
| SSH (custom port) | `ssh://git@gitlab.com:1022/org/repo.git` |
| HTTPS | `https://github.com/facebook/react.git` |

## Building from Source

<details>
<summary>For contributors and developers</summary>

**Prerequisites:** Node.js 20+, Rust 1.70+ ([install](https://rustup.rs)), Git 2.0+

```bash
git clone https://github.com/guoyongchang/worktree-manager.git
cd worktree-manager
npm install

# Development
npm run build && npm run tauri dev

# Production build
npm run tauri build

# Verify command contracts (IPC ↔ HTTP sync)
npm run contracts
```

See [TESTING.md](docs/TESTING.md) for the testing strategy.

</details>

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Tauri 2 |
| Frontend | React 19 + TypeScript 5 |
| Styling | Tailwind CSS 4 + Radix UI |
| Build | Vite 7 |
| Backend | Rust (axum, git2, tokio) |
| Terminal | xterm.js + portable-pty |

## Contributing

Contributions are welcome! Please open an issue first to discuss what you'd like to change.

1. Fork the repo
2. Create your branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## License

[MIT](LICENSE)

---

<div align="center">

**If Worktree Manager saves you time, consider giving it a star!**

[Report Bug](https://github.com/guoyongchang/worktree-manager/issues) &middot;
[Request Feature](https://github.com/guoyongchang/worktree-manager/issues) &middot;
[Documentation](https://guoyongchang.github.io/worktree-manager/)

</div>
