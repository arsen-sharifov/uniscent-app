'use client';

import { clsx } from 'clsx';
import { SearchX } from 'lucide-react';

import type { INodeReference } from '@interfaces';

import { SelectionStrip } from '@/components/SelectionStrip';
import { Skeleton } from '@/components/Skeleton';
import { useTranslations } from '@/i18n';

import { REFERENCE_SKELETON_ROWS } from '../consts';

interface IReferenceSearchResultsProps {
  nodes: INodeReference[];
  loading: boolean;
  query: string;
  listboxId: string;
  optionIdPrefix: string;
  cursorIndex: number;
  onSelect: (node: INodeReference) => void;
  onCursorChange: (index: number) => void;
}

export const ReferenceSearchResults = ({
  nodes,
  loading,
  query,
  listboxId,
  optionIdPrefix,
  cursorIndex,
  onSelect,
  onCursorChange,
}: IReferenceSearchResultsProps) => {
  const t = useTranslations();

  if (loading) {
    return (
      <div aria-hidden className="flex flex-col gap-px">
        {REFERENCE_SKELETON_ROWS.map((width) => (
          <div key={width} className="flex flex-col gap-1.5 px-3 py-2">
            <Skeleton className={clsx('h-3', width)} />
            <Skeleton className="h-2 w-24" />
          </div>
        ))}
      </div>
    );
  }

  if (nodes.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[color:var(--surface-overlay)] text-[color:var(--text-muted)]">
          <SearchX className="h-3.5 w-3.5" strokeWidth={2} />
        </span>
        <p className="text-[11.5px] font-medium text-[color:var(--text-strong)]">
          {query
            ? t('platform.canvas.referenceSearch.noMatch', { query })
            : t.platform.canvas.referenceSearch.noResults}
        </p>
        {query && (
          <p className="max-w-[200px] text-[10.5px] leading-snug text-[color:var(--text-muted)]">
            {t.platform.canvas.referenceSearch.hint}
          </p>
        )}
      </div>
    );
  }

  return (
    <ul
      role="listbox"
      id={listboxId}
      aria-label={t.platform.canvas.referenceSearch.placeholder}
      className="flex flex-col gap-px"
    >
      {nodes.map((node, index) => (
        <li key={node.id} role="option" id={`${optionIdPrefix}-${index}`} aria-selected={index === cursorIndex}>
          <button
            type="button"
            onMouseEnter={() => onCursorChange(index)}
            onFocus={() => onCursorChange(index)}
            onClick={() => onSelect(node)}
            className={clsx(
              'group/item relative flex w-full flex-col items-stretch rounded-lg px-3 py-2 text-left transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-[color:var(--ring-focus)] focus-visible:outline-none focus-visible:ring-inset motion-reduce:transition-none',
              index === cursorIndex ? 'bg-[color:var(--accent-soft)]' : 'hover:bg-[color:var(--surface-overlay)]',
            )}
          >
            {index === cursorIndex && <SelectionStrip />}
            <span className="truncate font-grotesk text-[12.5px] font-medium tracking-tight text-[color:var(--text-strong)]">
              {node.label}
            </span>
            <span className="mt-0.5 flex items-center gap-1 truncate font-mono-ui text-[10.5px] tracking-[0.04em] text-[color:var(--text-muted)]">
              <span className="truncate text-[color:var(--text-subtle)]">{node.workspaceName}</span>
              <span className="text-[color:var(--text-faint)]">/</span>
              <span className="truncate text-[color:var(--text-subtle)]">{node.threadName}</span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
};
