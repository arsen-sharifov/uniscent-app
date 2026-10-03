'use client';

import { clsx } from 'clsx';

import { MAX_NODE_LABEL_LENGTH } from '@/lib/canvas';

import { useLabelEditing } from '../hooks';

interface INodeLabelEditorProps {
  id: string;
  label: string;
  measured: boolean;
  ariaLabel: string;
  className: string;
  placeholder?: string;
  signalLabelled?: boolean;
}

export const NodeLabelEditor = ({
  id,
  label,
  measured,
  ariaLabel,
  className,
  placeholder,
  signalLabelled,
}: INodeLabelEditorProps) => {
  const { inputRef, handleLabelBlur, handleLabelKeyDown } = useLabelEditing({ id, label, measured, signalLabelled });

  return (
    <textarea
      ref={inputRef}
      defaultValue={label}
      maxLength={MAX_NODE_LABEL_LENGTH}
      onBlur={handleLabelBlur}
      onKeyDown={handleLabelKeyDown}
      onClick={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
      rows={1}
      placeholder={placeholder}
      aria-label={ariaLabel}
      className={clsx(
        'nodrag field-sizing-content w-full resize-none overflow-hidden bg-transparent font-grotesk tracking-tight break-words text-[color:var(--text-strong)] caret-[color:var(--accent)] outline-none placeholder:text-[color:var(--text-muted)]',
        className,
      )}
    />
  );
};
