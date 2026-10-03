'use client';

import type { KeyboardEvent } from 'react';

import { MAX_NAME_LENGTH } from '@constants';
import { useTranslations } from '@/i18n';

interface IInlineRenameInputProps {
  value: string;
  onChange: (value: string) => void;
  onCommit: () => void;
  onKeyDown: (event: KeyboardEvent) => void;
  inputRef: (element: HTMLInputElement | null) => void;
}

export const InlineRenameInput = ({ value, onChange, onCommit, onKeyDown, inputRef }: IInlineRenameInputProps) => {
  const t = useTranslations();

  return (
    <input
      ref={inputRef}
      value={value}
      maxLength={MAX_NAME_LENGTH}
      aria-label={t.platform.sidebar.rename}
      onChange={(event) => onChange(event.target.value)}
      onBlur={onCommit}
      onKeyDown={onKeyDown}
      onClick={(event) => event.stopPropagation()}
      className="min-w-0 flex-1 truncate rounded-lg border border-[color:var(--border-strong)] bg-[color:var(--surface-soft)] px-2.5 py-1 font-grotesk text-sm text-[color:var(--text-strong)] caret-[color:var(--accent)] transition-colors duration-150 outline-none selection:bg-[color:var(--accent-soft)] selection:text-[color:var(--text-strong)] focus:border-[color:var(--accent)] focus:ring-2 focus:ring-[color:var(--ring-focus)] motion-reduce:transition-none"
    />
  );
};
