import { clsx } from 'clsx';
import { ChevronRight, MoreHorizontal } from 'lucide-react';

import { List } from '@/components';

import { ContentExample } from './ContentExample';

interface IBulkActionsRowProps {
  label: string;
  onSelect: (label: string, checked: boolean) => void;
  onMenu: (label: string) => void;
}

export const BulkActionsRow = ({ label, onSelect, onMenu }: IBulkActionsRowProps) => (
  <List
    trigger={(open, toggle) => (
      <div
        className={clsx(
          'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[13px] text-[color:var(--text)] transition-colors',
          open
            ? 'bg-[color:var(--surface-overlay)] text-[color:var(--text-strong)]'
            : 'hover:bg-[color:var(--surface-overlay)] hover:text-[color:var(--text-strong)]',
        )}
      >
        <input
          type="checkbox"
          onClick={(event) => event.stopPropagation()}
          onChange={(inputEvent) => onSelect(label, inputEvent.currentTarget.checked)}
          className="h-3.5 w-3.5 shrink-0 accent-[color:var(--accent)]"
        />
        <button type="button" onClick={toggle} className="flex flex-1 items-center gap-2 text-left">
          <ChevronRight
            className={clsx('h-3.5 w-3.5 shrink-0 transition-transform duration-200', open && 'rotate-90')}
            strokeWidth={2.25}
          />
          <span className="truncate font-medium">{label}</span>
        </button>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onMenu(label);
          }}
          className="rounded-md p-1 text-[color:var(--text-subtle)] hover:bg-[color:var(--surface)] hover:text-[color:var(--text)]"
          title="Actions"
        >
          <MoreHorizontal className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      </div>
    )}
  >
    <ContentExample text={`Preview of ${label}.`} />
  </List>
);
