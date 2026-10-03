'use client';

import { clsx } from 'clsx';
import { AlertCircle, CloudOff, Loader2, RotateCw } from 'lucide-react';

import type { ISaveState } from '@interfaces';

import { useTranslations } from '@/i18n';
import { discardFailed, retryFailed } from '@/lib/canvas';

import { ARIA_LABEL_KEY_BY_STATUS } from '../consts';

interface ISaveStatusProps {
  state: ISaveState;
}

export const SaveStatus = ({ state }: ISaveStatusProps) => {
  const t = useTranslations();

  if (state.status === 'idle' || state.status === 'saving' || state.status === 'saved') {
    return null;
  }

  return (
    <output
      role={state.status === 'error' ? 'alert' : undefined}
      aria-live={state.status === 'error' ? 'assertive' : 'polite'}
      aria-label={t.platform.canvas.save[ARIA_LABEL_KEY_BY_STATUS[state.status]]}
      className={clsx(
        'absolute bottom-3 left-3 z-30 flex max-w-[min(28rem,calc(100%-1.5rem))] flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border px-3 py-1.5 font-mono-ui text-[10.5px] tracking-[0.04em] lowercase transition-colors duration-200 select-none motion-reduce:transition-none',
        state.status === 'retrying' &&
          'pointer-events-none border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--text-subtle)] shadow-[var(--shadow-pip)]',
        state.status === 'offline' &&
          'pointer-events-none border-[color:var(--status-warning-border)] bg-[color:var(--status-warning-bg)] text-[color:var(--status-warning)] shadow-[var(--shadow-pip)]',
        state.status === 'error' &&
          'border-[color:var(--status-error-border)] bg-[color:var(--status-error-bg)] text-[color:var(--status-error)] shadow-[var(--shadow-card-hover)]',
      )}
    >
      {state.status === 'retrying' && (
        <>
          <Loader2 className="h-3 w-3 animate-spin motion-reduce:animate-none" strokeWidth={2.25} />
          <span>
            {t.platform.canvas.save.retrying}
            {state.retryAttempt > 0 && (
              <span className="ml-1 text-[color:var(--text-muted)]">{`· ${t('platform.canvas.save.retryAttempt', { n: state.retryAttempt })}`}</span>
            )}
          </span>
        </>
      )}

      {state.status === 'offline' && (
        <>
          <CloudOff className="h-3 w-3" strokeWidth={2.25} />
          <span>
            {t.platform.canvas.save.offline}
            {state.pendingCount > 0 && (
              <span className="ml-1 opacity-75">{`· ${t('platform.canvas.save.offlinePending', { count: state.pendingCount })}`}</span>
            )}
          </span>
        </>
      )}

      {state.status === 'error' && (
        <>
          <span className="flex items-center gap-1.5">
            <AlertCircle className="h-3 w-3" strokeWidth={2.25} />
            <span>
              {t.platform.canvas.save.errorTitle}
              {state.failedCount > 0 && (
                <span className="ml-1 opacity-70">{`· ${t('platform.canvas.save.errorChanges', { count: state.failedCount })}`}</span>
              )}
            </span>
          </span>

          <span className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={retryFailed}
              className="inline-flex items-center gap-1 rounded-full bg-[color:var(--status-error-soft)] px-2 py-0.5 transition-colors duration-150 hover:bg-[color:var(--status-error-border)] focus-visible:ring-2 focus-visible:ring-[color:var(--ring-focus)] focus-visible:outline-none motion-reduce:transition-none"
              aria-label={t.platform.canvas.save.retryAriaLabel}
            >
              <RotateCw className="h-2.5 w-2.5" strokeWidth={2.25} />
              {t.platform.canvas.save.retry}
            </button>

            <button
              type="button"
              onClick={discardFailed}
              className="inline-flex items-center rounded-full px-2 py-0.5 opacity-70 transition-[background-color,opacity] duration-150 hover:bg-[color:var(--status-error-soft)] hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-[color:var(--ring-focus)] focus-visible:outline-none motion-reduce:transition-none"
              aria-label={t.platform.canvas.save.discardAriaLabel}
            >
              {t.platform.canvas.save.discard}
            </button>
          </span>
        </>
      )}
    </output>
  );
};
