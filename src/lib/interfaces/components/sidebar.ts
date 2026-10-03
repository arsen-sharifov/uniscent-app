import type { KeyboardEvent, RefObject } from 'react';

export type TNavItemType = 'folder' | 'thread';

export type TWorkspaceDropZone = 'before' | 'after';

export type TSingleDeleteTitleKey = 'deleteWorkspaceTitle' | 'deleteFolderTitle' | 'deleteThreadTitle';

export type TItemActionTone = 'accent' | 'neutral' | 'danger';

export type TItemRowSize = 'regular' | 'compact';

export interface IItemRowInsets {
  row: string;
  grip: string;
}

export interface IRenamableItem {
  id: string;
  name: string;
}

export interface IThreadItem {
  type: 'thread';
  id: string;
  name: string;
  resolved?: boolean;
}

export interface IFolderItem {
  type: 'folder';
  id: string;
  name: string;
  items: TNavItem[];
}

export type TNavItem = IThreadItem | IFolderItem;

export interface IWorkspaceItem {
  id: string;
  name: string;
  canManageWorkspace: boolean;
}

export type TDropZone = 'before' | 'inside' | 'after';

export interface IFlattenedItem {
  id: string;
  name: string;
  type: TNavItemType;
  parentId: string | null;
  depth: number;
  index: number;
  collapsed: boolean;
  childCount: number;
  resolved?: boolean;
}

export interface IProjection {
  depth: number;
  parentId: string | null;
  zone: TDropZone;
}

export interface IUseDndTreeOptions {
  items: TNavItem[];
  onMoveItem?: (id: string, parentId: string | null, position: number) => void;
  onBulkMove?: (ids: Set<string>, parentId: string | null, position: number) => void;
  editingId?: string | null;
  selectedIds?: Set<string>;
}

export interface IUseDragSelectOptions {
  containerRef: RefObject<HTMLElement | null>;
  onSelectionChange: (ids: Set<string>) => void;
  enabled?: boolean;
}

export interface IUseInlineEditOptions {
  items: IRenamableItem[];
  autoEditId?: string | null;
  onAutoEditHandled?: () => void;
  onRename?: (id: string, name: string) => void;
  findItem?: (id: string) => IRenamableItem | null | undefined;
}

export interface IInlineEdit {
  editingId: string | null;
  editValue: string;
  setEditValue: (value: string) => void;
  inputRef: (element: HTMLInputElement | null) => void;
  startEditing: (id: string, name: string) => void;
  commitRename: () => void;
  cancelEditing: () => void;
  handleKeyDown: (event: KeyboardEvent) => void;
}

export type TDeleteTarget =
  | {
      mode: 'single';
      id: string;
      name: string;
      type: 'workspace' | TNavItemType;
    }
  | {
      mode: 'bulk';
      scope: 'workspace' | 'navItem';
      ids: Set<string>;
    }
  | null;
