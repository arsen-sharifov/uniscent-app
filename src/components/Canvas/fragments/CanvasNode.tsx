'use client';

import type { NodeProps } from '@xyflow/react';
import { clsx } from 'clsx';
import { useState } from 'react';

import type { INodeStateBand, TCanvasNode } from '@interfaces';

import { useTranslations } from '@/i18n';
import { findLinkedNodeIds, isAffected } from '@/lib/canvas';
import { useCanvasStore, usePermissionsStore } from '@/lib/stores';
import { canEditNode } from '@/lib/utils';

import { resolveNodeWashStyle } from '../utils';
import { CanvasNodeLabel } from './CanvasNodeLabel';
import { CommentsPanelContent } from './CommentsPanelContent';
import { NodeBand } from './NodeBand';
import { NodeHandles } from './NodeHandles';

export const CanvasNode = ({ id, data, selected, width }: NodeProps<TCanvasNode>) => {
  const t = useTranslations();
  const { label, status, comments, isNew, isAnswer, eligibleHint, effectiveStatus } = data;

  const canEdit = usePermissionsStore((state) => canEditNode(data.createdBy, state));
  const isPending = useCanvasStore((state) => state.pendingConnection === id);
  const isEditing = useCanvasStore((state) => state.editingNodeId === id && canEdit);
  const showComments = useCanvasStore((state) => state.openCommentsNodeId === id);
  const isLinked = useCanvasStore((state) => findLinkedNodeIds(state.edges).has(id));
  const clearNewFlag = useCanvasStore((state) => state.clearNewFlag);

  const [commentText, setCommentText] = useState('');

  const isInvalid = status === 'invalid';

  const stateBands: INodeStateBand[] = [
    { active: isInvalid, tone: 'invalid', label: t.platform.canvas.node.invalidBadge },
    { active: isAffected(effectiveStatus), tone: 'affected', label: t.platform.canvas.node.affectedBadge },
    { active: isAnswer, tone: 'answer', label: t.platform.canvas.node.answerBadge },
    { active: status === 'valid', tone: 'valid', label: t.platform.canvas.node.validBadge },
  ];
  const stateBand = stateBands.find((band) => band.active);

  return (
    <div
      data-export-node
      data-tour="canvasNode"
      data-tour-state={effectiveStatus ?? status ?? 'unmarked'}
      data-tour-linked={isLinked ? 'true' : 'false'}
      onAnimationEnd={isNew ? () => clearNewFlag(id) : undefined}
      style={resolveNodeWashStyle(stateBand?.tone, isEditing)}
      className={clsx(
        'group/node relative flex max-w-[260px] min-w-[180px] flex-col overflow-visible rounded-xl border bg-[color:var(--surface-elevated)] shadow-[var(--shadow-pip)] transition-[box-shadow,border-color,background-color,transform] duration-200 hover:-translate-y-px hover:shadow-[var(--shadow-card-hover)] motion-reduce:transition-none motion-reduce:hover:translate-y-0',
        isEditing ? 'border-[color:var(--border-active)]' : 'border-[color:var(--border-strong)]',
        isNew && 'animate-node-drop motion-reduce:animate-none',
        selected && 'shadow-[var(--shadow-card-hover)] ring-[1.5px] ring-[color:var(--selection)]',
        isPending && 'animate-node-pulse ring-2 ring-[color:var(--ref-border)] motion-reduce:animate-none',
      )}
    >
      {eligibleHint && (
        <span
          data-export-omit
          aria-hidden
          className="pointer-events-none absolute -inset-[5px] animate-node-pulse rounded-[17px] border-2 border-dashed border-[color:var(--accent)]/55 motion-reduce:animate-none"
        />
      )}

      <NodeHandles type="source" revealClassName="group-hover/node:!opacity-100" />

      <div className="flex min-w-0 flex-1 flex-col gap-1.5 px-4 py-3">
        {stateBand && <NodeBand tone={stateBand.tone} label={stateBand.label} />}

        <CanvasNodeLabel
          id={id}
          label={label}
          isEditing={isEditing}
          measured={Boolean(width)}
          commentCount={comments.length}
        />
      </div>

      {showComments && (
        <div
          data-export-omit
          onClick={(event) => event.stopPropagation()}
          onMouseDown={(event) => event.stopPropagation()}
          data-tour="canvasCommentsPanel"
          className="nodrag absolute top-0 left-full z-50 ml-3 flex w-72 flex-col overflow-hidden rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] font-grotesk text-[color:var(--text)] shadow-[var(--shadow-modal)]"
        >
          <CommentsPanelContent
            nodeId={id}
            comments={comments}
            commentText={commentText}
            onCommentTextChange={setCommentText}
          />
        </div>
      )}
    </div>
  );
};
