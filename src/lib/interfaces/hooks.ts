export interface IUseMenuKeyboardNavigationOptions {
  itemRole?: 'menuitem' | 'option';
  onOpen?: () => void;
  onClose?: () => void;
}

export interface IUseViewportChangeOptions {
  onScroll?: () => void;
  onResize?: () => void;
  enabled?: boolean;
  capture?: boolean;
}
