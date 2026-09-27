'use client';

import type { XYPosition } from '@xyflow/react';
import { Link2, Search } from 'lucide-react';
import { useState, useEffect, useRef, useMemo, useCallback, useId } from 'react';

import type { INodeReference, IReferenceNodeData, IScreenPoint } from '@interfaces';
import { useClickOutside, useEscapeKey, useFocusTrap } from '@hooks';
import { useTranslations } from '@/i18n';

import { ReferenceSearchResults } from './ReferenceSearchResults';

export interface IReferenceSearchPanelContentProps {
  nodes: INodeReference[];
  loading: boolean;
  position: XYPosition;
  screenPos: IScreenPoint;
  onSelect: (position: XYPosition, data: IReferenceNodeData) => void;
  onClose: () => void;
}

export const ReferenceSearchPanelContent = ({
  nodes,
  loading,
  screenPos,
  position,
  onSelect,
  onClose,
}: IReferenceSearchPanelContentProps) => {
  const t = useTranslations();
  const [query, setQuery] = useState('');
  const [rawCursorIndex, setRawCursorIndex] = useState(0);
  const panelRef = useRef<HTMLDialogElement>(null);
  const listboxId = useId();
  const optionIdPrefix = useId();

  const inputCallbackRef = useCallback((node: HTMLInputElement | null) => {
    node?.focus();
  }, []);

  const filtered = useMemo(() => {
    if (loading) return [];

    const term = query.trim().toLowerCase();
    if (!term) return nodes;

    return nodes.filter(
      (node) =>
        node.label.toLowerCase().includes(term) ||
        node.threadName.toLowerCase().includes(term) ||
        node.workspaceName.toLowerCase().includes(term),
    );
  }, [nodes, query, loading]);

  const cursorIndex = Math.min(rawCursorIndex, Math.max(filtered.length - 1, 0));

  const handleSelect = useCallback(
    (node: INodeReference) => {
      onSelect(position, {
        label: node.label,
        sourceNodeId: node.id,
        sourceNodeLabel: node.label,
        sourceThreadId: node.threadId,
        sourceThreadName: node.threadName,
        sourceWorkspaceId: node.workspaceId,
        sourceWorkspaceName: node.workspaceName,
      });
    },
    [onSelect, position],
  );

  useEscapeKey(onClose);
  useClickOutside(panelRef, onClose);
  useFocusTrap(panelRef, true);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setRawCursorIndex((prev) => (filtered.length === 0 ? 0 : (prev + 1) % filtered.length));

        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setRawCursorIndex((prev) => (filtered.length === 0 ? 0 : (prev - 1 + filtered.length) % filtered.length));

        return;
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        const target = filtered[cursorIndex];
        if (target) handleSelect(target);
      }
    };

    document.addEventListener('keydown', onKeyDown);

    return () => document.removeEventListener('keydown', onKeyDown);
  }, [filtered, cursorIndex, handleSelect]);

  const activeOptionId = filtered.length > 0 ? `${optionIdPrefix}-${cursorIndex}` : undefined;

  return (
    <dialog
      open
      ref={panelRef}
      aria-modal="true"
      data-tour="canvasReferenceSearch"
      aria-label={t.platform.canvas.referenceSearch.placeholder}
      style={{ left: screenPos.x, top: screenPos.y }}
      className="fixed inset-auto z-50 flex w-80 animate-rise-up flex-col overflow-hidden rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] font-grotesk text-[color:var(--text)] shadow-[var(--shadow-modal)] motion-reduce:animate-none"
    >
      <div className="flex items-center gap-2 border-b border-[color:var(--border)] px-2.5 py-2.5">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[color:var(--accent-soft)] text-[color:var(--accent-text)]">
          <Link2 className="h-3 w-3" strokeWidth={2.25} />
        </span>
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-[color:var(--border-strong)] bg-[color:var(--surface-soft)] px-3 py-2 transition-[border-color,box-shadow] duration-150 focus-within:border-[color:var(--accent)] focus-within:ring-2 focus-within:ring-[color:var(--ring-focus)] motion-reduce:transition-none">
          <Search className="h-3.5 w-3.5 shrink-0 text-[color:var(--text-muted)]" strokeWidth={2} aria-hidden />
          <input
            ref={inputCallbackRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setRawCursorIndex(0);
            }}
            placeholder={t.platform.canvas.referenceSearch.placeholder}
            aria-label={t.platform.canvas.referenceSearch.placeholder}
            role="combobox"
            aria-expanded={filtered.length > 0}
            aria-controls={filtered.length > 0 ? listboxId : undefined}
            aria-activedescendant={activeOptionId}
            aria-autocomplete="list"
            className="min-w-0 flex-1 bg-transparent text-sm text-[color:var(--text-strong)] caret-[color:var(--accent)] outline-none placeholder:text-[color:var(--text-muted)]"
          />
        </div>
      </div>

      <div aria-busy={loading} className="flex max-h-72 flex-col gap-px overflow-y-auto p-1">
        <ReferenceSearchResults
          nodes={filtered}
          loading={loading}
          query={query}
          listboxId={listboxId}
          optionIdPrefix={optionIdPrefix}
          cursorIndex={cursorIndex}
          onSelect={handleSelect}
          onCursorChange={setRawCursorIndex}
        />
      </div>

      {filtered.length > 0 && (
        <div className="flex items-center justify-between border-t border-[color:var(--border)] bg-[color:var(--surface-overlay)] px-3 py-1.5 font-mono-ui text-[9.5px] tracking-[0.04em] text-[color:var(--text-muted)] lowercase">
          <span className="flex items-center gap-1">
            <kbd className="inline-flex h-4 min-w-4 items-center justify-center rounded-md border border-[color:var(--border-strong)] bg-[color:var(--surface)] px-1 font-mono-ui text-[9px] text-[color:var(--text-strong)]">
              ↵
            </kbd>
            {t.platform.canvas.referenceSearch.actionLink}
          </span>
          <span className="flex items-center gap-1">
            <kbd className="inline-flex h-4 min-w-4 items-center justify-center rounded-md border border-[color:var(--border-strong)] bg-[color:var(--surface)] px-1 font-mono-ui text-[9px] text-[color:var(--text-strong)]">
              ↑↓
            </kbd>
            {t.platform.canvas.referenceSearch.actionNavigate}
          </span>
          <span className="flex items-center gap-1">
            <kbd className="inline-flex h-4 min-w-4 items-center justify-center rounded-md border border-[color:var(--border-strong)] bg-[color:var(--surface)] px-1 font-mono-ui text-[9px] text-[color:var(--text-strong)]">
              Esc
            </kbd>
            {t.platform.canvas.referenceSearch.actionClose}
          </span>
        </div>
      )}
    </dialog>
  );
};
