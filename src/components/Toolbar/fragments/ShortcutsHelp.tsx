'use client';

import { clsx } from 'clsx';
import { Keyboard, X } from 'lucide-react';
import { useRef } from 'react';
import { createPortal } from 'react-dom';

import type { IToolGroup } from '@interfaces';
import { useEscapeKey, useFocusTrap } from '@hooks';
import { useTranslations } from '@/i18n';

import { ICON_STROKE } from '../consts';
import { renderShortcut } from '../utils';

interface IShortcutsHelpProps {
  open: boolean;
  groups: IToolGroup[];
  activeTool?: string;
  onClose: () => void;
}

export const ShortcutsHelp = ({ open, groups, activeTool, onClose }: IShortcutsHelpProps) => {
  const t = useTranslations();
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEscapeKey(onClose, open);
  useFocusTrap(dialogRef, open);

  if (!open || typeof window === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
      <button
        type="button"
        tabIndex={-1}
        aria-label={t.common.close}
        onClick={onClose}
        className="absolute inset-0 bg-[color:var(--scrim)] backdrop-blur-sm"
      />

      <dialog
        open
        data-tour="shortcutsSheet"
        ref={dialogRef}
        aria-modal="true"
        aria-label={t.platform.canvas.shortcuts.ariaLabel}
        className={clsx(
          'relative w-full max-w-[640px] overflow-hidden rounded-xl',
          'app-panel border border-[color:var(--border)]',
          'text-[color:var(--text)] shadow-[var(--shadow-modal)]',
          'animate-rise-up motion-reduce:animate-none',
        )}
      >
        <div className="flex items-center justify-between gap-3 border-b border-[color:var(--border)] px-5 py-3.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[color:var(--accent-soft)] text-[color:var(--accent-text)]">
              <Keyboard className="h-3.5 w-3.5" strokeWidth={ICON_STROKE} />
            </span>
            <div className="flex min-w-0 flex-col gap-0.5 leading-tight">
              <span className="truncate font-grotesk text-sm font-semibold tracking-tight text-[color:var(--text-strong)]">
                {t.platform.canvas.shortcuts.title}
              </span>
              <span className="truncate font-mono-ui text-[10px] tracking-[0.06em] text-[color:var(--text-muted)]">
                {t.platform.canvas.shortcuts.subtitle}
              </span>
            </div>
          </div>
          <button
            type="button"
            autoFocus
            data-tour="shortcutsClose"
            onClick={onClose}
            className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-lg text-[color:var(--text-subtle)] transition-[background-color,color,box-shadow,transform] duration-150 ease-out outline-none hover:bg-[color:var(--surface-overlay)] hover:text-[color:var(--text-strong)] focus-visible:ring-2 focus-visible:ring-[color:var(--ring-focus)] active:scale-[0.94] motion-reduce:transition-none"
            aria-label={t.platform.canvas.shortcuts.closeAriaLabel}
          >
            <X className="h-3.5 w-3.5" strokeWidth={ICON_STROKE} />
          </button>
        </div>

        <div className="grid max-h-[64vh] grid-cols-1 gap-x-6 overflow-y-auto px-5 py-4 sm:grid-cols-2">
          {groups.map((group) => (
            <section key={group.id} className="mb-4 break-inside-avoid">
              {group.label && (
                <div className="mb-2 flex items-center gap-2">
                  <span className="font-mono-ui text-[10px] font-bold tracking-[0.14em] text-[color:var(--text-label)] uppercase">
                    {group.label}
                  </span>
                  <span className="h-px flex-1 bg-[color:var(--border)]" />
                </div>
              )}
              <ul className="space-y-1">
                {group.tools.map((tool) => {
                  const isActive = tool.id === activeTool;
                  const Icon = tool.icon;

                  return (
                    <li
                      key={tool.id}
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
                })}
              </ul>
            </section>
          ))}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-[color:var(--border)] bg-[color:var(--surface-overlay)] px-5 py-2.5">
          <span className="truncate font-mono-ui text-[10px] tracking-[0.04em] text-[color:var(--text-muted)]">
            {t.platform.canvas.shortcuts.footerHint}
          </span>
          <span className="flex shrink-0 items-center gap-1.5 font-mono-ui text-[10px] tracking-[0.04em] text-[color:var(--text-muted)]">
            <kbd className="flex h-5 items-center justify-center rounded-md border border-[color:var(--border-strong)] bg-[color:var(--surface-overlay)] px-1.5 font-mono-ui text-[10px] font-medium text-[color:var(--text)]">
              Esc
            </kbd>
            {t.platform.canvas.shortcuts.closeHint}
          </span>
        </div>
      </dialog>
    </div>,
    document.body,
  );
};
