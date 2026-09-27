'use client';

import { clsx } from 'clsx';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { IToolGroup, IToolItem } from '@interfaces';

import { Skeleton } from '@/components/Skeleton';
import { useTranslations } from '@/i18n';

import { TOOLTIP_DELAY_MS } from './consts';
import { ExportMenu, HelpMenu, ShortcutsHelp, ToolButton, ToolbarSkeleton, ToolTooltip } from './fragments';
import { useToolbarShortcuts } from './hooks';
import { isTypingTarget } from './utils';

interface IToolHoverState {
  tool: IToolItem;
  top: number;
}

const noop = () => {};

export interface IToolbarProps {
  threadId?: string;
  threadName?: string;
  groups?: IToolGroup[];
  pendingGroups?: IToolGroup[];
  activeTool?: string;
  onToolClick?: (id: string) => void;
}

export const Toolbar = ({
  groups = [],
  pendingGroups = [],
  activeTool,
  onToolClick,
  threadId,
  threadName,
}: IToolbarProps) => {
  useToolbarShortcuts();

  const t = useTranslations();
  const pending = pendingGroups.length > 0;
  const [hover, setHover] = useState<IToolHoverState | null>(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const showTimerRef = useRef<number | null>(null);
  const visibleRef = useRef(false);

  const clearShowTimer = useCallback(() => {
    if (showTimerRef.current === null) return;
    window.clearTimeout(showTimerRef.current);
    showTimerRef.current = null;
  }, []);

  useEffect(() => clearShowTimer, [clearShowTimer]);

  const showHover = useCallback(
    (next: IToolHoverState) => {
      clearShowTimer();

      if (visibleRef.current) {
        setHover(next);

        return;
      }

      showTimerRef.current = window.setTimeout(() => {
        visibleRef.current = true;
        setHover(next);
      }, TOOLTIP_DELAY_MS);
    },
    [clearShowTimer],
  );

  const hideHover = useCallback(() => {
    clearShowTimer();
    visibleRef.current = false;
    setHover(null);
  }, [clearShowTimer]);

  const handleToolEnter = useCallback(
    (rect: DOMRect, tool: IToolItem) => {
      showHover({ tool, top: rect.top + rect.height / 2 });
    },
    [showHover],
  );

  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key !== '?') return;
      if (isTypingTarget(event.target)) return;

      event.preventDefault();
      setShortcutsOpen((prev) => !prev);
    };

    window.addEventListener('keydown', onKey);

    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      <aside
        data-tour="toolbar"
        aria-label={t.platform.canvas.tools.ariaLabel}
        onMouseLeave={hideHover}
        className="app-glass relative z-40 flex h-full w-14 shrink-0 flex-col items-stretch rounded-2xl border border-[color:var(--border)] transition-[background-color,border-color] duration-200 ease-out select-none motion-reduce:transition-none"
      >
        {pending && <ToolbarSkeleton groups={pendingGroups} />}

        <div hidden={pending} className="flex flex-1 flex-col items-stretch px-2 pt-1">
          {groups.map((group, index) => (
            <fieldset
              key={group.id}
              aria-label={group.label}
              className={clsx(
                'flex min-w-0 flex-col items-stretch gap-1 py-2',
                index > 0 && 'border-t border-[color:var(--border)]',
              )}
            >
              {group.tools.map((tool) => (
                <ToolButton
                  key={tool.id}
                  tool={tool}
                  active={tool.id === activeTool}
                  onClick={onToolClick ?? noop}
                  onPointerEnter={handleToolEnter}
                  onPointerLeave={hideHover}
                />
              ))}
            </fieldset>
          ))}
        </div>

        {!pending && threadId && threadName && (
          <div className="mx-2 border-t border-[color:var(--border)] py-2" onPointerEnter={hideHover}>
            <ExportMenu key={threadId} threadId={threadId} threadName={threadName} />
          </div>
        )}

        <div onPointerEnter={hideHover} className="mx-2 flex justify-center border-t border-[color:var(--border)] py-2">
          {pending ? (
            <span aria-hidden className="flex h-9 w-9 items-center justify-center">
              <Skeleton className="h-[17px] w-[17px]" />
            </span>
          ) : (
            <HelpMenu onShortcuts={() => setShortcutsOpen(true)} />
          )}
        </div>
      </aside>

      <ToolTooltip tool={hover?.tool ?? null} top={hover?.top ?? -1000} visible={Boolean(hover)} />

      <ShortcutsHelp
        open={shortcutsOpen}
        groups={groups}
        activeTool={activeTool}
        onClose={() => setShortcutsOpen(false)}
      />
    </>
  );
};
