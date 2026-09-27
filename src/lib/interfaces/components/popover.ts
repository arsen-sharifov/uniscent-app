import type { RefCallback } from 'react';

export type TPopoverPlacement = 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end';

export interface IPopoverTrigger {
  ref: RefCallback<HTMLButtonElement>;
  onClick: () => void;
  'aria-expanded': boolean;
  'aria-haspopup': 'dialog';
}
