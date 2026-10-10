'use client';

import { clsx } from 'clsx';
import { type ReactNode, useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
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
  const triggerId = useId();

  const mounted = useMounted();

  const place = useCallback(() => {
    const panelElement = panelRef.current;
    if (!triggerElement || !panelElement) return;
    const rect = triggerElement.getBoundingClientRect();
    const panelWidth = panelElement.offsetWidth || rect.width;

    panelElement.style.position = 'fixed';
    panelElement.style.zIndex = '50';
    panelElement.style.minWidth = `${rect.width}px`;

    if (placement.startsWith('bottom')) {
      panelElement.style.top = `${rect.bottom + offset}px`;
      panelElement.style.bottom = '';
    } else {
      panelElement.style.bottom = `${window.innerHeight - rect.top + offset}px`;
      panelElement.style.top = '';
    }
    if (placement.endsWith('start')) {
      panelElement.style.left = `${rect.left}px`;
    } else {
      panelElement.style.left = `${Math.max(8, rect.right - panelWidth)}px`;
    }
  }, [triggerElement, placement, offset]);

  useLayoutEffect(() => {
    if (!open) return;
    place();
  }, [open, place]);

  const dismiss = useCallback(() => onOpenChange(false), [onOpenChange]);

  const dismissToTrigger = useCallback(() => {
    onOpenChange(false);
    triggerElement?.focus();
  }, [onOpenChange, triggerElement]);

  useEffect(() => {
    if (!open) return;
    const handleDocumentMouseDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target)) return;
      if (triggerElement?.contains(target)) return;
      onOpenChange(false);
    };
    document.addEventListener('mousedown', handleDocumentMouseDown);

    return () => document.removeEventListener('mousedown', handleDocumentMouseDown);
  }, [open, onOpenChange, triggerElement]);

  useEscapeKey(dismissToTrigger, open);
  useViewportChange({ onScroll: place, onResize: dismiss, enabled: open, capture: true });

  useEffect(() => {
    const panel = panelRef.current;
    if (!open || !panel || panel.contains(document.activeElement)) return;

    panel.focus();
  }, [open]);

  return (
    <>
      {renderTrigger({
        ref: setTriggerElement,
        id: triggerId,
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
            aria-labelledby={triggerId}
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
