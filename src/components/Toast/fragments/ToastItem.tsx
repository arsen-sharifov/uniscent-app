'use client';

import { clsx } from 'clsx';
import { X } from 'lucide-react';
import { type TransitionEvent, useEffect, useRef, useState } from 'react';

import type { TToast } from '@interfaces';
import { TOAST_EXIT_FALLBACK_MS } from '@constants';
import { useTranslations } from '@/i18n';

import { TOAST_VISUAL_BY_TYPE } from '../consts';

interface IToastItemProps {
  toast: TToast;
  onDismiss: (id: string) => void;
}

export const ToastItem = ({ toast, onDismiss }: IToastItemProps) => {
  const t = useTranslations();
  const [leaving, setLeaving] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const remainingRef = useRef(toast.duration);
  const startedAtRef = useRef(0);
  const pauseCountRef = useRef(0);

  const isError = 'errorCategory' in toast;
  const visual = TOAST_VISUAL_BY_TYPE[isError ? 'error' : toast.type];
  const Icon = visual.icon;

  useEffect(() => {
    remainingRef.current = toast.duration;
    startedAtRef.current = Date.now();
    timerRef.current = setTimeout(() => setLeaving(true), toast.duration);

    return () => clearTimeout(timerRef.current);
  }, [toast.duration]);

  useEffect(() => {
    if (!leaving) return;

    const fallback = setTimeout(() => onDismiss(toast.id), TOAST_EXIT_FALLBACK_MS);

    return () => clearTimeout(fallback);
  }, [leaving, onDismiss, toast.id]);

  const pauseTimer = () => {
    pauseCountRef.current += 1;
    if (pauseCountRef.current > 1) return;

    clearTimeout(timerRef.current);
    remainingRef.current -= Date.now() - startedAtRef.current;
  };

  const resumeTimer = () => {
    pauseCountRef.current = Math.max(0, pauseCountRef.current - 1);
    if (pauseCountRef.current > 0) return;

    startedAtRef.current = Date.now();
    timerRef.current = setTimeout(() => setLeaving(true), remainingRef.current);
  };

  const handleTransitionEnd = (transitionEvent: TransitionEvent<HTMLDivElement>) => {
    if (leaving && transitionEvent.target === transitionEvent.currentTarget) {
      onDismiss(toast.id);
    }
  };

  return (
    <div
      role={isError ? 'alert' : 'status'}
      aria-live={isError ? 'assertive' : 'polite'}
      onMouseEnter={pauseTimer}
      onMouseLeave={resumeTimer}
      onFocus={pauseTimer}
      onBlur={resumeTimer}
      onTransitionEnd={handleTransitionEnd}
      className={clsx(
        'relative flex w-full items-start gap-2.5 overflow-hidden rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] py-3 pr-3 pl-4 shadow-[var(--shadow-modal)] transition-[translate,opacity] duration-200 ease-out motion-reduce:transition-none starting:translate-x-4 starting:opacity-0',
        leaving ? 'pointer-events-none translate-x-4 opacity-0' : 'pointer-events-auto translate-x-0 opacity-100',
      )}
    >
      <span
        aria-hidden
        className={clsx('pointer-events-none absolute inset-y-0 left-0 w-[3px]', visual.spineClassName)}
      />

      <span aria-hidden className="flex h-5 shrink-0 items-center">
        <Icon className={clsx('h-4 w-4 translate-y-px', visual.iconClassName)} strokeWidth={2.25} />
      </span>

      <div className="min-w-0 flex-1">
        {toast.title && (
          <p className="font-grotesk text-sm leading-5 font-semibold text-[color:var(--text-strong)]">{toast.title}</p>
        )}
        <p
          className={clsx(
            'font-grotesk text-[13px] leading-5 break-words',
            toast.title
              ? 'mt-0.5 font-normal text-[color:var(--text-muted)]'
              : 'font-medium text-[color:var(--text-strong)]',
          )}
        >
          {isError ? t.common.errors[toast.errorCategory] : toast.message}
        </p>
      </div>

      <button
        type="button"
        onClick={() => setLeaving(true)}
        aria-label={t.common.close}
        className="-mt-0.5 -mr-1 shrink-0 cursor-pointer rounded-lg p-1 text-[color:var(--text-muted)] transition-colors duration-200 ease-out hover:bg-[color:var(--surface-overlay)] hover:text-[color:var(--text-strong)] focus-visible:ring-2 focus-visible:ring-[color:var(--ring-focus)] focus-visible:outline-none active:bg-[color:var(--border)] motion-reduce:transition-none"
      >
        <X className="h-3.5 w-3.5" strokeWidth={2.25} />
      </button>
    </div>
  );
};
