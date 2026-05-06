# Multi-Workspace Grid Layout

**Date:** 2026-05-06
**Scope:** Desktop (Tauri) only — Web and mobile layouts unchanged
**Backend:** Small changes — workspace-scoped commands add optional `workspace_path` parameter

## Motivation

When working across multiple projects/workspaces simultaneously, users must click the sidebar workspace switcher repeatedly. This design adds a grid layout that allows opening multiple independent workspace views side-by-side within a single window.

## Architecture

### Component Hierarchy

```
App.tsx (minimal change: desktop workspace view → <AppGrid />)
  ├─ Init/Loading flow → unchanged
  ├─ Desktop workspace → <AppGrid />
  ├─ Web browser       → <WorkspaceCell /> (single instance, default cellId "0-0")
  └─ Mobile            → existing mobile layout (unchanged)

AppGrid.tsx (NEW — grid state management, add/close logic, layout)
  ├─ CellContext.Provider per cell
  ├─ GridRow[0]
  │    ├─ <WorkspaceCell /> [0,0] (primary, not closable)
  │    ├─ <WorkspaceCell /> [0,1] (optional)
  │    ├─ <WorkspaceCell /> [0,2] (optional)
  │    └─ AddCellButton (horizontal "+")
  ├─ GridRow[1] (optional)
  │    └─ ...
  ├─ GridRow[2] (optional)
  │    └─ ...
  └─ AddRowButton (vertical "+")

WorkspaceCell.tsx (NEW — independent workspace view, extracted from App.tsx desktop layout)
  ├─ Reads cellId from CellContext
  ├─ Own useAppShellState instance (cellId-aware)
  ├─ CloseButton (top-right, conditional, provided by AppGrid)
  ├─ WorktreeSidebar (L)
  └─ ContentArea (R)
       ├─ WorktreeDetail / SettingsView
       └─ TerminalPanel (with fullscreen worktree badge)
```

### CellContext

```typescript
// contexts/CellContext.ts
interface CellContextValue {
  cellId: string;     // "0-0", "0-1", "1-2", etc.
  isPrimary: boolean; // cellId === "0-0"
}

const CellContext = createContext<CellContextValue>({ cellId: '0-0', isPrimary: true });
```

- **AppGrid:** wraps each WorkspaceCell in `<CellContext.Provider value={{ cellId, isPrimary }}>`
- **Web browser / no grid:** no Provider needed — hooks read default value `{ cellId: "0-0", isPrimary: true }`, behaving exactly as current code
- **Hooks** (`useWorkspace`, `useAppShellState`): call `useContext(CellContext)` to determine behavior. No prop drilling, no signature changes to hooks.

### Files Changed

| File | Change |
|------|--------|
| `App.tsx` | Desktop path renders `<AppGrid />`, Web path renders `<WorkspaceCell />`. Init, mobile untouched. |
| `AppGrid.tsx` | **NEW** — Grid state, layout, add/close logic |
| `WorkspaceCell.tsx` | **NEW** — Independent workspace view extracted from App.tsx desktop layout |
| `contexts/CellContext.ts` | **NEW** — CellContext definition |
| `TerminalPanel.tsx` | Add worktree name badge when terminal is fullscreen |
| `useWorkspace.ts` | Read `CellContext`, skip `set_window_workspace` when not primary |
| `useAppShellState.ts` | Read `CellContext`, skip global shortcuts/title when not primary |
| Backend commands | ~15 workspace-scoped commands add optional `workspace_path` parameter |

## Backend: Cell-Aware Command Routing

### Problem

Backend uses `WINDOW_WORKSPACES[window_label]` to resolve which workspace a command targets. One Tauri window has one `window_label`, so only one workspace binding per window.

### Solution

- **Primary cell [0,0]**: calls `set_window_workspace` as today. All existing behavior preserved.
- **Secondary cells**: do NOT call `set_window_workspace`. Pass `workspacePath` explicitly to every backend command.

**Backend command changes:** Workspace-scoped commands gain an optional `workspace_path: Option<String>` parameter. When provided, use it directly. When `None`, fall back to `window_label` lookup (existing behavior, backward compatible).

Affected commands (non-exhaustive):
- `get_current_workspace`, `get_workspace_config`, `save_workspace_config`
- `list_worktrees`, `create_worktree`, `archive_worktree`, `restore_worktree`
- `switch_workspace`
- Other commands that call `get_window_workspace_path(window_label)`

**Frontend hook change:** `useWorkspace` reads `CellContext`:
- `isPrimary === true` → calls `set_window_workspace` on init/switch (current behavior)
- `isPrimary === false` → skips `set_window_workspace`, passes `workspacePath` explicitly to all `callBackend` calls

### Global Side Effects (Primary cell only)

The following remain bound to the primary cell [0,0] only:
- `set_window_workspace` / `window_label` binding
- `setWindowTitle` — reflects [0,0]'s workspace/worktree
- Global keyboard shortcuts (`Cmd+N`, `Cmd+B`, `Escape`)

## Grid State Model

```typescript
interface GridCellState {
  id: string;                    // "0-0", "1-2", etc.
  initialWorkspacePath: string;  // inherited from neighbor on creation
}

// Grid is a 2D jagged array
type GridState = GridCellState[][];
```

**Constraints:**
- 1–3 rows, 1–3 columns per row (independent, jagged allowed)
- `cells[0][0]` always exists
- No persistence — resets to 1×1 on app restart
- All cells equal-sized (CSS grid `1fr`), no user resizing

## Add Rules

| Action | Condition | Behavior |
|--------|-----------|----------|
| Horizontal `[+]` | Row has < 3 cells | Append cell to row end, inherit workspace from left neighbor |
| Vertical `[+]` | Grid has < 3 rows | Append new row with 1 cell, inherit workspace from `cells[lastRow][0]` |

**`[+]` button placement:**
- Horizontal: rendered as the last flex child in each row, after the rightmost cell
- Vertical: rendered below the entire grid, left-aligned to first column width

## Close Rules

A cell at `[r, c]` is closable if ALL of the following are true:
1. It is NOT `[0, 0]`
2. It is NOT a horizontally sandwiched cell (row has 3 cells AND `c === 1`)
3. It is NOT a vertically sandwiched cell in column 0 (`c === 0` AND grid has 3 rows AND `r === 1`)

**Close behavior:**
1. Call `cleanupTerminalsForPath()` for all terminals in the cell
2. Remove cell from `cells[r]`
3. If row becomes empty, remove entire row

**Close button UX:**
- Floating at cell top-right corner
- Visible on cell hover only
- Small (16×16), semi-transparent, turns red on hover

## Cell Independence

Each WorkspaceCell owns an independent instance of:
- `useAppShellState` (workspace, worktrees, selectedWorktree — cellId-aware)
- `useTerminal` (terminal tabs, PTY sessions, fullscreen state)
- Sidebar collapsed state
- ViewMode (main / settings)

**WorkspaceCell props:**

```typescript
interface WorkspaceCellProps {
  initialWorkspacePath: string;  // from neighbor or current workspace
  closable: boolean;
  onClose?: () => void;
}
// cellId is read from CellContext, not props
```

**Cell lifecycle:**
- **Init:** reads `cellId` from CellContext. If primary, calls `set_window_workspace` (current behavior). Otherwise, loads workspace data via explicit path.
- **Runtime:** fully independent, user can switch workspace/worktree freely within the cell
- **Close:** cleanup terminals → call `onClose` → grid removes from state

**No inter-cell communication.** Cells are fully isolated. Config changes in one cell take effect in other cells showing the same workspace on next refresh.

## Keyboard Shortcuts & Global Events

**Problem:** `useAppShellState` registers global `keydown`/`click` handlers. Multiple cells = multiple handlers = all cells respond simultaneously.

**Solution:** Hooks read `CellContext.isPrimary`:
- Primary cell: registers global shortcuts as today (`Cmd+N`, `Cmd+B`, `Escape`), calls `setWindowTitle`
- Secondary cells: skip global shortcut registration, skip `setWindowTitle`
- Terminal `document`-level resize events: each cell scopes handlers to its own container element via ref, not `document`

## Terminal Fullscreen Worktree Badge

**When:** `terminalFullscreen === true` AND `selectedWorktree !== null` (not main workspace)

**What:** Display the worktree name (e.g., `author-meadow-coffee`) as a small badge in the TerminalPanel header, between terminal tabs and right-side tool buttons.

**Style:** Low-key, non-intrusive:
```
text-xs text-slate-400 bg-slate-800/50 px-2 py-0.5 rounded shrink-0
```

**Implementation:** In TerminalPanel.tsx header, insert a fixed-width badge between the tab scroll area and tool buttons. TerminalPanel receives `selectedWorktreeName` as a new prop.

**Terminal fullscreen scope:** Per-cell only — one cell's terminal fullscreen hides only that cell's detail area. No "whole grid fullscreen" concept.

## Visual Behavior

**Grid = 1×1 (default):**
- Visually identical to pre-change layout
- No cell borders, no close button
- `[+]` buttons rendered but styled minimally (right edge / bottom edge)

**Grid > 1×1:**
- 1px separator lines between cells
- Close buttons appear on hover for closable cells
- All cells equal-sized via CSS grid `1fr`

**Settings scope:**
- Per-cell only — opening settings replaces only that cell's content area

## Edge Cases

- **Last cell in row closed:** Row shrinks. If row becomes empty, row is removed.
- **Multiple cells on same workspace:** Safe. Each cell has independent UI state. Backend commands are stateless per-call (with explicit `workspace_path`).
- **Two cells on same worktree:** Terminal broadcast filtered by `(workspacePath, worktreeName)` may cause cross-cell sync. Acceptable for v1.
- **Workspace deleted while cell shows it:** Error state in that cell, user switches to another workspace.
- **9 cells (3×3 max):** Resource-intensive but acceptable for v1. No performance optimization needed.
