import { FileText, Folder } from 'lucide-react';

import type { IFlattenedItem } from '@interfaces';

interface IDragOverlayContentProps {
  item: IFlattenedItem;
  bulkCount?: number;
}

export const DragOverlayContent = ({ item, bulkCount }: IDragOverlayContentProps) => (
  <div className="relative">
    {bulkCount && bulkCount > 1 && (
      <>
        <div className="absolute top-1 left-1 h-full w-56 rounded-xl border border-[color:var(--accent)]/40 bg-[color:var(--accent-soft)]/50" />
        <div className="absolute top-0.5 left-0.5 h-full w-56 rounded-xl border border-[color:var(--accent)]/60 bg-[color:var(--accent-soft)]/80" />
      </>
    )}
    <div className="relative w-56 rounded-xl border border-[color:var(--accent)] bg-[color:var(--surface-elevated)] shadow-[var(--shadow-modal)]">
      <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl bg-[color:var(--accent-soft)] px-2 py-1 font-grotesk text-sm leading-5 text-[color:var(--text-strong)]">
        <div className="h-3.5 w-3.5 shrink-0" />
        {item.type === 'folder' ? (
          <Folder className="h-4 w-4 shrink-0 text-[color:var(--accent-text)]" />
        ) : (
          <FileText className="h-4 w-4 shrink-0 text-[color:var(--accent-text)]" />
        )}
        <span className="truncate">{item.name}</span>
        {item.type === 'folder' && item.childCount > 0 && (
          <span className="ml-auto rounded-md bg-[color:var(--surface-overlay)] px-1.5 font-mono-ui text-[10px] font-medium text-[color:var(--accent-text)]">
            {item.childCount}
          </span>
        )}
      </div>
      {bulkCount && bulkCount > 1 && (
        <span className="absolute -top-2 -right-2 rounded-full bg-[color:var(--accent)] px-2 py-0.5 font-mono-ui text-[10px] font-bold text-[color:var(--on-accent)] shadow-[var(--shadow-pip)]">
          {bulkCount}
        </span>
      )}
    </div>
  </div>
);
