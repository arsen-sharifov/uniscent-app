'use client';

import { clsx } from 'clsx';
import { MessageSquare } from 'lucide-react';

import { useTranslations } from '@/i18n';
import { useCanvasStore, usePermissionsStore } from '@/lib/stores';

interface ICommentsButtonProps {
  nodeId: string;
  count: number;
}

export const CommentsButton = ({ nodeId, count }: ICommentsButtonProps) => {
  const t = useTranslations();

  const open = useCanvasStore((state) => state.openCommentsNodeId === nodeId);
  const setOpenCommentsNodeId = useCanvasStore((state) => state.setOpenCommentsNodeId);
  const canComment = usePermissionsStore((state) => state.canComment);

  const hasComments = count > 0;
  if (!hasComments && !canComment) return null;

  return (
    <button
      type="button"
      data-tour="canvasNodeComments"
      onClick={(event) => {
        event.stopPropagation();
        setOpenCommentsNodeId(open ? null : nodeId);
      }}
      onMouseDown={(event) => event.stopPropagation()}
      aria-label={hasComments ? t.platform.canvas.node.viewComments : t.platform.canvas.node.addComment}
      className={clsx(
        'nodrag mt-px inline-flex h-5 shrink-0 items-center gap-0.5 rounded-md transition-[opacity,color,background-color] duration-150 focus-visible:ring-2 focus-visible:ring-[color:var(--ring-focus)] focus-visible:outline-none motion-reduce:transition-none',
        hasComments
          ? 'bg-[color:var(--accent-soft)] px-1.5 font-mono-ui text-[10px] font-bold text-[color:var(--accent-text)] hover:bg-[color:var(--accent-glow)]'
          : 'w-5 justify-center text-[color:var(--text-faint)] opacity-0 group-hover/node:opacity-100 hover:bg-[color:var(--surface-overlay)] hover:text-[color:var(--text)] focus-visible:opacity-100',
      )}
    >
      <MessageSquare className="h-2.5 w-2.5" strokeWidth={2.25} />
      {hasComments && <span className="tabular-nums">{count}</span>}
    </button>
  );
};
