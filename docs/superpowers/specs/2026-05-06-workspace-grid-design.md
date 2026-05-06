# Multi-Workspace Grid Layout

**Date:** 2026-05-06
**Scope:** Desktop (Tauri) only — Web and mobile layouts unchanged
**Backend:** No changes required

## Motivation

When working across multiple projects/workspaces simultaneously, users must click the sidebar workspace switcher repeatedly. This design adds a grid layout that allows opening multiple independent workspace views side-by-side within a single window.

## Architecture

### Component Hierarchy

```
App.tsx (minimal change: desktop workspace view → <AppGrid />)
  ├─ Init/Loading flow → unchanged
  ├─ Desktop workspace → <AppGrid />        (one-line swap)
  ├─ Web browser       → existing layout     (unchanged)
  └─ Mobile            → existing layout     (unchanged)

AppGrid.tsx (NEW — grid state management)
  ├─ GridRow[0]
  │    ├─ WorkspaceCell[0,0]
  │    ├─ WorkspaceCell[0,1]  (optional)
  │    ├─ WorkspaceCell[0,2]  (optional)
  │    └─ AddCellButton       (horizontal "+")
  ├─ GridRow[1]  (optional)
  │    └─ ...
  ├─ GridRow[2]  (optional)
  │    └─ ...
  └─ AddRowButton             (vertical "+")

WorkspaceCell.tsx (NEW — extracted from App.tsx desktop layout)
  ├─ CloseButton (top-right, conditional)
  ├─ WorktreeSidebar (L)
  └─ ContentArea (R)
       ├─ WorktreeDetail / SettingsView
       └─ TerminalPanel (with fullscreen worktree badge)
```

### Files Changed

| File | Change |
|------|--------|
| `App.tsx` | Minimal: desktop workspace render swaps to `<AppGrid />`. Init, web, mobile untouched. |
| `AppGrid.tsx` | **NEW** — Grid state, layout, add/close logic |
| `WorkspaceCell.tsx` | **NEW** — Independent workspace view extracted from App.tsx desktop layout |
| `TerminalPanel.tsx` | Add worktree name badge when terminal is fullscreen |

## Grid State Model

```typescript
interface GridCell {
  id: string;                  // "0-0", "1-2", etc.
  initialWorkspacePath: string; // inherited from neighbor on creation
}

// Grid is a 2D array; rows can have different lengths (jagged)
type GridState = GridCell[][];

// Example: 2 cells in row 0, 1 cell in row 1
// [[{id:"0-0", ...}, {id:"0-1", ...}], [{id:"1-0", ...}]]
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

Each `WorkspaceCell` owns an independent instance of:
- `useAppShellState` (workspace, worktrees, selectedWorktree)
- `useTerminal` (terminal tabs, PTY sessions, fullscreen state)
- Sidebar collapsed state
- ViewMode (main / settings)

**Cell props:**

```typescript
interface WorkspaceCellProps {
  cellId: string;               // "0-0", "0-1", etc.
  initialWorkspacePath: string;  // from neighbor
  closable: boolean;
  onClose: () => void;
}
```

**Cell lifecycle:**
- **Init:** receives `initialWorkspacePath`, calls `switchWorkspace(path)`, focuses on main workspace view (`selectedWorktree = null`)
- **Runtime:** fully independent, user can switch workspace/worktree freely within the cell
- **Close:** cleanup terminals → call `onClose` → grid removes from state

**No inter-cell communication.** Cells are fully isolated. Config changes in one cell (e.g., workspace settings) take effect in other cells showing the same workspace on next refresh.

## Terminal Fullscreen Worktree Badge

**When:** `terminalFullscreen === true` AND `selectedWorktree !== null` (not main workspace)

**What:** Display the worktree name (e.g., `author-meadow-coffee`) as a small badge in the TerminalPanel header, horizontally centered between terminal tabs and right-side tool buttons.

**Style:** Low-key, non-intrusive:
```
text-xs text-slate-400 bg-slate-800/50 px-2 py-0.5 rounded
```

**Implementation:** Add a `flex-1` centered container between tabs and tools in TerminalPanel header. Conditionally render badge based on fullscreen state and selectedWorktree.

## Visual Behavior

**Grid = 1×1 (default):**
- Visually identical to pre-change layout
- No cell borders, no close button, no `[+]` button margins
- `[+]` buttons rendered but styled minimally (right edge / bottom edge)

**Grid > 1×1:**
- 1px separator lines between cells
- Close buttons appear on hover for closable cells
- All cells equal-sized via CSS grid `1fr`

**Terminal fullscreen scope:**
- Per-cell only — one cell's terminal fullscreen hides only that cell's detail area
- No "whole grid fullscreen" concept

**Settings scope:**
- Per-cell only — opening settings replaces only that cell's content area

## Edge Cases

- **Last cell in row closed:** Row shrinks. If row becomes empty, row is removed.
- **Multiple cells on same workspace:** Safe. Backend commands have no global mutex. Each cell has independent UI state.
- **Workspace deleted while cell shows it:** Same behavior as current single-view — error state in that cell, user switches to another workspace.
- **9 cells (3×3 max):** Resource-intensive but acceptable. Each cell runs independent hooks and terminal sessions. No hard performance optimization needed for v1.
