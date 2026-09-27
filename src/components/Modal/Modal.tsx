'use client';

import { clsx } from 'clsx';
import { X } from 'lucide-react';
import { type ReactNode, type TransitionEvent, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { useFocusTrap } from '@hooks';
import { useTranslations } from '@/i18n';

import { adjustScrollLock } from './utils';

interface IModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  width?: string;
  overflowHidden?: boolean;
  layerClassName?: string;
}

export const Modal = ({
  open,
  onClose,
  children,
  className,
  width = 'max-w-lg',
  overflowHidden,
  layerClassName = 'z-50',
}: IModalProps) => {
  const t = useTranslations();
  const panelRef = useRef<HTMLDialogElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);

  const [showing, setShowing] = useState(open);
  if (open && !showing) {
    setShowing(true);
  }

  useFocusTrap(panelRef, open);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) {
      return;
    }

    previousFocusRef.current = document.activeElement as HTMLElement;
    panelRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseRef.current();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    adjustScrollLock(1);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      adjustScrollLock(-1);
      previousFocusRef.current?.focus();
    };
  }, [open]);

  if (!showing) {
    return null;
  }

  const handleTransitionEnd = (e: TransitionEvent) => {
    if (e.target === e.currentTarget && !open) {
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
      <button
        type="button"
        tabIndex={-1}
        aria-label={t.common.close}
        onClick={onClose}
        className="absolute inset-0 bg-[color:var(--scrim)]"
      />

      <dialog
        open
        ref={panelRef}
        aria-modal="true"
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
