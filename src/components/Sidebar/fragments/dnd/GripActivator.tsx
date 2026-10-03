'use client';

import type { DraggableAttributes, DraggableSyntheticListeners } from '@dnd-kit/core';
import { clsx } from 'clsx';
import { GripVertical } from 'lucide-react';
import type { MouseEvent } from 'react';

import type { TItemRowSize } from '@interfaces';

import { ITEM_ROW_INSETS } from '../../consts';

interface IGripActivatorProps {
  setActivatorRef: (element: HTMLElement | null) => void;
  attributes: DraggableAttributes;
  listeners: DraggableSyntheticListeners;
  isActive: boolean;
  ariaLabel: string;
  size: TItemRowSize;
  onClick: (event: MouseEvent) => void;
}

export const GripActivator = ({
  setActivatorRef,
  attributes,
  listeners,
  isActive,
  ariaLabel,
  size,
  onClick,
}: IGripActivatorProps) => (
  <button
    ref={setActivatorRef}
    type="button"
    {...attributes}
    {...listeners}
    aria-label={ariaLabel}
    tabIndex={-1}
    data-dnd-grip
    onClick={(event) => {
      if (event.detail === 0) return;

      onClick(event);
    }}
    className={clsx(
      'pointer-events-none absolute top-1/2 flex h-4 w-4 -translate-y-1/2 cursor-grab touch-none items-center justify-center rounded-lg opacity-0 transition-opacity duration-150 select-none active:cursor-grabbing motion-reduce:transition-none',
      'group-hover/item:pointer-events-auto group-hover/item:opacity-100',
      'focus-visible:pointer-events-auto focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-[color:var(--ring-focus)] focus-visible:outline-none',
      ITEM_ROW_INSETS[size].grip,
      isActive
        ? 'text-[color:var(--accent-text)]'
        : 'text-[color:var(--text-muted)] hover:text-[color:var(--text-strong)] active:text-[color:var(--accent-text)]',
    )}
  >
    <GripVertical className="h-3 w-3" strokeWidth={2.5} />
  </button>
);
