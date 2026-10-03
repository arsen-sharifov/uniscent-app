'use client';

import { Search, X } from 'lucide-react';
import { useEffect, useRef } from 'react';

import { useTranslations } from '@/i18n';
import { isTypingTarget } from '@/lib/utils';

interface ISearchInputProps {
  value: string;
  onChange: (value: string) => void;
}

export const SearchInput = ({ value, onChange }: ISearchInputProps) => {
  const t = useTranslations();
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;
      if (event.key === '/') {
        event.preventDefault();
        ref.current?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);

    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const hasValue = value.length > 0;

  return (
    <div className="group relative flex items-center rounded-lg border border-[color:var(--border-strong)] bg-[color:var(--surface-soft)] transition-colors duration-150 focus-within:border-[color:var(--accent)] focus-within:ring-2 focus-within:ring-[color:var(--ring-focus)] motion-reduce:transition-none">
      <Search className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-[color:var(--text-subtle)] transition-colors duration-150 group-focus-within:text-[color:var(--accent-text)] motion-reduce:transition-none" />
      <input
        ref={ref}
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && hasValue) {
            onChange('');
            event.currentTarget.blur();
          }
        }}
        placeholder={t.platform.sidebar.searchPlaceholder}
        className="w-full min-w-0 bg-transparent py-1.5 pr-7 pl-8 font-grotesk text-sm text-[color:var(--text-strong)] caret-[color:var(--accent)] outline-none selection:bg-[color:var(--accent-soft)] selection:text-[color:var(--text-strong)] placeholder:text-[color:var(--text-muted)]"
      />
      {hasValue && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label={t.platform.sidebar.clearSearch}
          className="absolute right-1.5 cursor-pointer rounded-full p-0.5 text-[color:var(--text-subtle)] transition-colors duration-150 hover:bg-[color:var(--surface-overlay)] hover:text-[color:var(--text-strong)] focus-visible:ring-2 focus-visible:ring-[color:var(--ring-focus)] focus-visible:outline-none active:bg-[color:var(--accent-soft)] active:text-[color:var(--accent-text)] motion-reduce:transition-none"
          tabIndex={-1}
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
};
