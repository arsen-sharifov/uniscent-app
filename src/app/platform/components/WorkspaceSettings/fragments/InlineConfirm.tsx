'use client';

interface IInlineConfirmProps {
  prompt?: string;
  cancelLabel: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export const InlineConfirm = ({ prompt, cancelLabel, confirmLabel, onCancel, onConfirm }: IInlineConfirmProps) => (
  <div className="flex shrink-0 items-center gap-2">
    {prompt && <span className="font-grotesk text-xs text-[color:var(--text-muted)]">{prompt}</span>}
    <button
      type="button"
      onClick={onCancel}
      className="cursor-pointer rounded-lg border border-[color:var(--border-strong)] px-2.5 py-1 font-grotesk text-xs font-medium text-[color:var(--text-muted)] transition-[color,background-color,scale] duration-150 hover:bg-[color:var(--surface-overlay)] hover:text-[color:var(--text-strong)] focus-visible:ring-2 focus-visible:ring-[color:var(--ring-focus)] focus-visible:outline-none active:scale-95 motion-reduce:transition-none"
    >
      {cancelLabel}
    </button>
    <button
      type="button"
      onClick={onConfirm}
      className="cursor-pointer rounded-lg bg-[color:var(--status-error)] px-2.5 py-1 font-grotesk text-xs font-medium text-[color:var(--on-status)] transition-[opacity,scale] duration-150 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[color:var(--ring-focus)] focus-visible:outline-none active:scale-95 motion-reduce:transition-none"
    >
      {confirmLabel}
    </button>
  </div>
);
