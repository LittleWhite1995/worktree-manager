import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  WorktreeSidebar,
  WorktreeDetail,
  TerminalPanel,
  SettingsView,
  CreateWorktreeModal,
  AddWorkspaceModal,
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

export interface WorkspaceCellProps {
  initialWorkspacePath: string;
  closable: boolean;
  onClose?: () => void;
}

export function WorkspaceCell({ initialWorkspacePath, closable, onClose }: WorkspaceCellProps) {
  const { t } = useTranslation();

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
  } = useAppShellState(t, initialWorkspacePath);

  // Cleanup all terminals when cell is unmounted (closed)
  const cleanupRef = useRef(terminalHook.cleanupTerminalsForPath);
  cleanupRef.current = terminalHook.cleanupTerminalsForPath;
  const wsPathRef = useRef(workspace.currentWorkspace?.path);
  wsPathRef.current = workspace.currentWorkspace?.path;
  useEffect(() => {
    return () => {
      if (wsPathRef.current) {
        cleanupRef.current(wsPathRef.current);
      }
    };
  }, []);

  return (
    <ToastProvider>
      <div className="relative h-full w-full flex flex-col overflow-hidden">
        {/* Close button */}
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

        {/* Settings View (desktop) */}
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

        {/* Main View (desktop) */}
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
              selectedWorktreeName={actions.selectedWorktree?.display_name || actions.selectedWorktree?.name}
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

        {/* Context Menus */}
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

        {/* Archive Confirmation Modal */}
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
