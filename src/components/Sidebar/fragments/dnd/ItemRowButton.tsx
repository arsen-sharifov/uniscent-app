'use client';

import { clsx } from 'clsx';
import type { ButtonHTMLAttributes } from 'react';

interface IItemRowButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  isActive: boolean;
  isSelected: boolean;
}

export const ItemRowButton = ({ isActive, isSelected, className, ...rest }: IItemRowButtonProps) => (
  <button
    type="button"
    onDoubleClick={(event) => event.preventDefault()}
    {...rest}
    className={clsx(
      'flex min-w-0 flex-1 items-center gap-2 rounded-lg font-grotesk text-sm leading-5 transition-colors duration-150 group-has-[[data-dnd-grip]:active]/item:bg-[color:var(--accent-soft)] group-has-[[data-dnd-grip]:active]/item:text-[color:var(--text-strong)] focus-visible:ring-2 focus-visible:ring-[color:var(--ring-focus)] focus-visible:outline-none focus-visible:ring-inset active:bg-[color:var(--accent-soft)] active:text-[color:var(--text-strong)] motion-reduce:transition-none',
      isActive
        ? 'bg-[color:var(--accent-soft)] font-medium text-[color:var(--accent-text)] shadow-[0_6px_18px_-10px_var(--accent-glow)]'
        : 'text-[color:var(--text)] group-hover/item:bg-[color:var(--surface-overlay)] group-hover/item:text-[color:var(--text-strong)]',
      isSelected && !isActive && '!bg-[color:var(--accent-soft)] !text-[color:var(--text-strong)]',
      isSelected && 'ring-1 ring-[color:var(--border-active)] ring-inset',
      className,
    )}
  />
);
