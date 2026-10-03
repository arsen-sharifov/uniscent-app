'use client';

import { clsx } from 'clsx';
import type { LucideIcon } from 'lucide-react';

import { SelectionStrip } from '@/components/SelectionStrip';

import { INDENTATION_WIDTH } from '../../consts';

interface IMoveTargetOptionProps {
  icon: LucideIcon;
  label: string;
  depth: number;
  selected: boolean;
  onSelect: () => void;
}

export const MoveTargetOption = ({ icon: Icon, label, depth, selected, onSelect }: IMoveTargetOptionProps) => (
  <button
    type="button"
    aria-pressed={selected}
    onClick={onSelect}
    style={{ paddingLeft: depth * INDENTATION_WIDTH + 12 }}
    className={clsx(
      'relative flex w-full cursor-pointer items-center gap-2 rounded-lg py-2 pr-3 font-grotesk text-sm transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-[color:var(--ring-focus)] focus-visible:outline-none focus-visible:ring-inset active:bg-[color:var(--accent-soft)] active:text-[color:var(--text-strong)] motion-reduce:transition-none',
      selected
        ? 'bg-[color:var(--accent-soft)] font-medium text-[color:var(--text-strong)]'
        : 'text-[color:var(--text)] hover:bg-[color:var(--surface-overlay)] hover:text-[color:var(--text-strong)]',
    )}
  >
    {selected && <SelectionStrip />}
    <Icon
      className={clsx(
        'h-4 w-4 shrink-0',
        selected ? 'text-[color:var(--accent-text)]' : 'text-[color:var(--text-muted)]',
      )}
    />
    <span className="truncate">{label}</span>
  </button>
);
