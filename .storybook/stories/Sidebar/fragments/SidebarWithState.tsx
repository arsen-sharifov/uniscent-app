import { useState } from 'react';

import type { IWorkspaceItem, TNavItem } from '@interfaces';

import {
  type ISidebarProps,
  Sidebar,
  findInTree,
  findOutermostItems,
  insertIntoTree,
  removeFromTree,
  updateNavItemName,
} from '@/components';

const nextId = (prefix: string) => `${prefix}-${crypto.randomUUID().slice(0, 8)}`;

export const SidebarWithState = (args: ISidebarProps) => {
  const [activeItemId, setActiveItemId] = useState(args.activeItemId);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(args.activeWorkspaceId);
  const [items, setItems] = useState<TNavItem[]>(args.items ?? []);
  const [workspaceItems, setWorkspaceItems] = useState<IWorkspaceItem[]>(args.workspaces ?? []);
  const [editingItemId, setEditingItemId] = useState<string | null>(args.editingItemId ?? null);
  const [editingWorkspaceId, setEditingWorkspaceId] = useState<string | null>(args.editingWorkspaceId ?? null);

  const handleItemClick = (id: string) => {
    args.onItemClick?.(id);
    setActiveItemId(id);
  };

  const handleWorkspaceSelect = (id: string) => {
    args.onWorkspaceSelect?.(id);
    setActiveWorkspaceId(id);
    setEditingItemId(null);
  };

  const handleCreateThread = (folderId?: string) => {
    args.onCreateThread?.(folderId);
    const id = nextId('thread');
    const thread: TNavItem = { type: 'thread', id, name: 'New Thread' };
    if (folderId) {
      setItems((previous) => insertIntoTree(previous, thread, folderId, Infinity));
    } else {
      setItems((previous) => [...previous, thread]);
    }
    setEditingItemId(id);
  };

  const handleCreateFolder = () => {
    args.onCreateFolder?.();
    const id = nextId('folder');
    setItems((previous) => [...previous, { type: 'folder', id, name: 'New Folder', items: [] }]);
    setEditingItemId(id);
  };

  const handleRenameItem: NonNullable<ISidebarProps['onRenameItem']> = (id, name) => {
    args.onRenameItem?.(id, name);
    setItems((previous) => updateNavItemName(previous, id, name));
  };

  const handleDeleteItem = (id: string) => {
    args.onDeleteItem?.(id);
    setItems((previous) => removeFromTree(previous, id));
  };

  const handleBulkDelete = (ids: Set<string>) => {
    args.onBulkDelete?.(ids);
    setItems((previous) => [...ids].reduce((accumulator, id) => removeFromTree(accumulator, id), previous));
  };

  const handleBulkDeleteWorkspaces = (ids: Set<string>) => {
    args.onBulkDeleteWorkspaces?.(ids);
    const remaining = workspaceItems.filter((workspace) => !ids.has(workspace.id));
    setWorkspaceItems(remaining);
    if (activeWorkspaceId && ids.has(activeWorkspaceId)) setActiveWorkspaceId(remaining[0]?.id);
  };

  const handleBulkMove = (ids: Set<string>, parentId: string | null, position: number) => {
    args.onBulkMove?.(ids, parentId, position);
    setItems((previous) => {
      const itemsToMove = findOutermostItems(previous, ids);
      const removed = itemsToMove.reduce((accumulator, item) => removeFromTree(accumulator, item.id), previous);

      return itemsToMove.reduce(
        (accumulator, item, index) => insertIntoTree(accumulator, item, parentId, position + index),
        removed,
      );
    });
  };

  const handleMoveItem: NonNullable<ISidebarProps['onMoveItem']> = (id, parentId, position) => {
    args.onMoveItem?.(id, parentId, position);
    setItems((previous) => {
      const item = findInTree(previous, id);
      if (!item) return previous;

      return insertIntoTree(removeFromTree(previous, id), item, parentId, position);
    });
  };

  const handleCreateWorkspace = () => {
    args.onCreateWorkspace?.();
    const id = nextId('ws');
    setWorkspaceItems((previous) => [...previous, { id, name: 'New Workspace', canManageWorkspace: true }]);
    setActiveWorkspaceId(id);
    setEditingWorkspaceId(id);
  };

  const handleRenameWorkspace: NonNullable<ISidebarProps['onRenameWorkspace']> = (id, name) => {
    args.onRenameWorkspace?.(id, name);
    setWorkspaceItems((previous) =>
      previous.map((workspace) => (workspace.id === id ? { ...workspace, name } : workspace)),
    );
  };

  const handleDeleteWorkspace = (id: string) => {
    args.onDeleteWorkspace?.(id);
    const remaining = workspaceItems.filter((workspace) => workspace.id !== id);
    setWorkspaceItems(remaining);
    if (id === activeWorkspaceId) setActiveWorkspaceId(remaining[0]?.id);
  };

  const handleEditingComplete = () => {
    args.onEditingComplete?.();
    setEditingItemId(null);
  };

  const handleWorkspaceEditingComplete = () => {
    args.onWorkspaceEditingComplete?.();
    setEditingWorkspaceId(null);
  };

  return (
    <Sidebar
      {...args}
      items={items}
      workspaces={workspaceItems}
      activeItemId={activeItemId}
      activeWorkspaceId={activeWorkspaceId}
      editingItemId={editingItemId}
      editingWorkspaceId={editingWorkspaceId}
      onItemClick={handleItemClick}
      onWorkspaceSelect={handleWorkspaceSelect}
      onCreateThread={handleCreateThread}
      onCreateFolder={handleCreateFolder}
      onRenameItem={handleRenameItem}
      onDeleteItem={handleDeleteItem}
      onBulkDelete={handleBulkDelete}
      onBulkDeleteWorkspaces={handleBulkDeleteWorkspaces}
      onBulkMove={handleBulkMove}
      onMoveItem={handleMoveItem}
      onCreateWorkspace={handleCreateWorkspace}
      onRenameWorkspace={handleRenameWorkspace}
      onDeleteWorkspace={handleDeleteWorkspace}
      onMoveWorkspace={args.onMoveWorkspace}
      onEditingComplete={handleEditingComplete}
      onWorkspaceEditingComplete={handleWorkspaceEditingComplete}
    />
  );
};
