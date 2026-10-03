'use client';

import { clsx } from 'clsx';

import type { IToolItem } from '@interfaces';

import { useTranslations } from '@/i18n';

import { ICON_STROKE } from '../consts';
import { renderShortcut } from '../utils';

interface IToolShortcutRowProps {
  tool: IToolItem;
  isActive: boolean;
}

export const ToolShortcutRow = ({ tool, isActive }: IToolShortcutRowProps) => {
  const t = useTranslations();
  const Icon = tool.icon;

  return (
    <li
      className={clsx(
        'group/row flex items-start gap-3 rounded-lg px-2 py-1.5',
        'transition-colors duration-150 ease-out motion-reduce:transition-none',
        isActive && 'bg-[color:var(--accent-soft)]',
        tool.disabled && 'opacity-40',
        !isActive && !tool.disabled && 'hover:bg-[color:var(--surface-overlay)]',
      )}
    >
      <span
        className={clsx(
          'mt-px flex h-7 w-7 shrink-0 items-center justify-center rounded-md',
          'transition-colors duration-150 ease-out motion-reduce:transition-none',
          isActive
            ? 'bg-[color:var(--accent)] text-[color:var(--on-accent)] shadow-[var(--shadow-pip)]'
            : 'bg-[color:var(--surface-overlay)] text-[color:var(--text-muted)] group-hover/row:text-[color:var(--text)]',
        )}
      >
        <Icon className="h-[14px] w-[14px]" strokeWidth={ICON_STROKE} />
      </span>

      <div className="flex min-w-0 flex-1 flex-col leading-tight">
        <div className="flex items-center gap-1.5">
          <span
            className={clsx(
              'truncate font-grotesk text-[12.5px] font-medium tracking-tight',
              isActive ? 'text-[color:var(--accent-text)]' : 'text-[color:var(--text-strong)]',
            )}
          >
            {tool.label}
          </span>
          {isActive && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-[color:var(--accent-soft)] px-1.5 py-px font-mono-ui text-[9px] font-bold tracking-[0.12em] text-[color:var(--accent-text)] uppercase">
              <span aria-hidden className="h-1 w-1 rounded-full bg-[color:var(--accent)]" />
              {t.platform.canvas.shortcuts.activeBadge}
            </span>
          )}
        </div>
        {tool.description && (
          <span className="mt-0.5 font-grotesk text-[11px] leading-snug text-[color:var(--text-muted)]">
            {tool.description}
          </span>
        )}
      </div>

      {tool.shortcut && (
        <div className="mt-px flex shrink-0 items-center gap-1">
          {renderShortcut(tool.shortcut).map((token) => (
            <kbd
              key={token}
              className="flex h-5 min-w-[20px] items-center justify-center rounded-md border border-[color:var(--border-strong)] bg-[color:var(--surface-overlay)] px-1.5 font-mono-ui text-[10px] font-medium text-[color:var(--text)]"
            >
              {token}
            </kbd>
          ))}
        </div>
      )}
    </li>
  );
};
