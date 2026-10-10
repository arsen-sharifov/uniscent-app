import type { LucideIcon } from 'lucide-react';
import type { KeyboardEvent, MouseEvent, RefObject } from 'react';

import type { TCanvasExportFormat, TTourAnchor, TTranslations } from '@interfaces';

export type TToolKind = 'mode' | 'action';

export type TToolTone = 'success' | 'error' | 'decision';

export interface IToolItem {
  id: string;
  icon: LucideIcon;
  label?: string;
  description?: string;
  shortcut?: string;
  kind?: TToolKind;
  tone?: TToolTone;
  disabled?: boolean;
}

export interface IToolToneColors {
  ink: string;
  fill: string;
}

export interface IToolHoverState {
  tool: IToolItem;
  top: number;
}

export interface IToolGroup {
  id: string;
  label?: string;
  tools: IToolItem[];
}

export interface IToolbarModel {
  groups: IToolGroup[];
  pendingGroups: IToolGroup[];
  activeTool: string;
  handleToolClick: (id: string) => void;
}

export interface IToolAvailability {
  canUndo: boolean;
  canRedo: boolean;
  canEditCanvas: boolean;
}

export type TCanvasToolsTranslations = TTranslations['platform']['canvas']['tools'];

export type TMenuOpener = 'pointer' | 'keyboard';

interface IToolbarMenuModel {
  open: boolean;
  menuId: string;
  rootRef: RefObject<HTMLDivElement | null>;
  buttonRef: RefObject<HTMLButtonElement | null>;
  menuRef: RefObject<HTMLDivElement | null>;
  toggle: (event: MouseEvent<HTMLButtonElement>) => void;
  handleKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
}

export interface IToolbarMenu extends IToolbarMenuModel {
  close: (restoreFocus: boolean) => void;
}

export interface IExportMenuModel extends IToolbarMenuModel {
  disabled: boolean;
  loading: boolean;
  hint: string | null;
  exportFormat: (format: TCanvasExportFormat) => void;
}

export type THelpMenuAction = 'shortcuts' | 'guides';

export type THelpMenuLabelKey = 'menuShortcuts' | 'menuGuides';

export interface IHelpMenuItem {
  id: THelpMenuAction;
  icon: LucideIcon;
  labelKey: THelpMenuLabelKey;
  tour?: TTourAnchor;
}
