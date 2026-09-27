'use client';

import { Handle, type NodeProps } from '@xyflow/react';
import { clsx } from 'clsx';
import { type FocusEvent, type KeyboardEvent, useEffect, useRef } from 'react';

import type { TCanvasNode } from '@interfaces';

import { useTranslations } from '@/i18n';
import { useCanvasStore, usePermissionsStore } from '@/lib/stores';
import { canEditNode } from '@/lib/utils';

import { HANDLE_POSITIONS } from './consts';
import { ExpandToggle, NodeBand } from './fragments';
import { useExpandableLabel } from './hooks';

export const QuestionNode = ({ id, data, selected }: NodeProps<TCanvasNode>) => {
  const t = useTranslations();
  const { label } = data;

  const pendingConnection = useCanvasStore((s) => s.pendingConnection);
  const editingNodeId = useCanvasStore((s) => s.editingNodeId);
  const setEditingNodeId = useCanvasStore((s) => s.setEditingNodeId);
  const updateNodeLabel = useCanvasStore((s) => s.updateNodeLabel);
  const userId = usePermissionsStore((s) => s.userId);
  const isOwner = usePermissionsStore((s) => s.isOwner);
  const canEditCanvas = usePermissionsStore((s) => s.canEditCanvas);

  const canEdit = canEditNode(data.createdBy, { userId, isOwner, canEditCanvas });
  const isPending = pendingConnection === id;
  const isEditing = editingNodeId === id && canEdit;
  const hasLabel = label.trim().length > 0;

  const { labelRefCallback, expanded, expandable, toggleExpanded } = useExpandableLabel(hasLabel);

  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isEditing) return;

    const input = inputRef.current;
    if (!input) return;

    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }, [isEditing]);

  const commit = (value: string) => {
    updateNodeLabel(id, value.trim() || label);
    setEditingNodeId(null);
  };

  const handleBlur = (event: FocusEvent<HTMLTextAreaElement>) => commit(event.target.value);

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      commit(event.currentTarget.value);

      return;
    }

    if (event.key === 'Escape') setEditingNodeId(null);
  };

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
      {HANDLE_POSITIONS.map(({ id: handleId, position }) => (
        <Handle
          key={handleId}
          id={handleId}
          type="source"
          position={position}
          isConnectable={canEditCanvas}
          className={clsx(
            '!h-2.5 !w-2.5 !rounded-full !border !border-[color:var(--surface)] !bg-[color:var(--accent)] !opacity-0 !shadow-[0_0_0_3px_var(--accent-soft)] !transition-opacity !duration-200',
            canEditCanvas ? 'group-hover/question:!opacity-100' : '!pointer-events-none',
          )}
        />
      ))}

      <div className="flex flex-col gap-2 px-5 pt-3.5 pb-4">
        <NodeBand tone="question" label={t.platform.canvas.question.badge} />

        {isEditing ? (
          <textarea
            ref={inputRef}
            defaultValue={label}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            onClick={(event) => event.stopPropagation()}
            onMouseDown={(event) => event.stopPropagation()}
            rows={1}
            placeholder={t.platform.canvas.question.placeholder}
            aria-label={t.platform.canvas.question.ariaLabel}
            className="nodrag field-sizing-content w-full resize-none overflow-hidden bg-transparent font-grotesk text-[17px] leading-[1.45] font-semibold tracking-tight break-words text-[color:var(--text-strong)] caret-[color:var(--accent)] outline-none placeholder:text-[color:var(--text-muted)]"
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
