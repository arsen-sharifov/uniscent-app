'use client';

import { clsx } from 'clsx';
import { X } from 'lucide-react';
import { type ReactNode, type TransitionEvent, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { useEscapeKey, useFocusTrap, useReturnFocus } from '@hooks';
import { useTranslations } from '@/i18n';

import { Scrim } from './fragments/Scrim';
import { adjustScrollLock } from './utils';

interface IModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  width?: string;
  overflowHidden?: boolean;
  layerClassName?: string;
  role?: 'alertdialog';
  labelledBy?: string;
  describedBy?: string;
}

export const Modal = ({
  open,
  onClose,
  children,
  className,
  width = 'max-w-lg',
  overflowHidden,
  layerClassName = 'z-50',
  role,
  labelledBy,
  describedBy,
}: IModalProps) => {
  const t = useTranslations();
  const panelRef = useRef<HTMLDialogElement>(null);

  const [showing, setShowing] = useState(open);
  if (open && !showing) {
    setShowing(true);
  }

  useEscapeKey(onClose, open);
  useFocusTrap(panelRef, open);
  useReturnFocus(open);

  useEffect(() => {
    if (!open) return;

    if (!panelRef.current?.contains(document.activeElement)) panelRef.current?.focus();

    adjustScrollLock(1);

    return () => adjustScrollLock(-1);
  }, [open]);

  if (!showing) return null;

  const handleTransitionEnd = (transitionEvent: TransitionEvent) => {
    if (transitionEvent.target === transitionEvent.currentTarget && !open) {
      setShowing(false);
    }
  };

  return createPortal(
    <div
      onTransitionEnd={handleTransitionEnd}
      className={clsx(
        'fixed inset-0 flex items-center justify-center transition-opacity duration-200 ease-out starting:opacity-0',
        layerClassName,
        open ? 'opacity-100' : 'pointer-events-none opacity-0',
      )}
    >
      <Scrim onClick={onClose} />

      <dialog
        open
        ref={panelRef}
        role={role}
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        tabIndex={-1}
        className={clsx(
          'app-panel relative max-h-[90vh] w-full rounded-2xl border border-[color:var(--border)] text-[color:var(--text)] transition-[opacity,translate,scale] duration-200 ease-out outline-none motion-reduce:transition-none starting:translate-y-2 starting:scale-95 starting:opacity-0',
          open ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-2 scale-95 opacity-0',
          width,
          overflowHidden ? 'overflow-hidden' : 'overflow-y-auto',
          className,
        )}
      >
        {!overflowHidden && (
          <button
            type="button"
            onClick={onClose}
            aria-label={t.common.close}
            className="absolute top-4 right-4 z-10 cursor-pointer rounded-lg p-1.5 text-[color:var(--text-muted)] transition-colors duration-200 ease-out hover:bg-[color:var(--surface-overlay)] hover:text-[color:var(--text-strong)] focus-visible:ring-2 focus-visible:ring-[color:var(--ring-focus)] focus-visible:outline-none active:bg-[color:var(--border)] motion-reduce:transition-none"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        {children}
      </dialog>
    </div>,
    document.body,
  );
};
