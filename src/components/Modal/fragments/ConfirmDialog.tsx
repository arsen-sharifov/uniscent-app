'use client';

import { type ReactNode, useId } from 'react';

import { Modal } from '../Modal';

interface IConfirmDialogProps {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog = ({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: IConfirmDialogProps) => {
  const id = useId();
  const titleId = `${id}-title`;
  const messageId = `${id}-message`;

  return (
    <Modal
      open={open}
      onClose={onCancel}
      width="max-w-sm"
      role="alertdialog"
      labelledBy={titleId}
      describedBy={messageId}
    >
      <div className="p-6">
        <h3 id={titleId} className="font-grotesk text-lg font-semibold text-[color:var(--text-strong)]">
          {title}
        </h3>
        <p id={messageId} className="mt-2 font-grotesk text-sm text-[color:var(--text-muted)]">
          {message}
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            autoFocus
            onClick={onCancel}
            className="cursor-pointer rounded-lg border border-[color:var(--border-strong)] px-4 py-1.5 font-grotesk text-sm font-medium text-[color:var(--text-muted)] transition-colors duration-200 ease-out hover:bg-[color:var(--surface-overlay)] hover:text-[color:var(--text-strong)] focus-visible:ring-2 focus-visible:ring-[color:var(--ring-focus)] focus-visible:outline-none active:bg-[color:var(--border)] motion-reduce:transition-none"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="cursor-pointer rounded-lg bg-[color:var(--status-error)] px-4 py-1.5 font-grotesk text-sm font-medium text-[color:var(--on-status)] transition-opacity duration-200 ease-out hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[color:var(--ring-focus)] focus-visible:outline-none active:opacity-80 motion-reduce:transition-none"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
};
