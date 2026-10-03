'use client';

import { SearchX } from 'lucide-react';

import { useTranslations } from '@/i18n';

interface ISearchEmptyStateProps {
  query: string;
}

export const SearchEmptyState = ({ query }: ISearchEmptyStateProps) => {
  const t = useTranslations();

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-8 text-center">
      <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-overlay)]">
        <SearchX className="h-4 w-4 text-[color:var(--text-subtle)]" />
      </div>
      <p className="font-grotesk text-xs font-medium text-[color:var(--text-muted)]">
        {t.platform.sidebar.noSearchResults}
      </p>
      <p className="mt-1 max-w-[180px] truncate font-mono-ui text-[10px] text-[color:var(--text-label)]">
        &ldquo;{query}&rdquo;
      </p>
    </div>
  );
};
