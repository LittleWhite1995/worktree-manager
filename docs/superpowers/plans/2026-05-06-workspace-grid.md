# Multi-Workspace Grid Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow opening multiple independent workspace views side-by-side in a grid layout (max 3×3) within a single Tauri desktop window.

**Architecture:** `App.tsx` renders `<WorkspaceGrid />` (desktop) or `<WorkspaceCell />` (web). `WorkspaceGrid` manages a 2D jagged grid of cells, wrapping each in `CellContext.Provider`. Each `WorkspaceCell` is an independent workspace view extracted from the current App.tsx desktop layout. Hooks read `CellContext` to skip global side effects (window title, shortcuts, `set_window_workspace`) for non-primary cells. Backend commands gain an optional `workspace_path` parameter for explicit routing.

**Tech Stack:** React 19, TypeScript, Tauri 2, Rust, Tailwind CSS

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `src/contexts/CellContext.ts` | CREATE | CellContext definition with `cellId` and `isPrimary` |
| `src/components/WorkspaceGrid.tsx` | CREATE | Grid state management, add/close logic, CSS grid layout |
| `src/components/WorkspaceCell.tsx` | CREATE | Independent workspace view extracted from App.tsx desktop layout |
| `src/App.tsx` | MODIFY | Desktop path → `<WorkspaceGrid />`, Web path → `<WorkspaceCell />` |
| `src/hooks/useWorkspace.ts` | MODIFY | Read CellContext, skip `set_window_workspace` when not primary, pass explicit `workspacePath` |
| `src/hooks/useAppShellState.ts` | MODIFY | Read CellContext, skip global shortcuts/title when not primary |
| `src/components/TerminalPanel.tsx` | MODIFY | Add worktree name badge when terminal is fullscreen |
| `src/components/index.ts` | MODIFY | Export new components |
| `src/locales/zh-CN.json` | MODIFY | Add grid-related i18n keys |
| `src/locales/en-US.json` | MODIFY | Add grid-related i18n keys |
| `src-tauri/src/commands/workspace.rs` | MODIFY | Add optional `workspace_path` to ~6 commands |
| `src-tauri/src/commands/worktree.rs` | MODIFY | Add optional `workspace_path` to ~4 commands |

---

### Task 1: Create CellContext

**Files:**
- Create: `src/contexts/CellContext.ts`

- [ ] **Step 1: Create the CellContext file**

```typescript
// src/contexts/CellContext.ts
import { createContext, useContext } from 'react';

export interface CellContextValue {
  cellId: string;      // "0-0", "0-1", "1-2", etc.
  isPrimary: boolean;  // cellId === "0-0"
}

export const CellContext = createContext<CellContextValue>({
  cellId: '0-0',
  isPrimary: true,
});

export function useCellContext(): CellContextValue {
  return useContext(CellContext);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/contexts/CellContext.ts
git commit -m "feat(grid): add CellContext for multi-cell awareness"
```

---

### Task 2: Add i18n Keys

**Files:**
- Modify: `src/locales/zh-CN.json`
- Modify: `src/locales/en-US.json`

- [ ] **Step 1: Add grid-related keys to zh-CN.json**

Add these keys under the `"grid"` namespace (add at the end, before the final closing brace):

```json
"grid": {
  "addColumn": "添加列",
  "addRow": "添加行",
  "closeCell": "关闭此面板"
}
```

- [ ] **Step 2: Add grid-related keys to en-US.json**

```json
"grid": {
  "addColumn": "Add Column",
  "addRow": "Add Row",
  "closeCell": "Close Panel"
}
```

- [ ] **Step 3: Commit**

```bash
git add src/locales/zh-CN.json src/locales/en-US.json
git commit -m "feat(grid): add i18n keys for grid layout"
```

---

### Task 3: Extract WorkspaceCell from App.tsx

This is the core extraction task. We take the desktop layout from `App.tsx` (lines 202–356) and move it into a standalone `WorkspaceCell` component. The cell receives `initialWorkspacePath`, `closable`, and `onClose` as props, and reads `cellId`/`isPrimary` from CellContext.

**Files:**
- Create: `src/components/WorkspaceCell.tsx`
- Modify: `src/components/index.ts`

- [ ] **Step 1: Create WorkspaceCell.tsx**

The component must:
1. Call `useAppShellState(t)` — each cell gets its own independent instance
2. Contain the full desktop layout: SettingsView (display:none toggle), Main View (sidebar + content + terminal), all modals, context menus, GlobalDialogs
3. Accept `WorkspaceCellProps` and read `cellId` from CellContext
4. NOT include: browser auth screens (kicked/login), welcome screen, loading overlay, WebSocket disconnect banner, mobile layout — those remain in App.tsx

```typescript
// src/components/WorkspaceCell.tsx
import { useTranslation } from "react-i18next";
import {
  WorktreeSidebar,
  WorktreeDetail,
  TerminalPanel,
  SettingsView,
  CreateWorktreeModal,
  AddWorkspaceModal,
  CreateWorkspaceModal,
  AddProjectModal,
  AddProjectToWorktreeModal,
  ArchiveConfirmationModal,
  WorktreeContextMenu,
  TerminalTabContextMenu,
  ToastProvider,
  GlobalDialogs,
} from "./index";
import { useAppShellState } from "../hooks/useAppShellState";
import { isTauri } from "../lib/backend";
import { useCellContext } from "../contexts/CellContext";

export interface WorkspaceCellProps {
  initialWorkspacePath: string;
  closable: boolean;
  onClose?: () => void;
}

export function WorkspaceCell({ initialWorkspacePath, closable, onClose }: WorkspaceCellProps) {
  const { t } = useTranslation();
  const { cellId, isPrimary } = useCellContext();
  const {
    workspace,
    viewMode,
    setViewMode,
    sidebarCollapsed,
    setSidebarCollapsed,
    terminalFullscreen,
    setTerminalFullscreen,
    showShortcutHelp,
    setShowShortcutHelp,
    terminalTabMenu,
    setTerminalTabMenu,
    modals,
    share,
    locks,
    mainOccupation,
    setSelectedWorktree,
    terminalHook,
    actions,
    updater,
    voice,
    openSettings,
    handleSaveConfig,
    handleTerminalTabContextMenu,
  } = useAppShellState(t);

  return (
    <ToastProvider>
      <div className="relative h-full w-full flex flex-col overflow-hidden">
        {/* Close button (hover-only, top-right) */}
        {closable && onClose && (
          <button
            onClick={onClose}
            className="absolute top-1 right-1 z-30 w-4 h-4 rounded-sm flex items-center justify-center
                       text-slate-500 bg-slate-800/60 opacity-0 group-hover/cell:opacity-100
                       hover:!bg-red-600 hover:!text-white transition-all"
            title={t('grid.closeCell')}
          >
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M1 1l6 6M7 1l-6 6" />
            </svg>
          </button>
        )}

        {/* Settings View */}
        <div
          className="h-full bg-slate-900 text-slate-100 p-6 overflow-y-auto"
          style={{ display: viewMode === 'settings' && workspace.config ? 'block' : 'none' }}
        >
          {workspace.config && (
            <SettingsView
              workspaceConfig={workspace.config}
              configPath={workspace.configPath}
              error={workspace.error}
              onBack={() => setViewMode('main')}
              onSaveConfig={handleSaveConfig}
              onClearError={() => workspace.setError(null)}
              onCheckUpdate={() => updater.openCheckerDialog()}
              checkingUpdate={updater.state === 'checking'}
              workspaces={workspace.workspaces}
              currentWorkspace={workspace.currentWorkspace}
              onRemoveWorkspace={workspace.removeWorkspace}
            />
          )}
        </div>

        {/* Main View */}
        <div
          className="h-full bg-slate-900 text-slate-100 flex overflow-hidden"
          style={{ display: viewMode === 'main' ? 'flex' : 'none' }}
        >
          {!terminalFullscreen && (
            <WorktreeSidebar
              workspaces={workspace.workspaces}
              currentWorkspace={workspace.currentWorkspace}
              showWorkspaceMenu={modals.showWorkspaceMenu}
              onShowWorkspaceMenu={(v) => modals.setModal('showWorkspaceMenu', v)}
              onSwitchWorkspace={actions.handleSwitchWorkspace}
              onAddWorkspace={() => modals.setModal('showAddWorkspaceModal', true)}
              mainWorkspace={workspace.mainWorkspace}
              worktrees={workspace.worktrees}
              selectedWorktree={actions.selectedWorktree}
              onSelectWorktree={actions.handleSelectWorktree}
              showArchived={modals.showArchived}
              onToggleArchived={() => modals.toggleModal('showArchived')}
              onContextMenu={actions.handleContextMenu}
              onRefresh={workspace.loadData}
              refreshing={workspace.refreshing}
              onOpenSettings={openSettings}
              onOpenCreateModal={actions.openCreateModal}
              updaterState={updater.state}
              onCheckUpdate={() => updater.openCheckerDialog()}
              onOpenInNewWindow={isTauri() ? actions.handleOpenInNewWindow : undefined}
              lockedWorktrees={locks.lockedWorktrees}
              collapsed={sidebarCollapsed}
              onToggleCollapsed={() => setSidebarCollapsed(prev => !prev)}
              switchingWorkspace={actions.switchingWorkspace}
              shareActive={share.shareActive}
              shareUrls={share.shareUrls}
              shareNgrokUrl={share.shareNgrokUrl}
              sharePassword={share.sharePassword}
              onStartShare={share.handleStartShare}
              onStopShare={share.handleStopShare}
              onUpdateSharePassword={share.handleUpdateSharePassword}
              ngrokLoading={share.ngrokLoading}
              onToggleNgrok={share.handleToggleNgrok}
              connectedClients={share.connectedClients}
              onKickClient={share.handleKickClient}
              hasLastConfig={share.hasLastConfig}
              onQuickShare={share.handleQuickShare}
              hasNgrokToken={share.hasNgrokToken}
              occupation={mainOccupation.occupation}
              batchArchiveModalOpen={actions.batchArchiveModalOpen}
              onToggleBatchArchiveModal={() => actions.setBatchArchiveModalOpen(!actions.batchArchiveModalOpen)}
              onBatchRestore={actions.handleBatchRestore}
              onBatchDelete={actions.handleBatchDelete}
            />
          )}

          <div className="flex-1 min-w-0 flex flex-col bg-slate-900">
            {!terminalFullscreen && (
              <div className="flex-1 p-6 overflow-y-auto min-h-0">
                <WorktreeDetail
                  selectedWorktree={actions.selectedWorktree}
                  mainWorkspace={workspace.mainWorkspace}
                  selectedEditor={actions.selectedEditor}
                  showEditorMenu={modals.showEditorMenu}
                  onShowEditorMenu={(v) => modals.setModal('showEditorMenu', v)}
                  onSelectEditor={actions.setSelectedEditor}
                  onOpenInEditor={actions.handleOpenInEditor}
                  onOpenInTerminal={workspace.openInTerminal}
                  onRevealInFinder={workspace.revealInFinder}
                  onSwitchBranch={workspace.switchBranch}
                  onArchive={() => actions.selectedWorktree && actions.openArchiveModal(actions.selectedWorktree)}
                  onRestore={actions.handleRestoreWorktree}
                  restoring={actions.restoringWorktree}
                  switching={actions.switchingWorktree}
                  onDelete={actions.selectedWorktree?.is_archived ? () => actions.setDeleteConfirmWorktree(actions.selectedWorktree) : undefined}
                  onAddProject={() => modals.setModal('showAddProjectModal', true)}
                  onRemoveProject={!actions.selectedWorktree ? actions.handleRemoveProject : undefined}
                  onAddProjectToWorktree={() => modals.setModal('showAddProjectToWorktreeModal', true)}
                  error={workspace.error}
                  onClearError={() => workspace.setError(null)}
                  onRefresh={workspace.loadData}
                  onSilentRefresh={() => workspace.loadData({ silent: true })}
                  onOpenTerminalPanel={terminalHook.handleTerminalTabClick}
                  occupation={mainOccupation.occupation}
                  deploying={mainOccupation.deploying}
                  exiting={mainOccupation.exiting}
                  onDeployToMain={isTauri() ? mainOccupation.deployToMain : undefined}
                  onExitOccupation={mainOccupation.exitOccupation}
                  onRefreshAfterDeploy={() => { setSelectedWorktree(null); workspace.loadData(); }}
                />
              </div>
            )}

            <TerminalPanel
              visible={terminalHook.terminalVisible}
              height={terminalHook.terminalHeight}
              onStartResize={() => terminalHook.setIsResizing(true)}
              terminalTabs={terminalHook.terminalTabs}
              activatedTerminals={terminalHook.activatedTerminals}
              mountedTerminals={terminalHook.mountedTerminals}
              activeTerminalTab={terminalHook.activeTerminalTab}
              onTabClick={terminalHook.handleTerminalTabClick}
              onTabContextMenu={handleTerminalTabContextMenu}
              onCloseTab={terminalHook.handleCloseTerminalTab}
              onCloseAllTabs={terminalHook.handleCloseAllTerminalTabs}
              onToggle={terminalHook.handleToggleTerminal}
              onCollapse={() => terminalHook.setTerminalVisible(false)}
              isFullscreen={terminalFullscreen}
              onToggleFullscreen={() => {
                const next = !terminalFullscreen;
                setTerminalFullscreen(next);
                if (next && !terminalHook.terminalVisible) {
                  terminalHook.handleToggleTerminal();
                }
              }}
              voiceStatus={voice.voiceStatus}
              voiceError={voice.voiceError}
              voiceWarning={voice.voiceWarning}
              isKeyHeld={voice.isKeyHeld}
              analyserNode={voice.analyserNode}
              onToggleVoice={voice.toggleVoice}
              onStopRecording={voice.stopRecording}
              staging={voice.staging}
              clientId={terminalHook.clientId}
              hasShellIntegration={terminalHook.shellIntegrationMap.get(terminalHook.activeTerminalTab ?? '') ?? false}
              onShellIntegrationDetected={(path) => terminalHook.markShellIntegrationActive(path)}
              onCwdChanged={(path, cwd) => terminalHook.updateTerminalCwd(path, cwd)}
              selectedWorktreeName={actions.selectedWorktree?.name}
            />
          </div>
        </div>

        {/* Modals */}
        <CreateWorktreeModal
          open={modals.showCreateModal && !!workspace.config}
          onOpenChange={(v) => modals.setModal('showCreateModal', v)}
          config={workspace.config}
          worktreeName={actions.newWorktreeName}
          onWorktreeNameChange={actions.setNewWorktreeName}
          folderAlias={actions.folderAlias}
          onFolderAliasChange={actions.setFolderAlias}
          useFolderAlias={actions.useFolderAlias}
          onUseFolderAliasChange={actions.setUseFolderAlias}
          selectedProjects={actions.selectedProjects}
          onToggleProject={actions.toggleProjectSelection}
          onUpdateBaseBranch={actions.updateProjectBaseBranch}
          onSubmit={actions.handleCreateWorktree}
          creating={actions.creating}
        />

        {isTauri() && (
          <AddWorkspaceModal
            open={modals.showAddWorkspaceModal}
            onOpenChange={(v) => modals.setModal('showAddWorkspaceModal', v)}
            name={actions.newWorkspaceName}
            onNameChange={actions.setNewWorkspaceName}
            path={actions.newWorkspacePath}
            onPathChange={actions.setNewWorkspacePath}
            onSubmit={actions.handleAddWorkspace}
            loading={actions.addingWorkspace}
          />
        )}

        <AddProjectModal
          open={modals.showAddProjectModal}
          onOpenChange={(v) => modals.setModal('showAddProjectModal', v)}
          onSubmit={actions.handleAddProject}
          loading={actions.cloningProject}
          scanLinkedFolders={workspace.scanLinkedFolders}
          workspacePath={workspace.currentWorkspace?.path}
          onUpdateLinkedFolders={actions.handleUpdateLinkedFolders}
          onSuccess={workspace.loadData}
        />

        <AddProjectToWorktreeModal
          open={modals.showAddProjectToWorktreeModal}
          onOpenChange={(v) => modals.setModal('showAddProjectToWorktreeModal', v)}
          config={workspace.config}
          worktree={actions.selectedWorktree}
          onSubmit={actions.handleAddProjectToWorktree}
          adding={actions.addingProjectToWorktree}
        />

        {actions.contextMenu && (
          <WorktreeContextMenu
            x={actions.contextMenu.x}
            y={actions.contextMenu.y}
            onClose={() => actions.setContextMenu(null)}
            onArchive={() => actions.openArchiveModal(actions.contextMenu!.worktree)}
          />
        )}

        {terminalTabMenu && (
          <TerminalTabContextMenu
            x={terminalTabMenu.x}
            y={terminalTabMenu.y}
            onClose={() => setTerminalTabMenu(null)}
            onDuplicate={() => {
              terminalHook.handleDuplicateTerminal(terminalTabMenu.path);
              setTerminalTabMenu(null);
            }}
            onCloseTab={() => {
              terminalHook.handleCloseTerminalTab(terminalTabMenu.path);
              setTerminalTabMenu(null);
            }}
            onCloseOtherTabs={() => {
              terminalHook.handleCloseOtherTerminalTabs(terminalTabMenu.path);
              setTerminalTabMenu(null);
            }}
            onCloseAllTabs={() => {
              terminalHook.handleCloseAllTerminalTabs();
              setTerminalTabMenu(null);
            }}
          />
        )}

        {actions.archiveModal && (
          <ArchiveConfirmationModal
            archiveModal={actions.archiveModal}
            onClose={() => actions.setArchiveModal(null)}
            onConfirmIssue={actions.confirmArchiveIssue}
            onTerminateProcess={actions.terminateArchiveLockProcess}
            onArchive={actions.handleArchiveWorktree}
            areAllIssuesConfirmed={actions.allArchiveIssuesConfirmed}
            archiving={actions.archiving}
            terminatingProcessPid={actions.terminatingArchiveLockPid}
          />
        )}

        <GlobalDialogs
          updater={updater}
          share={share}
          showShortcutHelp={showShortcutHelp}
          onSetShowShortcutHelp={setShowShortcutHelp}
          onOpenSettings={openSettings}
          deleteConfirmWorktree={actions.deleteConfirmWorktree}
          onSetDeleteConfirmWorktree={actions.setDeleteConfirmWorktree}
          onDeleteArchivedWorktree={actions.handleDeleteArchivedWorktree}
          deletingArchived={actions.deletingArchived}
        />
      </div>
    </ToastProvider>
  );
}
```

**Key differences from App.tsx desktop layout:**
- Wrapped in `<div className="relative h-full w-full ...">` instead of `h-screen`
- Close button rendered conditionally based on `closable` prop
- Cell has `group/cell` class for hover-based close button visibility
- No browser auth, welcome screen, loading overlay, mobile layout — those stay in App.tsx
- `TerminalPanel` receives new `selectedWorktreeName` prop (implemented in Task 6)

- [ ] **Step 2: Add export to components/index.ts**

Add this line to `src/components/index.ts`:

```typescript
export { WorkspaceCell } from './WorkspaceCell';
```

- [ ] **Step 3: Verify build compiles**

Run: `pnpm run build`

Expected: Build succeeds (WorkspaceCell is exported but not yet used, tree-shaking will handle it). If TerminalPanel's `selectedWorktreeName` prop doesn't exist yet, temporarily comment it out — it will be added in Task 6.

- [ ] **Step 4: Commit**

```bash
git add src/components/WorkspaceCell.tsx src/components/index.ts
git commit -m "feat(grid): extract WorkspaceCell component from App.tsx desktop layout"
```

---

### Task 4: Create WorkspaceGrid

**Files:**
- Create: `src/components/WorkspaceGrid.tsx`
- Modify: `src/components/index.ts`

- [ ] **Step 1: Create WorkspaceGrid.tsx**

```typescript
// src/components/WorkspaceGrid.tsx
import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { CellContext } from '../contexts/CellContext';
import { WorkspaceCell } from './WorkspaceCell';
import { PlusIcon } from './Icons';

interface GridCellState {
  id: string;                    // "0-0", "1-2", etc.
  initialWorkspacePath: string;  // inherited from neighbor on creation
}

type GridState = GridCellState[][];

function isCellClosable(grid: GridState, r: number, c: number): boolean {
  if (r === 0 && c === 0) return false;
  // Horizontally sandwiched: row has 3 cells and c === 1
  if (grid[r].length === 3 && c === 1) return false;
  // Vertically sandwiched in column 0: grid has 3 rows and r === 1
  if (c === 0 && grid.length === 3 && r === 1) return false;
  return true;
}

interface WorkspaceGridProps {
  currentWorkspacePath: string;
}

export function WorkspaceGrid({ currentWorkspacePath }: WorkspaceGridProps) {
  const { t } = useTranslation();
  const [grid, setGrid] = useState<GridState>(() => [[
    { id: '0-0', initialWorkspacePath: currentWorkspacePath },
  ]]);

  const totalCells = grid.reduce((sum, row) => sum + row.length, 0);

  const addCellToRow = useCallback((rowIndex: number) => {
    setGrid(prev => {
      const row = prev[rowIndex];
      if (row.length >= 3) return prev;
      const lastCell = row[row.length - 1];
      const colIndex = row.length;
      const newCell: GridCellState = {
        id: `${rowIndex}-${colIndex}`,
        initialWorkspacePath: lastCell.initialWorkspacePath,
      };
      const newGrid = prev.map((r, i) =>
        i === rowIndex ? [...r, newCell] : r
      );
      return newGrid;
    });
  }, []);

  const addRow = useCallback(() => {
    setGrid(prev => {
      if (prev.length >= 3) return prev;
      const lastRow = prev[prev.length - 1];
      const rowIndex = prev.length;
      const newCell: GridCellState = {
        id: `${rowIndex}-0`,
        initialWorkspacePath: lastRow[0].initialWorkspacePath,
      };
      return [...prev, [newCell]];
    });
  }, []);

  const closeCell = useCallback((rowIndex: number, colIndex: number) => {
    setGrid(prev => {
      const newGrid = prev.map((row, r) => {
        if (r !== rowIndex) return row;
        return row.filter((_, c) => c !== colIndex);
      }).filter(row => row.length > 0);

      // Re-index cell IDs after removal
      return newGrid.map((row, r) =>
        row.map((cell, c) => ({
          ...cell,
          id: `${r}-${c}`,
        }))
      );
    });
  }, []);

  return (
    <div className="h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Grid rows */}
      <div className="flex-1 min-h-0 flex flex-col">
        {grid.map((row, rowIndex) => (
          <div
            key={rowIndex}
            className="flex-1 min-h-0 flex"
            style={rowIndex > 0 ? { borderTop: '1px solid rgb(51 65 85)' } : undefined}
          >
            {row.map((cell, colIndex) => {
              const closable = isCellClosable(grid, rowIndex, colIndex);
              return (
                <CellContext.Provider
                  key={cell.id}
                  value={{ cellId: cell.id, isPrimary: cell.id === '0-0' }}
                >
                  <div
                    className="flex-1 min-w-0 group/cell relative"
                    style={colIndex > 0 ? { borderLeft: '1px solid rgb(51 65 85)' } : undefined}
                  >
                    <WorkspaceCell
                      initialWorkspacePath={cell.initialWorkspacePath}
                      closable={closable}
                      onClose={closable ? () => closeCell(rowIndex, colIndex) : undefined}
                    />
                  </div>
                </CellContext.Provider>
              );
            })}

            {/* Horizontal [+] button */}
            {row.length < 3 && (
              <button
                onClick={() => addCellToRow(rowIndex)}
                className={`shrink-0 flex items-center justify-center transition-colors text-slate-600 hover:text-slate-400 hover:bg-slate-800/50 ${
                  totalCells === 1 ? 'w-5 opacity-40 hover:opacity-100' : 'w-7'
                }`}
                title={t('grid.addColumn')}
              >
                <PlusIcon className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Vertical [+] button */}
      {grid.length < 3 && (
        <button
          onClick={addRow}
          className={`shrink-0 flex items-center justify-center transition-colors text-slate-600 hover:text-slate-400 hover:bg-slate-800/50 ${
            totalCells === 1 ? 'h-5 opacity-40 hover:opacity-100' : 'h-7'
          }`}
          title={t('grid.addRow')}
        >
          <PlusIcon className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Check if PlusIcon exists, add if needed**

Search for `PlusIcon` in `src/components/Icons.tsx`. If it doesn't exist, add it:

```typescript
export const PlusIcon: FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M8 3v10M3 8h10" />
  </svg>
);
```

- [ ] **Step 3: Add export to components/index.ts**

```typescript
export { WorkspaceGrid } from './WorkspaceGrid';
```

- [ ] **Step 4: Verify build compiles**

Run: `pnpm run build`

Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/components/WorkspaceGrid.tsx src/components/index.ts src/components/Icons.tsx
git commit -m "feat(grid): add WorkspaceGrid with add/close logic and CSS grid layout"
```

---

### Task 5: Wire App.tsx to Use WorkspaceGrid and WorkspaceCell

Replace the desktop layout block in App.tsx with `<WorkspaceGrid />` and use `<WorkspaceCell />` for web browser mode.

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Understand current App.tsx structure**

Current App.tsx flow:
1. Lines 29–50: Tauri browser behavior setup (module-level)
2. Lines 52–86: `function App()` — calls `useAppShellState(t)`, destructures everything
3. Lines 89–107: Browser kicked screen
4. Lines 110–147: Browser login screen
5. Lines 150–178: No workspace welcome
6. Lines 181–543: Main `return` with ToastProvider wrapping:
   - Lines 184–192: Loading overlay
   - Lines 195–200: WebSocket disconnect banner
   - Lines 202–356: **Desktop layout** ← this moves to WorkspaceCell
   - Lines 358–429: Mobile layout
   - Lines 431–541: Modals, context menus, dialogs

**The change:** App.tsx still calls `useAppShellState` for browser auth, welcome screen, loading, mobile layout. The desktop layout block (202–356) is replaced with `<WorkspaceGrid />`. Modals that are workspace-specific move into WorkspaceCell. Global-only modals (Add/Create workspace when no workspaces exist) stay in App.tsx.

However, the current `useAppShellState` call in App.tsx is still needed for the non-desktop paths. For desktop path, each WorkspaceCell will call its own `useAppShellState`. This means App.tsx's desktop path simply renders `<WorkspaceGrid />` and all cell-level state lives inside each cell.

- [ ] **Step 2: Modify App.tsx**

Replace the desktop layout section. The key changes:

1. Import `WorkspaceGrid` and `WorkspaceCell`
2. Desktop path (inside `!isMobileWeb && ...`): render `<WorkspaceGrid currentWorkspacePath={workspace.currentWorkspace?.path ?? ''} />`
3. Web browser path: wrap existing mobile check — if not mobile, render `<WorkspaceCell />` in a single-cell mode
4. Move workspace-scoped modals (CreateWorktree, AddProject, AddProjectToWorktree, ArchiveConfirmation, context menus, terminal tab menu) into WorkspaceCell — remove them from App.tsx
5. Keep in App.tsx: AddWorkspaceModal (welcome path), CreateWorkspaceModal (welcome path), GlobalDialogs, loading overlay, browser overlays

The detailed transformation of App.tsx:

```typescript
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  WorktreeSidebar,
  WorktreeDetail,
  TerminalPanel,
  SettingsView,
  WelcomeView,
  AddWorkspaceModal,
  CreateWorkspaceModal,
  RefreshIcon,
  ToastProvider,
  GlobalDialogs,
  MobileWorktreeList,
  MobileWorktreeDetail,
  WorkspaceGrid,
  WorkspaceCell,
} from "./components";
import { useAppShellState } from "./hooks/useAppShellState";
import { Input } from "@/components/ui/input";
import { isTauri, callBackend } from "./lib/backend";
import "./index.css";

// Disable browser-like behaviors (only in Tauri desktop mode)
// ... (unchanged, lines 29-50)

function App() {
  const { t } = useTranslation();
  const {
    browserAuth,
    workspace,
    shareWorkspaceName,
    viewMode,
    setViewMode,
    isMobileWeb,
    mobileView,
    setMobileView,
    terminalFullscreen,
    setTerminalFullscreen,
    terminalTabMenu,
    setTerminalTabMenu,
    modals,
    share,
    locks,
    mainOccupation,
    terminalHook,
    actions,
    updater,
    wsConnected,
    wasKicked,
    setWasKicked,
    voice,
    handleTerminalTabContextMenu,
  } = useAppShellState(t);

  // Browser mode: kicked screen (unchanged)
  // Browser mode: login screen (unchanged)
  // No workspace welcome (unchanged)

  return (
    <ToastProvider>
      <>
        {/* Loading overlay */}
        {workspace.loading && (
          <div className="fixed inset-0 z-50 bg-slate-900 flex items-center justify-center">
            <div className="flex items-center gap-3">
              <RefreshIcon className="w-5 h-5 animate-spin text-slate-400" />
              <span className="text-slate-400">{t('common.loading')}</span>
            </div>
          </div>
        )}

        {/* Browser mode: WebSocket disconnected overlay */}
        {!isTauri() && browserAuth.browserAuthenticated && !wsConnected && (
          <div className="fixed top-0 left-0 right-0 z-40 bg-yellow-900/90 text-yellow-200 text-xs py-1.5 px-4 text-center flex items-center justify-center gap-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
            {t('app.wsDisconnected')}
          </div>
        )}

        {/* ==================== Desktop Layout ==================== */}
        {!isMobileWeb && isTauri() && workspace.currentWorkspace && (
          <WorkspaceGrid currentWorkspacePath={workspace.currentWorkspace.path} />
        )}

        {/* ==================== Web Browser Layout (single cell) ==================== */}
        {!isMobileWeb && !isTauri() && workspace.currentWorkspace && (
          <div className="h-screen">
            <WorkspaceCell
              initialWorkspacePath={workspace.currentWorkspace.path}
              closable={false}
            />
          </div>
        )}

        {/* ==================== Mobile Layout ==================== */}
        {isMobileWeb && (
          /* Mobile layout JSX is unchanged from current App.tsx lines 360–428.
             Copy it verbatim — it uses App-level useAppShellState destructured values
             (workspace, actions, terminalHook, etc.) which are still available in App.tsx
             for the mobile path. Do NOT move mobile layout into WorkspaceCell. */
        )}

        {/* Global modals that don't belong to any cell */}
        <GlobalDialogs
          updater={updater}
          share={share}
          showShortcutHelp={false}
          onSetShowShortcutHelp={() => {}}
          onOpenSettings={() => {}}
          deleteConfirmWorktree={null}
          onSetDeleteConfirmWorktree={() => {}}
          onDeleteArchivedWorktree={async () => {}}
          deletingArchived={false}
        />
      </>
    </ToastProvider>
  );
}

export default App;
```

**Important note:** The mobile layout still uses App-level `useAppShellState` directly, as it's unchanged. The desktop and web browser paths now delegate to WorkspaceGrid/WorkspaceCell which each call their own `useAppShellState`.

- [ ] **Step 3: Verify build compiles and app starts**

Run: `pnpm run build && npm run tauri dev`

Expected: App starts, shows the same layout as before (1×1 grid = visually identical). The `[+]` buttons should be visible as thin strips on the right edge and bottom edge.

- [ ] **Step 4: Manual test: click [+] to add a cell**

Click the right-edge `[+]` button. A second cell should appear, splitting the window 50/50. Both cells should show the same workspace independently.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx
git commit -m "feat(grid): wire App.tsx to use WorkspaceGrid (desktop) and WorkspaceCell (web)"
```

---

### Task 6: Terminal Fullscreen Worktree Badge

**Files:**
- Modify: `src/components/TerminalPanel.tsx`

- [ ] **Step 1: Add `selectedWorktreeName` prop to TerminalPanelProps**

In `src/components/TerminalPanel.tsx`, add to the `TerminalPanelProps` interface (around line 265):

```typescript
selectedWorktreeName?: string | null;
```

- [ ] **Step 2: Add to destructured props**

In the component function signature (around line 296), add:

```typescript
selectedWorktreeName,
```

- [ ] **Step 3: Insert the badge in the header**

In the header section, between the tab scroll area (`</div>` at line 503) and the tool buttons (`{visible && (` at line 505), insert:

```tsx
{/* Worktree name badge (fullscreen only) */}
{isFullscreen && selectedWorktreeName && (
  <span className="text-xs text-slate-400 bg-slate-800/50 px-2 py-0.5 rounded shrink-0">
    {selectedWorktreeName}
  </span>
)}
```

- [ ] **Step 4: Verify build compiles**

Run: `pnpm run build`

Expected: Build succeeds. The badge only appears when terminal is fullscreen AND a non-main worktree is selected.

- [ ] **Step 5: Commit**

```bash
git add src/components/TerminalPanel.tsx
git commit -m "feat(grid): add worktree name badge in TerminalPanel fullscreen header"
```

---

### Task 7: Make useWorkspace Cell-Aware

**Files:**
- Modify: `src/hooks/useWorkspace.ts`

- [ ] **Step 1: Import CellContext**

Add at the top of `useWorkspace.ts`:

```typescript
import { useCellContext } from '../contexts/CellContext';
```

- [ ] **Step 2: Read CellContext in the hook**

At the beginning of `useWorkspace` function body (after `const [error, setError] = ...` around line 69):

```typescript
const { isPrimary } = useCellContext();
```

- [ ] **Step 3: Conditionally skip `set_window_workspace` for non-primary cells**

Modify the `useEffect` at lines 74–86 that calls `set_window_workspace`:

```typescript
useEffect(() => {
  if (!ready) return;
  if (!isPrimary) return; // Secondary cells don't bind to window
  const params = new URLSearchParams(window.location.search);
  const workspacePath = params.get('workspace');
  if (workspacePath) {
    callBackend('set_window_workspace', { workspacePath }).catch((e) => {
      console.error('Failed to set window workspace:', e);
    });
  }
}, [ready, isPrimary]);
```

- [ ] **Step 4: Verify build compiles**

Run: `pnpm run build`

Expected: Build succeeds. Primary cell [0,0] still calls `set_window_workspace`. Secondary cells skip it.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useWorkspace.ts
git commit -m "feat(grid): make useWorkspace skip set_window_workspace for non-primary cells"
```

---

### Task 8: Make useAppShellState Cell-Aware

**Files:**
- Modify: `src/hooks/useAppShellState.ts`

- [ ] **Step 1: Import CellContext**

Add at the top:

```typescript
import { useCellContext } from '../contexts/CellContext';
```

- [ ] **Step 2: Read CellContext**

At the beginning of `useAppShellState` function body:

```typescript
const { isPrimary } = useCellContext();
```

- [ ] **Step 3: Conditionally skip `setWindowTitle` for non-primary cells**

Modify the `useEffect` at lines 196–202:

```typescript
useEffect(() => {
  if (!isPrimary) return; // Only primary cell sets window title
  const wsName = workspace.currentWorkspace?.name;
  const title = !wsName
    ? "Worktree Manager"
    : `${wsName} - ${actions.selectedWorktree ? actions.selectedWorktree.name : t("app.mainWorkspace")}`;
  setWindowTitle(title);
}, [isPrimary, actions.selectedWorktree, t, workspace.currentWorkspace?.name]);
```

- [ ] **Step 4: Conditionally skip global keyboard shortcuts for non-primary cells**

Modify the `useEffect` at lines 230–281 to guard with `isPrimary`:

```typescript
useEffect(() => {
  if (!isPrimary) return; // Only primary cell registers global shortcuts

  function handleKeyDown(e: KeyboardEvent): void {
    // ... existing keydown logic unchanged ...
  }
  function handleClick(): void {
    setTerminalTabMenu(null);
  }
  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("click", handleClick);
  return () => {
    window.removeEventListener("keydown", handleKeyDown);
    window.removeEventListener("click", handleClick);
  };
}, [isPrimary, actions, modals, openSettings, terminalFullscreen, viewMode, workspace.config]);
```

- [ ] **Step 5: Verify build compiles**

Run: `pnpm run build`

Expected: Build succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useAppShellState.ts
git commit -m "feat(grid): make useAppShellState skip global shortcuts/title for non-primary cells"
```

---

### Task 9: Backend — Add Optional `workspace_path` to Workspace Commands

**Files:**
- Modify: `src-tauri/src/commands/workspace.rs`

The pattern: each Tauri command that currently resolves workspace via `window.label()` → `get_window_workspace_path()` gains an optional `workspace_path: Option<String>` parameter. When `Some`, use it directly. When `None`, fall back to existing `window.label()` lookup.

- [ ] **Step 1: Modify `get_current_workspace`**

```rust
#[tauri::command]
pub(crate) fn get_current_workspace(
    window: tauri::Window,
    workspace_path: Option<String>,
) -> Option<WorkspaceRef> {
    let label = match &workspace_path {
        Some(_) => "",  // won't be used
        None => window.label(),
    };
    if let Some(path) = workspace_path {
        let global = load_global_config();
        global.workspaces.iter().find(|w| w.path == path).cloned()
    } else {
        get_current_workspace_impl(label)
    }
}
```

- [ ] **Step 2: Modify `get_workspace_config`**

```rust
#[tauri::command]
pub(crate) fn get_workspace_config(
    window: tauri::Window,
    workspace_path: Option<String>,
) -> Result<WorkspaceConfig, String> {
    if let Some(path) = workspace_path {
        Ok(crate::config::load_workspace_config(&path))
    } else {
        get_workspace_config_impl(window.label())
    }
}
```

- [ ] **Step 3: Modify `save_workspace_config`**

```rust
#[tauri::command]
pub(crate) fn save_workspace_config(
    window: tauri::Window,
    config: WorkspaceConfig,
    workspace_path: Option<String>,
) -> Result<(), String> {
    if let Some(path) = workspace_path {
        save_workspace_config_internal(&path, &config)
    } else {
        save_workspace_config_impl(window.label(), config)
    }
}
```

- [ ] **Step 4: Modify `get_config_path_info`**

```rust
#[tauri::command]
pub(crate) fn get_config_path_info(
    window: tauri::Window,
    workspace_path: Option<String>,
) -> String {
    if let Some(path) = workspace_path {
        normalize_path(&get_workspace_config_path(&path).to_string_lossy())
    } else {
        get_config_path_info_impl(window.label())
    }
}
```

- [ ] **Step 5: Modify `switch_workspace`**

```rust
#[tauri::command]
pub(crate) fn switch_workspace(
    window: tauri::Window,
    path: String,
    workspace_path: Option<String>,
) -> Result<(), String> {
    // If workspace_path is provided (non-primary cell), only update global config
    // without binding to window. Primary cell uses existing window.label() binding.
    if workspace_path.is_some() {
        let global = load_global_config();
        if !global.workspaces.iter().any(|w| w.path == path) {
            return Err("Workspace not found".to_string());
        }
        // Don't update global.current_workspace or WINDOW_WORKSPACES for secondary cells
        // Just clear config cache so fresh data is loaded
        let mut cache = WORKSPACE_CONFIG_CACHE.lock().unwrap();
        *cache = None;
        Ok(())
    } else {
        switch_workspace_impl(window.label(), path)
    }
}
```

- [ ] **Step 6: Verify build compiles**

Run: `cd src-tauri && cargo check`

Expected: Compiles without errors. The `Option<String>` parameters are backward-compatible — existing callers that don't pass them get `None`.

- [ ] **Step 7: Commit**

```bash
git add src-tauri/src/commands/workspace.rs
git commit -m "feat(grid): add optional workspace_path to workspace commands for multi-cell routing"
```

---

### Task 10: Backend — Add Optional `workspace_path` to Worktree Commands

**Files:**
- Modify: `src-tauri/src/commands/worktree.rs`

Same pattern as Task 9, applied to worktree commands.

- [ ] **Step 1: Modify `list_worktrees`**

```rust
#[tauri::command]
pub(crate) async fn list_worktrees(
    window: tauri::Window,
    include_archived: bool,
    workspace_path: Option<String>,
) -> Result<Vec<WorktreeListItem>, String> {
    if let Some(path) = workspace_path {
        let config = crate::config::load_workspace_config(&path);
        tokio::task::spawn_blocking(move || {
            let worktrees_path = PathBuf::from(&path).join(&config.worktrees_dir);
            if !worktrees_path.exists() {
                return Ok(vec![]);
            }
            scan_worktrees_dir(&worktrees_path, &config, include_archived)
        })
        .await
        .map_err(|e| format!("Task join error: {}", e))?
    } else {
        let label = window.label().to_string();
        tokio::task::spawn_blocking(move || list_worktrees_impl(&label, include_archived))
            .await
            .map_err(|e| format!("Task join error: {}", e))?
    }
}
```

- [ ] **Step 2: Modify `get_main_workspace_status`**

```rust
#[tauri::command]
pub(crate) async fn get_main_workspace_status(
    window: tauri::Window,
    workspace_path: Option<String>,
) -> Result<MainWorkspaceStatus, String> {
    if let Some(path) = workspace_path {
        tokio::task::spawn_blocking(move || {
            let config = crate::config::load_workspace_config(&path);
            get_main_workspace_status_by_path(&path, &config)
        })
        .await
        .map_err(|e| format!("Task join error: {}", e))?
    } else {
        let label = window.label().to_string();
        tokio::task::spawn_blocking(move || get_main_workspace_status_impl(&label))
            .await
            .map_err(|e| format!("Task join error: {}", e))?
    }
}
```

Note: You'll need to extract the workspace-path-based logic from `get_main_workspace_status_impl` into a helper `get_main_workspace_status_by_path(path: &str, config: &WorkspaceConfig)` that doesn't need a window label.

- [ ] **Step 3: Modify `create_worktree`**

```rust
#[tauri::command]
pub(crate) async fn create_worktree(
    window: tauri::Window,
    request: CreateWorktreeRequest,
    workspace_path: Option<String>,
) -> Result<String, String> {
    let label = workspace_path.unwrap_or_else(|| window.label().to_string());
    match tokio::time::timeout(
        std::time::Duration::from_secs(CREATE_WORKTREE_TIMEOUT_SECS),
        tokio::task::spawn_blocking(move || create_worktree_impl(&label, request)),
    )
    .await
    {
        Ok(join_result) => join_result.map_err(|e| format!("Task join error: {}", e))?,
        Err(_) => Err(format!(
            "Worktree creation timed out after {} minutes",
            CREATE_WORKTREE_TIMEOUT_SECS / 60
        )),
    }
}
```

Wait — `create_worktree_impl` takes a `window_label` and internally does `get_window_workspace_config(window_label)`. For the `workspace_path` case, we need a different approach. The cleanest approach is to modify the `_impl` functions to accept either a label or a path. But that's a larger refactor.

**Simpler approach:** When `workspace_path` is provided, temporarily bind it as a fake label before calling the impl, then unbind:

Actually, the simplest backward-compatible approach is: when `workspace_path` is provided, temporarily insert it into `WINDOW_WORKSPACES` with a synthetic label like `"cell-{workspace_path}"`, call the impl with that label, then remove it. But this is fragile.

**Best approach for v1:** Only the commands that `useWorkspace` calls during normal operation need the explicit path. The `_impl` functions that resolve via `get_window_workspace_config` can be left as-is for the primary cell. For secondary cells, the frontend hook (`useWorkspace`) will use the `_by_path` variants where they exist, or we add new thin wrapper commands.

Let's simplify: for `create_worktree` and `archive_worktree`, these are already workspace-path-aware internally (they call `get_window_workspace_config` → return `(workspace_path, config)`). We can add a helper that resolves either from window label or explicit path:

```rust
// Helper: resolve workspace path + config from either explicit path or window label
fn resolve_workspace(
    window_label: &str,
    explicit_path: Option<String>,
) -> Result<(String, WorkspaceConfig), String> {
    if let Some(path) = explicit_path {
        let config = crate::config::load_workspace_config(&path);
        Ok((path, config))
    } else {
        get_window_workspace_config(window_label).ok_or_else(|| "No workspace selected".to_string())
    }
}
```

Then update `create_worktree_impl`, `archive_worktree_impl`, `restore_worktree_impl` to accept an `Option<String>` for explicit workspace path and use this helper. But modifying all `_impl` signatures is invasive.

**Pragmatic v1 approach:** Add the `resolve_workspace` helper. For commands used by secondary cells during normal operation (`list_worktrees`, `get_workspace_config`, `get_main_workspace_status`, `get_config_path_info`, `get_current_workspace`), add `workspace_path` parameter as shown. For mutating commands (`create_worktree`, `archive_worktree`, `restore_worktree`), defer to a follow-up — these are less frequently called and the user can use the primary cell for these operations in v1.

- [ ] **Step 4: Verify build compiles**

Run: `cd src-tauri && cargo check`

Expected: Compiles without errors.

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/commands/worktree.rs
git commit -m "feat(grid): add optional workspace_path to worktree read commands"
```

---

### Task 11: Frontend — Pass Explicit `workspacePath` from Non-Primary Cells

**Files:**
- Modify: `src/hooks/useWorkspace.ts`

- [ ] **Step 1: Accept `initialWorkspacePath` parameter in useWorkspace**

The hook needs to know which workspace to load for non-primary cells. Add parameter:

```typescript
export function useWorkspace(ready = true, initialWorkspacePath?: string): UseWorkspaceReturn {
```

- [ ] **Step 2: Use `isPrimary` to decide command routing**

For non-primary cells, pass `workspacePath` explicitly to backend calls. Modify `loadData`:

```typescript
const { isPrimary } = useCellContext();
const explicitPath = !isPrimary ? initialWorkspacePath : undefined;

const loadData = useCallback(async (options?: { silent?: boolean }) => {
  const version = ++loadVersion.current;
  const t0 = performance.now();
  if (!options?.silent) {
    if (!initialLoadDone.current) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
  }
  setError(null);
  try {
    const extra = explicitPath ? { workspacePath: explicitPath } : {};
    const [cfg, wts, main, path] = await Promise.all([
      callBackend<WorkspaceConfig>("get_workspace_config", extra),
      callBackend<WorktreeListItem[]>("list_worktrees", { includeArchived: true, ...extra }),
      callBackend<MainWorkspaceStatus>("get_main_workspace_status", extra),
      callBackend<string>("get_config_path_info", extra).catch(() => ''),
    ]);
    // ... rest unchanged
  }
  // ...
}, [explicitPath]);
```

Apply the same pattern to `switchWorkspace`, `loadWorkspaces` (add `extra` to `get_current_workspace` call).

- [ ] **Step 3: Verify build compiles**

Run: `pnpm run build`

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useWorkspace.ts
git commit -m "feat(grid): pass explicit workspacePath in useWorkspace for non-primary cells"
```

---

### Task 12: Integration Test — Multi-Cell Workflow

Manual testing checklist. No code changes.

- [ ] **Step 1: Start the app**

Run: `pnpm run build && npm run tauri dev`

- [ ] **Step 2: Verify 1×1 default**

App should look identical to before the grid feature. No visible borders or close buttons. Thin `[+]` strips on right edge and bottom edge.

- [ ] **Step 3: Add a second column**

Click the right-edge `[+]`. Window should split 50/50 horizontally. Both cells show the same workspace. Close button should appear on hover over the right cell.

- [ ] **Step 4: Test cell independence**

In the right cell, switch to a different workspace (if multiple exist) or select a different worktree. The left cell should be unaffected.

- [ ] **Step 5: Test terminal independence**

Open a terminal in the left cell. Open a terminal in the right cell. Each cell should have its own terminal tabs.

- [ ] **Step 6: Test close**

Hover over the right cell, click the close button (×). Should return to 1×1 layout.

- [ ] **Step 7: Test 2×2 grid**

Add a column, then add a row. Should see 4 cells. Close a corner cell. Verify grid adjusts correctly.

- [ ] **Step 8: Test terminal fullscreen badge**

Select a worktree (not main), open terminal, click fullscreen. Verify the worktree name badge appears in the terminal header.

- [ ] **Step 9: Test global shortcuts**

With 2+ cells open, press `Cmd+N`. Only the primary cell (top-left) should show the create worktree modal.

- [ ] **Step 10: Test window title**

With 2+ cells, switch worktree in the primary cell. Window title should update. Switch worktree in secondary cell. Window title should NOT change.

- [ ] **Step 11: Commit any fixes**

If any issues were found and fixed during testing, commit them.

```bash
git add -A
git commit -m "fix(grid): address issues found during integration testing"
```
