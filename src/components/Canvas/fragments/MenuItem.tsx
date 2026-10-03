'use client';

import { clsx } from 'clsx';
import type { LucideIcon } from 'lucide-react';

import type { TMenuItemAccent } from '@interfaces';

interface IMenuItemProps {
  icon: LucideIcon;
  label: string;
  shortcut?: string;
  onClick: () => void;
  accent?: TMenuItemAccent;
  disabled?: boolean;
  hint?: string;
}

export const MenuItem = ({
  icon: Icon,
  label,
  shortcut,
  onClick,
  accent = 'neutral',
  disabled = false,
  hint,
}: IMenuItemProps) => (
  <button
    type="button"
    role="menuitem"
    tabIndex={-1}
    aria-disabled={disabled}
    title={disabled ? hint : undefined}
    onClick={disabled ? undefined : onClick}
    className={clsx(
      'flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-[12px] tracking-tight transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ring-focus)] focus-visible:outline-none focus-visible:ring-inset motion-reduce:transition-none',
      disabled && 'cursor-not-allowed text-[color:var(--text-subtle)]',
      !disabled &&
        accent === 'emerald' &&
        'text-[color:var(--status-success)] hover:bg-[color:var(--status-success-bg)] focus-visible:bg-[color:var(--status-success-bg)]',
      !disabled &&
        accent === 'red' &&
        'text-[color:var(--status-error)] hover:bg-[color:var(--status-error-bg)] hover:text-[color:var(--status-error)] focus-visible:bg-[color:var(--status-error-bg)]',
      !disabled &&
        accent === 'cyan' &&
        'text-[color:var(--ref)] hover:bg-[color:var(--ref-bg)] focus-visible:bg-[color:var(--ref-bg)]',
      !disabled &&
        accent === 'neutral' &&
        'text-[color:var(--text)] hover:bg-[color:var(--accent-soft)] focus-visible:bg-[color:var(--accent-soft)]',
    )}
  >
    <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center">
      <Icon className="h-3 w-3" strokeWidth={2.25} />
    </span>

    <span className="flex min-w-0 flex-1 flex-col">
      <span className="truncate">{label}</span>
      {disabled && hint && (
        <span className="font-mono-ui text-[9px] leading-tight font-normal tracking-[0.04em] text-wrap text-[color:var(--text-label)]">
          {hint}
        </span>
      )}
    </span>

    {shortcut && !disabled && (
      <span className="inline-flex h-4 min-w-4 shrink-0 items-center justify-center rounded-md border border-[color:var(--border)] bg-[color:var(--surface-overlay)] px-1 font-mono-ui text-[9px] tracking-[0.08em] text-[color:var(--text-label)]">
        {shortcut}
      </span>
    )}
  </button>
);
