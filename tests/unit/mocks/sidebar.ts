import { vi } from 'vitest';

import type { IFolder, IInlineEdit, IMyInvitation, IThread, IWorkspaceItem, TNavItem } from '@interfaces';

export const SELECTION_ITEMS = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }, { id: 'e' }];

export const RENAME_ITEMS = [
  { id: '1', name: 'Alpha' },
  { id: '2', name: 'Beta' },
];

export const threadItem = (id: string, resolved = false): TNavItem => ({
  type: 'thread',
  id,
  name: `Thread ${id}`,
  resolved,
});

export const folderItem = (id: string, items: TNavItem[] = []): TNavItem => ({
  type: 'folder',
  id,
  name: `Folder ${id}`,
  items,
});

export const folderInput = (id: string, position: number, parentFolderId: string | null = null): IFolder => ({
  id,
  workspaceId: 'ws-1',
  parentFolderId,
  name: `Folder ${id}`,
  position,
});

export const threadInput = (
  id: string,
  position: number,
  folderId: string | null = null,
  resolved = false,
): IThread => ({
  id,
  workspaceId: 'ws-1',
  folderId,
  name: `Thread ${id}`,
  position,
  resolved,
});

export const workspaceItem = (id: string, canManageWorkspace = true): IWorkspaceItem => ({
  id,
  name: `Workspace ${id}`,
  canManageWorkspace,
});

export const myInvitation = (id: string, workspaceId: string): IMyInvitation => ({
  id,
  workspaceId,
  workspaceName: `Workspace ${workspaceId}`,
  roleKey: 'member',
  roleName: 'Member',
  invitedByName: 'Owner',
  createdAt: '2026-01-01T00:00:00Z',
});

export const inlineEdit = (overrides: Partial<IInlineEdit> = {}): IInlineEdit => ({
  editingId: null,
  editValue: '',
  setEditValue: vi.fn(),
  inputRef: vi.fn(),
  startEditing: vi.fn(),
  commitRename: vi.fn(),
  cancelEditing: vi.fn(),
  handleKeyDown: vi.fn(),
  ...overrides,
});
