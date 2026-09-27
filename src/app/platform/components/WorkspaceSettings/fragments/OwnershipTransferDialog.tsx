'use client';

import { Crown } from 'lucide-react';
import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';

import type { IWorkspaceMember } from '@interfaces';
import { useFocusTrap } from '@hooks';
import { useTranslations } from '@/i18n';

interface IOwnershipTransferDialogProps {
  member: IWorkspaceMember;
  onConfirm: () => void;
  onCancel: () => void;
}

export const OwnershipTransferDialog = ({ member, onConfirm, onCancel }: IOwnershipTransferDialogProps) => {
  const t = useTranslations();
  const { members } = t.platform.workspaceSettings;
  const panelRef = useRef<HTMLDivElement>(null);
  const id = useId();
  const titleId = `${id}-title`;
  const descId = `${id}-desc`;

  useFocusTrap(panelRef, true);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onCancel();
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    panelRef.current?.focus();

    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [onCancel]);

  const displayName = member.name || member.email;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 transition-opacity duration-200 ease-out motion-reduce:transition-none starting:opacity-0">
      <button
        type="button"
        tabIndex={-1}
        aria-label={t.common.close}
        onClick={onCancel}
        className="absolute inset-0 bg-[color:var(--scrim)] backdrop-blur-sm"
      />

      <div
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        tabIndex={-1}
        className="app-panel relative w-full max-w-md rounded-xl border border-[color:var(--border)] p-6 font-grotesk text-[color:var(--text)] transition-all duration-200 ease-out outline-none motion-reduce:transition-none starting:translate-y-2 starting:scale-95 starting:opacity-0"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[color:var(--status-warning-border)] bg-[color:var(--status-warning-bg)] text-[color:var(--status-warning)]">
            <Crown className="h-5 w-5" aria-hidden />
          </span>
          <h3 id={titleId} className="min-w-0 font-grotesk text-base font-semibold text-[color:var(--text-strong)]">
            {members.transferTitle}
          </h3>
        </div>
        <div className="mt-4 rounded-xl border border-[color:var(--status-warning-border)] bg-[color:var(--status-warning-bg)] p-3.5">
          <p className="font-mono-ui text-[10px] font-bold tracking-[0.14em] text-[color:var(--status-warning)] uppercase">
            {members.transferCritical}
          </p>
          <p id={descId} className="mt-1.5 font-grotesk text-sm leading-relaxed text-[color:var(--text-muted)]">
            {members.transferConfirmPrefix} &ldquo;
            <span className="font-medium text-[color:var(--text-strong)]">{displayName}</span>&rdquo;
            {members.transferConfirmSuffix}
          </p>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="cursor-pointer rounded-lg border border-[color:var(--border-strong)] px-4 py-2 font-grotesk text-sm font-medium text-[color:var(--text-muted)] transition-[color,background-color,scale] duration-150 hover:bg-[color:var(--surface-overlay)] hover:text-[color:var(--text-strong)] focus-visible:ring-2 focus-visible:ring-[color:var(--ring-focus)] focus-visible:outline-none active:scale-95 motion-reduce:transition-none"
          >
            {members.cancel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="cursor-pointer rounded-lg bg-[color:var(--status-error)] px-4 py-2 font-grotesk text-sm font-medium text-[color:var(--on-status)] transition-[opacity,scale] duration-150 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[color:var(--ring-focus)] focus-visible:outline-none active:scale-95 motion-reduce:transition-none"
          >
            {members.transferConfirm}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};
