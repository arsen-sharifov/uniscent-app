import { clsx } from 'clsx';

import type { IShowcaseItem } from '@story-interfaces';

import { SHOWCASE_COLUMN_CLASS } from '../consts';

interface IShowcaseProps {
  title?: string;
  caption?: string;
  columns?: keyof typeof SHOWCASE_COLUMN_CLASS;
  items: IShowcaseItem[];
}

export const Showcase = ({ title, caption, columns = 3, items }: IShowcaseProps) => (
  <div data-visual-target className="mx-auto w-full max-w-[1120px] px-8 py-12">
    {title && (
      <header className="mb-6 flex items-baseline justify-between gap-4 border-b border-[color:var(--border)] pb-3">
        <h2 className="font-grotesk text-[22px] leading-none font-semibold tracking-tight text-[color:var(--text-strong)]">
          {title}
        </h2>
        {caption && (
          <span className="font-mono-ui text-[10px] tracking-[0.2em] text-[color:var(--text-subtle)] uppercase">
            {caption}
          </span>
        )}
      </header>
    )}
    <div className={clsx('grid grid-cols-1 gap-3', SHOWCASE_COLUMN_CLASS[columns])}>
      {items.map((item) => (
        <article
          key={item.label}
          className={clsx(
            'flex flex-col gap-3 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-elevated)] p-4',
            item.span && 'sm:col-span-2',
          )}
        >
          <div className="flex items-baseline justify-between gap-2">
            <span className="truncate text-[12px] font-medium text-[color:var(--text-strong)]">{item.label}</span>
            {item.hint && (
              <code className="shrink-0 rounded bg-[color:var(--surface-overlay)] px-1.5 py-0.5 font-mono-ui text-[9px] tracking-[0.04em] text-[color:var(--text-muted)]">
                {item.hint}
              </code>
            )}
          </div>
          <div className="flex min-h-[60px] flex-1 items-center">{item.children}</div>
          {item.description && (
            <p className="text-[11px] leading-snug text-[color:var(--text-muted)]">{item.description}</p>
          )}
        </article>
      ))}
    </div>
  </div>
);
