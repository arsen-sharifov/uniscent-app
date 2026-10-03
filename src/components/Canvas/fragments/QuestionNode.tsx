'use client';

import type { NodeProps } from '@xyflow/react';
import { clsx } from 'clsx';

import type { TCanvasNode } from '@interfaces';

import { useTranslations } from '@/i18n';
import { useCanvasStore, usePermissionsStore } from '@/lib/stores';
import { canEditNode } from '@/lib/utils';

import { useExpandableLabel } from '../hooks';
import { ExpandToggle } from './ExpandToggle';
import { NodeBand } from './NodeBand';
import { NodeHandles } from './NodeHandles';
import { NodeLabelEditor } from './NodeLabelEditor';

export const QuestionNode = ({ id, data, selected, width }: NodeProps<TCanvasNode>) => {
  const t = useTranslations();
  const { label } = data;

  const canEdit = usePermissionsStore((state) => canEditNode(data.createdBy, state));
  const isPending = useCanvasStore((state) => state.pendingConnection === id);
  const isEditing = useCanvasStore((state) => state.editingNodeId === id && canEdit);
  const hasLabel = label.trim().length > 0;

  const { labelRefCallback, expanded, expandable, toggleExpanded } = useExpandableLabel(hasLabel);

  return (
    <div
      data-export-node
      data-tour="canvasQuestionNode"
      className={clsx(
        'group/question relative flex max-w-[380px] min-w-[260px] flex-col overflow-visible rounded-xl border bg-[color:var(--surface-elevated)] shadow-[var(--shadow-pip)] transition-[box-shadow,border-color,transform] duration-200 hover:-translate-y-px hover:shadow-[var(--shadow-card-hover)] motion-reduce:transition-none motion-reduce:hover:translate-y-0',
        isEditing ? 'border-[color:var(--border-active)]' : 'border-[color:var(--border-strong)]',
        selected && 'shadow-[var(--shadow-card-hover)] ring-[1.5px] ring-[color:var(--selection)]',
        isPending && 'animate-node-pulse ring-2 ring-[color:var(--ref-border)] motion-reduce:animate-none',
      )}
    >
      <NodeHandles type="source" revealClassName="group-hover/question:!opacity-100" />

      <div className="flex flex-col gap-2 px-5 pt-3.5 pb-4">
        <NodeBand tone="question" label={t.platform.canvas.question.badge} />

        {isEditing ? (
          <NodeLabelEditor
            id={id}
            label={label}
            measured={Boolean(width)}
            ariaLabel={t.platform.canvas.question.ariaLabel}
            className="text-[17px] leading-[1.45] font-semibold"
            placeholder={t.platform.canvas.question.placeholder}
          />
        ) : (
          <p
            ref={labelRefCallback}
            className={clsx(
              'font-grotesk text-[17px] leading-[1.45] font-semibold tracking-tight break-words whitespace-pre-wrap select-none',
              hasLabel ? 'text-[color:var(--text-strong)]' : 'text-[color:var(--text-subtle)]',
              hasLabel && !expanded && 'line-clamp-8',
            )}
          >
            {hasLabel ? label : t.platform.canvas.question.placeholder}
          </p>
        )}

        {!isEditing && expandable && <ExpandToggle expanded={expanded} onToggle={toggleExpanded} />}
      </div>
    </div>
  );
};
