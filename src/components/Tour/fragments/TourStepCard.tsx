'use client';

import { clsx } from 'clsx';
import { X } from 'lucide-react';
import { type ReactNode, useRef } from 'react';

import type { IAnchorRect, ITourStep } from '@interfaces';
import { TOUR_CARD_WIDTH } from '@constants';
import { Mascot } from '@/components/Mascot';
import { useTranslations } from '@/i18n';

import { TourButton } from './TourButton';
import { SPEAKERS } from '../consts';
import { useCardPosition } from '../hooks';

interface ITourStepCardProps {
  step: ITourStep;
  rect?: IAnchorRect | null;
  lost?: boolean;
  settling?: boolean;
  blocked?: boolean;
  done?: boolean;
  index: number;
  total: number;
  busy?: boolean;
  actions?: ReactNode;
  onQuit: () => void;
  onNext?: () => void;
}

export const TourStepCard = ({
  step,
  rect = null,
  lost = false,
  settling = false,
  blocked = false,
  done = false,
  index,
  total,
  busy = false,
  actions,
  onQuit,
  onNext,
}: ITourStepCardProps) => {
  const t = useTranslations();
  const title = blocked ? t.platform.onboarding.blockedTitle : t.platform.onboarding.steps[step.copyKey].title;
  const cardRef = useRef<HTMLDialogElement>(null);
  const { top, left, measured } = useCardPosition(cardRef, rect, blocked ? 'bottom' : step.placement);

  const readStatus = () => {
    if (blocked) return { label: t.platform.onboarding.blockedStatus, tone: 'var(--status-warning)' };
    if (lost) return { label: t.platform.onboarding.stepLostTarget, tone: 'var(--status-warning)' };
    if (done) return { label: t.platform.onboarding.stepDone, tone: 'var(--accent-text)' };

    return { label: t.platform.onboarding.stepWaiting, tone: 'var(--text-muted)' };
  };

  const status = readStatus();
  const showStatus = blocked || lost || step.isDone !== undefined;
  const speaker = SPEAKERS[step.speaker ?? 'nodi'];
  const mirrored = step.speaker === 'ergo';

  return (
    <dialog
      open
      ref={cardRef}
      data-tour-card
      aria-label={title}
      style={{ top, left, visibility: measured && !settling ? undefined : 'hidden' }}
      className={clsx(
        'fixed inset-auto z-70 m-0 flex items-end gap-1 border-0 bg-transparent p-0 text-inherit',
        mirrored && 'flex-row-reverse',
      )}
    >
      <Mascot
        pose={lost || blocked ? 'think' : step.pose}
        character={step.speaker}
        label={t.platform.onboarding[speaker.alt]}
        className={clsx('-mb-2', mirrored && '-scale-x-100')}
      />

      <div
        className="app-panel relative rounded-2xl border border-[color:var(--border)] px-4 py-4 shadow-[var(--shadow-modal)]"
        style={{ width: TOUR_CARD_WIDTH }}
      >
        <button
          type="button"
          onClick={onQuit}
          aria-label={t.platform.onboarding.quit}
          title={t.platform.onboarding.quit}
          className="absolute top-3 right-3 cursor-pointer rounded-lg p-1 text-[color:var(--text-subtle)] transition-colors duration-200 ease-out hover:bg-[color:var(--surface-overlay)] hover:text-[color:var(--text-strong)] focus-visible:ring-2 focus-visible:ring-[color:var(--ring-focus)] focus-visible:outline-none motion-reduce:transition-none"
        >
          <X className="h-4 w-4" />
        </button>

        <p className="pr-8 font-mono-ui text-[11px] tracking-[0.12em] text-[color:var(--text-label)] lowercase">
          {step.speaker && (
            <>
              <span style={{ color: speaker.tone }} className="normal-case">
                {t.platform.onboarding[speaker.name]}
              </span>
              <span aria-hidden className="mx-1.5">
                /
              </span>
            </>
          )}
          {t('platform.onboarding.stepCounter', { index: index + 1, total })}
        </p>

        <h3 className="mt-2 font-grotesk text-[15.5px] leading-snug font-semibold tracking-tight text-[color:var(--text-strong)]">
          {title}
        </h3>

        <p className="mt-1.5 font-grotesk text-[13.5px] leading-relaxed text-pretty text-[color:var(--text-muted)]">
          {blocked ? t.platform.onboarding.blockedBody : t.platform.onboarding.steps[step.copyKey].body}
        </p>

        <div className="mt-4 h-[3px] overflow-hidden rounded-full bg-[color:var(--border-strong)]">
          <span
            aria-hidden
            style={{ width: `${((index + 1) / total) * 100}%` }}
            className="block h-full rounded-full bg-[color:var(--accent)] transition-[width] duration-300 ease-out motion-reduce:transition-none"
          />
        </div>

        <div className="mt-2.5 flex items-center gap-2">
          {showStatus && (
            <span
              style={{ color: status.tone }}
              className="inline-flex min-w-0 items-center gap-1.5 rounded-lg bg-[color:var(--surface-overlay)] px-2 py-1 font-mono-ui text-[10.5px] tracking-[0.06em] lowercase"
            >
              <span
                aria-hidden
                style={{ backgroundColor: status.tone }}
                className="h-1.5 w-1.5 shrink-0 rounded-full"
              />
              <span className="truncate">{status.label}</span>
            </span>
          )}

          {actions}

          {!actions && onNext && !blocked && (
            <TourButton variant="primary" onClick={onNext} disabled={busy} className="ml-auto shrink-0">
              {t.platform.onboarding.stepNext}
            </TourButton>
          )}
        </div>
      </div>
    </dialog>
  );
};
