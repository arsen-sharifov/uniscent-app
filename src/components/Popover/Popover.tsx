'use client';

import { clsx } from 'clsx';
import { type ReactNode, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import type { IPopoverTrigger, TPopoverPlacement } from '@interfaces';
import { useEscapeKey, useMounted, useViewportChange } from '@hooks';

export interface IPopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  renderTrigger: (trigger: IPopoverTrigger) => ReactNode;
  placement?: TPopoverPlacement;
  offset?: number;
  panelClassName?: string;
  children: ReactNode;
}

export const Popover = ({
  open,
  onOpenChange,
  renderTrigger,
  placement = 'bottom-start',
  offset = 8,
  panelClassName,
  children,
}: IPopoverProps) => {
  const [triggerElement, setTriggerElement] = useState<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDialogElement>(null);

  const mounted = useMounted();

  const place = useCallback(() => {
    const panelEl = panelRef.current;
    if (!triggerElement || !panelEl) return;
    const rect = triggerElement.getBoundingClientRect();
    const panelWidth = panelEl.offsetWidth || rect.width;

    panelEl.style.position = 'fixed';
    panelEl.style.zIndex = '50';
    panelEl.style.minWidth = `${rect.width}px`;

    if (placement.startsWith('bottom')) {
      panelEl.style.top = `${rect.bottom + offset}px`;
      panelEl.style.bottom = '';
    } else {
      panelEl.style.bottom = `${window.innerHeight - rect.top + offset}px`;
      panelEl.style.top = '';
    }
    if (placement.endsWith('start')) {
      panelEl.style.left = `${rect.left}px`;
    } else {
      panelEl.style.left = `${Math.max(8, rect.right - panelWidth)}px`;
    }
  }, [triggerElement, placement, offset]);

  useLayoutEffect(() => {
    if (!open) return;
    place();
  }, [open, place]);

  const dismiss = useCallback(() => onOpenChange(false), [onOpenChange]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target)) return;
      if (triggerElement?.contains(target)) return;
      onOpenChange(false);
    };
    document.addEventListener('mousedown', onDocClick);

    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open, onOpenChange, triggerElement]);

  useEscapeKey(dismiss, open);
  useViewportChange({ onScroll: place, onResize: dismiss, enabled: open, capture: true });

  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();
  }, [open]);

  return (
    <>
      {renderTrigger({
        ref: setTriggerElement,
        onClick: () => onOpenChange(!open),
        'aria-expanded': open,
        'aria-haspopup': 'dialog',
      })}
      {mounted &&
        open &&
        createPortal(
          <dialog
            open
            ref={panelRef}
            aria-modal="false"
            tabIndex={-1}
            className={clsx(
              'inset-auto overflow-hidden rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--text)] shadow-[var(--shadow-modal)] outline-none',
              panelClassName,
            )}
          >
            {children}
          </dialog>,
          document.body,
        )}
    </>
  );
};
