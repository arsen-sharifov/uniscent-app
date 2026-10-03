import { clsx } from 'clsx';
import type { ReactNode } from 'react';

interface IItemActionsToolbarProps {
  isActive: boolean;
  isSelected: boolean;
  children: ReactNode;
}

export const ItemActionsToolbar = ({ isActive, isSelected, children }: IItemActionsToolbarProps) => (
  <div
    className={clsx(
      'pointer-events-none absolute top-1/2 right-1 z-10 flex -translate-y-1/2 items-center gap-0.5 rounded-lg py-0.5 pr-0.5 pl-5 opacity-0 ring-1 backdrop-blur-md transition-opacity duration-200 ease-out motion-reduce:transition-none',
      '[mask-image:linear-gradient(to_right,transparent_0px,black_20px,black_100%)] [-webkit-mask-image:linear-gradient(to_right,transparent_0px,black_20px,black_100%)]',
      'group-focus-within/item:pointer-events-auto group-focus-within/item:opacity-100 group-hover/item:pointer-events-auto group-hover/item:opacity-100',
      isActive || isSelected
        ? 'bg-[color:var(--accent-soft)] ring-[color:var(--border-active)]'
        : 'bg-[color:var(--surface-elevated)]/98 ring-[color:var(--border)]',
    )}
  >
    {children}
  </div>
);
