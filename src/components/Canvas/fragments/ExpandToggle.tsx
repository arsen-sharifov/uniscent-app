'use client';

import { clsx } from 'clsx';
import { ChevronDown } from 'lucide-react';

import { useTranslations } from '@/i18n';

interface IExpandToggleProps {
  expanded: boolean;
  onToggle: () => void;
}

export const ExpandToggle = ({ expanded, onToggle }: IExpandToggleProps) => {
  const t = useTranslations();

  return (
    <button
      data-export-omit
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
      onMouseDown={(event) => event.stopPropagation()}
      className="nodrag inline-flex w-fit items-center gap-1 rounded-md font-mono-ui text-[10px] tracking-[0.04em] text-[color:var(--text-muted)] transition-colors duration-150 hover:text-[color:var(--accent-text)] focus-visible:ring-2 focus-visible:ring-[color:var(--ring-focus)] focus-visible:outline-none motion-reduce:transition-none"
    >
      <ChevronDown
        className={clsx('h-3 w-3 transition-transform duration-200', expanded && 'rotate-180')}
        strokeWidth={2.25}
      />
      {expanded ? t.platform.canvas.node.showLess : t.platform.canvas.node.showMore}
    </button>
  );
};
