import type { TWindowWithStack } from '@interfaces';
import { MODAL_SCROLL_LOCK_KEY } from '@constants';

export const adjustScrollLock = (delta: 1 | -1): void => {
  if (typeof window === 'undefined') return;

  const current = (window as TWindowWithStack)[MODAL_SCROLL_LOCK_KEY] ?? 0;
  const next = Math.max(0, current + delta);

  (window as TWindowWithStack)[MODAL_SCROLL_LOCK_KEY] = next;
  document.body.style.overflow = next > 0 ? 'hidden' : '';
};
