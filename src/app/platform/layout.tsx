'use client';

import { useEffect, useState, type ReactNode } from 'react';

import { CanvasSkeleton, Sidebar, Toolbar, Tour, useToolbar } from '@/components';

import { EmptyCanvas } from './components/EmptyCanvas';
import { Settings } from './components/Settings';
import { usePreferences } from './components/Settings/hooks';
import { SheetChrome } from './components/SheetChrome';
import { UserMenu } from './components/UserMenu';
import { WorkspaceSettings } from './components/WorkspaceSettings';
import { useWorkspaceManager } from './hooks';

const WorkspaceLayout = ({ children }: { children: ReactNode }) => {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [workspaceSettingsId, setWorkspaceSettingsId] = useState<string | null>(null);
  const { preferences, updatePreference } = usePreferences();

  useEffect(() => {
    document.documentElement.setAttribute('data-has-toolbar', '');

    return () => document.documentElement.removeAttribute('data-has-toolbar');
  }, []);

  const {
    workspaces,
    activeWorkspaceId,
    navItems,
    activeThreadId,
    activeThreadName,
    onWorkspaceSelect,
    onCreateWorkspace,
    onRenameWorkspace,
    onDeleteWorkspace,
    onMoveWorkspace,
    onCreateThread,
    onCreateFolder,
    onDeleteItem,
    onRenameItem,
    onItemClick,
    onMoveItem,
    onBulkDelete,
    onBulkMove,
    onBulkDeleteWorkspaces,
    editingItemId,
    clearEditingItemId,
    editingWorkspaceId,
    clearEditingWorkspaceId,
    invitations,
    onAcceptInvitation,
    onDeclineInvitation,
    reloadWorkspaces,
    loading,
  } = useWorkspaceManager();

  const { groups, pendingGroups, activeTool, handleToolClick } = useToolbar(loading);

  const workspaceSettingsTarget = workspaces.find((workspace) => workspace.id === workspaceSettingsId);

  return (
    <div className="relative flex h-screen w-screen gap-3 overflow-hidden bg-[color:var(--app-bg-tint)] p-3 transition-colors duration-200 ease-out">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{ backgroundImage: 'var(--app-atmosphere)' }}
      />
      <div aria-hidden className="app-grain pointer-events-none fixed inset-0 noise-texture" />
      <Sidebar
        loading={loading}
        items={navItems}
        workspaces={workspaces}
        activeWorkspaceId={activeWorkspaceId ?? undefined}
        activeItemId={activeThreadId}
        onItemClick={onItemClick}
        onDeleteItem={onDeleteItem}
        onRenameItem={onRenameItem}
        onCreateThread={onCreateThread}
        onCreateFolder={onCreateFolder}
        onMoveItem={onMoveItem}
        onBulkDelete={onBulkDelete}
        onBulkMove={onBulkMove}
        onBulkDeleteWorkspaces={onBulkDeleteWorkspaces}
        editingItemId={editingItemId}
        onEditingComplete={clearEditingItemId}
        editingWorkspaceId={editingWorkspaceId}
        onWorkspaceEditingComplete={clearEditingWorkspaceId}
        onWorkspaceSelect={onWorkspaceSelect}
        onCreateWorkspace={onCreateWorkspace}
        onRenameWorkspace={onRenameWorkspace}
        onDeleteWorkspace={onDeleteWorkspace}
        onMoveWorkspace={onMoveWorkspace}
        onOpenWorkspaceSettings={setWorkspaceSettingsId}
        invitations={invitations}
        onAcceptInvitation={onAcceptInvitation}
        onDeclineInvitation={onDeclineInvitation}
        footer={<UserMenu onSettingsClick={() => setSettingsOpen(true)} />}
      />
      <main className="relative z-10 flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--app-bg)] shadow-[var(--shadow-modal)]">
        <SheetChrome
          workspaceName={workspaces.find((workspace) => workspace.id === activeWorkspaceId)?.name}
          threadName={activeThreadName ?? undefined}
        />
        <div className="relative min-h-0 flex-1">
          {children}
          {!loading && !activeThreadId && (
            <EmptyCanvas
              hasWorkspace={activeWorkspaceId !== null}
              onCreateThread={onCreateThread}
              onCreateWorkspace={onCreateWorkspace}
            />
          )}
          {loading && <CanvasSkeleton />}
        </div>
      </main>
      <Toolbar
        threadId={activeThreadId ?? undefined}
        threadName={activeThreadName ?? undefined}
        groups={groups}
        pendingGroups={pendingGroups}
        activeTool={activeTool}
        onToolClick={handleToolClick}
      />
      {settingsOpen && (
        <Settings
          onClose={() => setSettingsOpen(false)}
          preferences={preferences}
          updatePreference={updatePreference}
        />
      )}
      <Tour
        items={navItems}
        workspaceId={activeWorkspaceId}
        workspaceCount={workspaces.length}
        threadId={activeThreadId ?? null}
        onCreateExample={(name) => onCreateThread(undefined, name)}
        onDeleteExample={onDeleteItem}
      />
      {workspaceSettingsTarget && (
        <WorkspaceSettings
          workspaceId={workspaceSettingsTarget.id}
          workspaceName={workspaceSettingsTarget.name}
          onRename={onRenameWorkspace}
          onWorkspacesChanged={reloadWorkspaces}
          onClose={() => setWorkspaceSettingsId(null)}
        />
      )}
    </div>
  );
};

export default WorkspaceLayout;
