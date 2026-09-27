'use client';

import { clsx } from 'clsx';

import { useExpandableLabel, useLabelEditing } from '../hooks';
import { CommentsButton } from './CommentsButton';
import { ExpandToggle } from './ExpandToggle';

interface ICanvasNodeLabelProps {
  id: string;
  label: string;
  isEditing: boolean;
  commentCount: number;
}

export const CanvasNodeLabel = ({ id, label, isEditing, commentCount }: ICanvasNodeLabelProps) => {
  const { inputRef, handleLabelBlur, handleLabelKeyDown } = useLabelEditing(id, label, isEditing);
  const { labelRefCallback, expanded, expandable, toggleExpanded } = useExpandableLabel();

  return (
    <>
      <div className="flex min-w-0 items-start gap-2">
        {isEditing ? (
          <textarea
            ref={inputRef}
            defaultValue={label}
            onBlur={handleLabelBlur}
            onKeyDown={handleLabelKeyDown}
            onClick={(event) => event.stopPropagation()}
            onMouseDown={(event) => event.stopPropagation()}
            rows={1}
            className="nodrag field-sizing-content w-full resize-none overflow-hidden bg-transparent font-grotesk text-[13.5px] leading-[1.55] font-medium tracking-tight break-words text-[color:var(--text-strong)] caret-[color:var(--accent)] outline-none placeholder:text-[color:var(--text-muted)]"
          />
        ) : (
          <p
            ref={labelRefCallback}
            className={clsx(
              'min-w-0 flex-1 font-grotesk text-[13.5px] leading-[1.55] font-medium tracking-tight break-words whitespace-pre-wrap text-[color:var(--text-strong)] select-none',
              !expanded && 'line-clamp-10',
            )}
          >
            {label}
          </p>
        )}

        {!isEditing && <CommentsButton nodeId={id} count={commentCount} />}
      </div>

      {!isEditing && expandable && <ExpandToggle expanded={expanded} onToggle={toggleExpanded} />}
    </>
  );
};
