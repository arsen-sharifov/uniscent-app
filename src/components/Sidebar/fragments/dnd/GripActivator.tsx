'use client';

import type { DraggableAttributes, DraggableSyntheticListeners } from '@dnd-kit/core';
import { clsx } from 'clsx';
import { GripVertical } from 'lucide-react';
import type { MouseEvent } from 'react';

interface IGripActivatorProps {
  setActivatorRef: (element: HTMLElement | null) => void;
  attributes: DraggableAttributes;
  listeners: DraggableSyntheticListeners;
  isActive: boolean;
  ariaLabel: string;
  onClick: (event: MouseEvent) => void;
  className: string;
}

export const GripActivator = ({
  setActivatorRef,
  attributes,
  listeners,
  isActive,
  ariaLabel,
  onClick,
  className,
}: IGripActivatorProps) => (
  <button
    ref={setActivatorRef}
    type="button"
    {...attributes}
    {...listeners}
    aria-label={ariaLabel}
    tabIndex={-1}
    data-dnd-grip
    onClick={onClick}
    className={clsx(
      'pointer-events-none absolute top-1/2 flex h-4 w-4 -translate-y-1/2 cursor-grab touch-none items-center justify-center rounded-lg opacity-0 transition-opacity duration-150 select-none active:cursor-grabbing motion-reduce:transition-none',
      'group-hover/item:pointer-events-auto group-hover/item:opacity-100',
      'focus-visible:pointer-events-auto focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-[color:var(--ring-focus)] focus-visible:outline-none',
      className,
      isActive
        ? 'text-[color:var(--accent-text)]'
        : 'text-[color:var(--text-muted)] hover:text-[color:var(--text-strong)] active:text-[color:var(--accent-text)]',
    )}
  >
    <GripVertical className="h-3 w-3" strokeWidth={2.5} />
  </button>
);
