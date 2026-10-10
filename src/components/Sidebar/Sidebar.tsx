'use client';

import { Files, FolderPlus, LayoutGrid, Plus, Sparkles } from 'lucide-react';
import { useMemo, useState, type MouseEvent, type ReactNode } from 'react';

import type { TDeleteTarget, TNavItem, TNavItemType, IWorkspaceItem, IMyInvitation } from '@interfaces';
import { useEscapeKey } from '@hooks';
import { Logo } from '@/components/Branding';
import { ConfirmDialog } from '@/components/Modal';
import { useTranslations } from '@/i18n';
import { usePermissionsStore } from '@/lib/stores';

import { SINGLE_DELETE_TITLE_KEYS } from './consts';
import {
  BulkActionsBar,
  EmptyState,
  MoveDialog,
  NavItems,
  SearchEmptyState,
  SearchInput,
  SidebarSkeleton,
  StructureActionButton,
  WorkspaceSwitcher,
} from './fragments';
import { useInlineEdit, useSelection } from './hooks';
import { collectIds, filterTree, getSiblings } from './utils';

export interface ISidebarProps {
  items?: TNavItem[];
  workspaces?: IWorkspaceItem[];
  activeWorkspaceId?: string;
  activeItemId?: string;
  onItemClick?: (id: string) => void;
  onDeleteItem?: (id: string) => void;
  onCreateThread?: (folderId?: string) => void;
  onRenameItem?: (id: string, name: string) => void;
  onCreateFolder?: () => void;
  editingItemId?: string | null;
  onEditingComplete?: () => void;
  editingWorkspaceId?: string | null;
  onWorkspaceEditingComplete?: () => void;
  onWorkspaceSelect?: (id: string) => void;
  onCreateWorkspace?: () => void;
  onRenameWorkspace?: (id: string, name: string) => void;
  onDeleteWorkspace?: (id: string) => void;
  onMoveWorkspace?: (id: string, position: number) => void;
  onOpenWorkspaceSettings?: (id: string) => void;
  invitations?: IMyInvitation[];
  onAcceptInvitation?: (invitation: IMyInvitation) => void;
  onDeclineInvitation?: (invitation: IMyInvitation) => void;
  onMoveItem?: (id: string, parentId: string | null, position: number) => void;
  onBulkDelete?: (ids: Set<string>) => void;
  onBulkMove?: (ids: Set<string>, parentId: string | null, position: number) => void;
  onBulkDeleteWorkspaces?: (ids: Set<string>) => void;
  loading?: boolean;
  footer?: ReactNode;
}

export const Sidebar = ({
  items = [],
  workspaces = [],
  loading = false,
  activeWorkspaceId,
  activeItemId,
  onItemClick,
  onDeleteItem,
  onCreateThread,
  onRenameItem,
  onCreateFolder,
  editingItemId,
  onEditingComplete,
  editingWorkspaceId,
  onWorkspaceEditingComplete,
  onWorkspaceSelect,
  onCreateWorkspace,
  onRenameWorkspace,
  onDeleteWorkspace,
  onMoveWorkspace,
  onOpenWorkspaceSettings,
  invitations = [],
  onAcceptInvitation,
  onDeclineInvitation,
  onMoveItem,
  onBulkDelete,
  onBulkMove,
  onBulkDeleteWorkspaces,
  footer,
}: ISidebarProps) => {
  const t = useTranslations();
  const canManageStructure = usePermissionsStore((state) => state.canManageStructure);

  const selectableItemIds = useMemo(() => new Set(collectIds(items)), [items]);
  const allWorkspaceIds = useMemo(() => new Set(workspaces.map((workspace) => workspace.id)), [workspaces]);

  const { selectedIds, setSelectedIds, selectOnClick, clearSelection, selectionCount } =
    useSelection(selectableItemIds);
  const {
    selectedIds: workspaceSelectedIds,
    selectOnClick: selectWorkspaceOnClick,
    clearSelection: clearWorkspaceSelection,
  } = useSelection(allWorkspaceIds);

  const handleWorkspaceClick = (id: string, event: MouseEvent) =>
    selectWorkspaceOnClick(id, event, workspaces, onWorkspaceSelect);

  const workspaceEdit = useInlineEdit({
    items: workspaces,
    autoEditId: editingWorkspaceId,
    onAutoEditHandled: onWorkspaceEditingComplete,
    onRename: onRenameWorkspace,
  });

  const [deleteTarget, setDeleteTarget] = useState<TDeleteTarget>(null);
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [query, setQuery] = useState('');

  const filteredItems = useMemo(() => filterTree(items, query.trim()), [items, query]);

  const handleWorkspaceBulkDelete = () =>
    setDeleteTarget({ mode: 'bulk', scope: 'workspace', ids: workspaceSelectedIds });

  const confirmDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.mode === 'bulk') {
      if (deleteTarget.scope === 'workspace') {
        onBulkDeleteWorkspaces?.(deleteTarget.ids);
        clearWorkspaceSelection();
      } else {
        onBulkDelete?.(deleteTarget.ids);
        clearSelection();
      }
    } else if (deleteTarget.type === 'workspace') {
      onDeleteWorkspace?.(deleteTarget.id);
    } else {
      onDeleteItem?.(deleteTarget.id);
    }
    setDeleteTarget(null);
  };

  const getDeleteTitle = () => {
    if (!deleteTarget) return '';
    if (deleteTarget.mode === 'bulk') return t.platform.sidebar.bulkDeleteTitle;

    return t.platform.sidebar[SINGLE_DELETE_TITLE_KEYS[deleteTarget.type]];
  };

  const renderDeleteMessage = () => {
    if (!deleteTarget) return null;
    if (deleteTarget.mode === 'bulk') return t.platform.sidebar.bulkDeleteConfirm;

    return (
      <>
        {t.platform.sidebar.deleteConfirmPrefix} &quot;<bdi>{deleteTarget.name}</bdi>&quot;
        {t.platform.sidebar.deleteConfirmSuffix}
      </>
    );
  };

  const handleBulkDelete = () => setDeleteTarget({ mode: 'bulk', scope: 'navItem', ids: selectedIds });

  const handleRequestDelete = (id: string, name: string, type: 'workspace' | TNavItemType) =>
    setDeleteTarget({ mode: 'single', id, name, type });

  const handleBulkMoveConfirm = (targetParentId: string | null) => {
    const position = getSiblings(items, targetParentId).filter((sibling) => !selectedIds.has(sibling.id)).length;
    onBulkMove?.(selectedIds, targetParentId, position);
    clearSelection();
    setShowMoveDialog(false);
  };

  useEscapeKey(clearSelection, selectionCount > 0 && deleteTarget === null && !showMoveDialog);

  const isSearching = query.trim().length > 0;
  const showSearchEmpty = isSearching && filteredItems.length === 0;
  const showStructureEmpty = !isSearching && activeWorkspaceId && items.length === 0;

  return (
    <>
      <aside className="app-glass relative z-40 flex h-full w-64 shrink-0 flex-col rounded-2xl border border-[color:var(--border)] transition-[background-color,border-color] duration-200 ease-out select-none motion-reduce:transition-none">
        <div className="border-b border-[color:var(--border)] px-4 py-3">
          <Logo className="text-base text-[color:var(--text-strong)]" />
        </div>

        {loading && <SidebarSkeleton />}

        <div className="px-2 pt-2" hidden={loading}>
          <WorkspaceSwitcher
            workspaces={workspaces}
            activeWorkspaceId={activeWorkspaceId}
            selectedIds={workspaceSelectedIds}
            edit={workspaceEdit}
            onWorkspaceClick={handleWorkspaceClick}
            onCreateWorkspace={onCreateWorkspace}
            onRequestDelete={(id, name) => handleRequestDelete(id, name, 'workspace')}
            onRequestSettings={(id) => onOpenWorkspaceSettings?.(id)}
            onMoveWorkspace={onMoveWorkspace}
            onBulkDelete={handleWorkspaceBulkDelete}
            onClearSelection={clearWorkspaceSelection}
            invitations={invitations}
            onAcceptInvitation={onAcceptInvitation}
            onDeclineInvitation={onDeclineInvitation}
          />
        </div>

        {!loading && activeWorkspaceId && items.length > 0 && (
          <div data-tour="sidebarSearch" className="px-2 pt-2">
            <SearchInput value={query} onChange={setQuery} />
          </div>
        )}

        {!loading && activeWorkspaceId && (
          <div
            data-sidebar-scroll
            data-tour="sidebarTree"
            className="relative flex flex-1 [scrollbar-width:none] flex-col overflow-x-hidden overflow-y-auto scroll-smooth px-2 pt-3 pb-2 [&::-webkit-scrollbar]:hidden"
          >
            <div className="mb-1 flex items-center justify-between px-2">
              <div className="flex items-center gap-1.5 font-mono-ui text-[10px] font-bold tracking-[0.14em] text-[color:var(--text-label)] uppercase">
                <span>{t.platform.sidebar.structure}</span>
                {items.length > 0 && <span className="tabular-nums">{items.length}</span>}
              </div>
              {canManageStructure && (
                <div className="flex items-center gap-0.5">
                  <StructureActionButton
                    icon={FolderPlus}
                    title={t.platform.sidebar.newFolder}
                    tour="sidebarCreateFolder"
                    onClick={() => onCreateFolder?.()}
                  />
                  <StructureActionButton
                    icon={Plus}
                    title={t.platform.sidebar.newThread}
                    tour="sidebarCreateThread"
                    onClick={() => onCreateThread?.()}
                  />
                </div>
              )}
            </div>

            {!showStructureEmpty && !showSearchEmpty && (
              <NavItems
                items={filteredItems}
                activeItemId={activeItemId}
                selectedIds={selectedIds}
                onSelectClick={selectOnClick}
                setSelectedIds={setSelectedIds}
                onItemClick={onItemClick}
                onRequestDelete={handleRequestDelete}
                onCreateThread={onCreateThread}
                onRenameItem={onRenameItem}
                onMoveItem={isSearching ? undefined : onMoveItem}
                onBulkMove={isSearching ? undefined : onBulkMove}
                autoEditId={editingItemId}
                onAutoEditHandled={onEditingComplete}
              />
            )}

            {showSearchEmpty && <SearchEmptyState query={query} />}

            {showStructureEmpty && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-2">
                <div className="pointer-events-auto">
                  <EmptyState
                    icon={Sparkles}
                    title={t.platform.sidebar.emptyStructureTitle}
                    hint={t.platform.sidebar.emptyStructureHint}
                    ctaIcon={Plus}
                    ctaLabel={t.platform.sidebar.newThread}
                    ctaTour="sidebarNewThreadCta"
                    onCta={canManageStructure ? () => onCreateThread?.() : undefined}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {!loading && !activeWorkspaceId && (
          <div className="flex flex-1 items-center justify-center px-2">
            <EmptyState
              icon={LayoutGrid}
              title={
                workspaces.length === 0 ? t.platform.sidebar.newWorkspaceTitle : t.platform.sidebar.noWorkspaceTitle
              }
              hint={
                workspaces.length === 0 ? t.platform.sidebar.newWorkspaceHint : t.platform.sidebar.noWorkspaceHintCta
              }
              ctaIcon={Plus}
              ctaLabel={t.platform.sidebar.newWorkspace}
              ctaTour="sidebarNewWorkspace"
              onCta={onCreateWorkspace}
            />
          </div>
        )}

        {selectionCount > 0 && (
          <div className="border-t border-[color:var(--border)] px-2 pt-2 pb-2">
            <BulkActionsBar
              count={selectionCount}
              icon={Files}
              label={t('platform.sidebar.itemsSelected', { count: selectionCount })}
              onDelete={handleBulkDelete}
              onMove={() => setShowMoveDialog(true)}
              onClear={clearSelection}
              lockedHint={canManageStructure ? undefined : t.platform.sidebar.structureLocked}
            />
          </div>
        )}

        {footer && <footer className="border-t border-[color:var(--border)] px-2 py-2">{footer}</footer>}
      </aside>

      <ConfirmDialog
        open={deleteTarget !== null}
        title={getDeleteTitle()}
        message={renderDeleteMessage()}
        confirmLabel={t.platform.sidebar.delete}
        cancelLabel={t.platform.sidebar.cancel}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <MoveDialog
        open={showMoveDialog}
        items={items}
        selectedIds={selectedIds}
        onMove={handleBulkMoveConfirm}
        onCancel={() => setShowMoveDialog(false)}
      />
    </>
  );
};
