'use client';

import { clsx } from 'clsx';
import { RotateCcw } from 'lucide-react';
import { useId } from 'react';

import type { ITourSnapshot } from '@interfaces';

import { useTranslations } from '@/i18n';
import { BASE_GUIDE_ID, GUIDES, findUnmetRequirement, useOnboardingStore } from '@/lib/onboarding';

import { NodiHeading } from './NodiHeading';
import { TourDialog } from './TourDialog';
import { GUIDE_STATUS_ICONS } from '../consts';
import { resolveGuideStatus } from '../utils';

interface IGuidePickerProps {
  snapshot: ITourSnapshot;
}

export const GuidePicker = ({ snapshot }: IGuidePickerProps) => {
  const t = useTranslations();
  const titleId = useId();
  const open = useOnboardingStore((state) => state.pickerOpen);
  const closePicker = useOnboardingStore((state) => state.closePicker);
  const startGuide = useOnboardingStore((state) => state.startGuide);
  const completedGuides = useOnboardingStore((state) => state.completedGuides);

  const completed = new Set(completedGuides);
  const baseDone = completed.has(BASE_GUIDE_ID);

  return (
    <TourDialog open={open} onClose={closePicker} width="max-w-lg" labelledBy={titleId}>
      <NodiHeading title={t.platform.onboarding.pickerTitle} titleId={titleId} pose={baseDone ? 'idle' : 'point'} />

      <p className="mt-3 font-grotesk text-[13px] leading-relaxed text-pretty text-[color:var(--text-muted)]">
        {t.platform.onboarding.pickerBody}
      </p>

      <p className="mt-1 font-mono-ui text-[10.5px] tracking-[0.04em] text-[color:var(--text-label)] lowercase">
        {t('platform.onboarding.pickerProgress', { done: completed.size, total: GUIDES.length })}
      </p>

      <ul className="mt-4 flex flex-col gap-1.5">
        {GUIDES.map((guide) => {
          const isDone = completed.has(guide.id);
          const locked = guide.id !== BASE_GUIDE_ID && !baseDone;
          const unmet = locked ? null : findUnmetRequirement(guide, snapshot);
          const disabled = locked || unmet !== null;
          const hint = unmet ? t.platform.onboarding.hints[unmet.hintKey] : t.platform.onboarding.pickerLocked;
          const StatusIcon = GUIDE_STATUS_ICONS[resolveGuideStatus(isDone, disabled)];

          return (
            <li key={guide.id}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => startGuide(guide.id)}
                title={disabled ? hint : undefined}
                className={clsx(
                  'group flex w-full cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-[background-color,border-color] duration-200 ease-out focus-visible:ring-2 focus-visible:ring-[color:var(--ring-focus)] focus-visible:outline-none disabled:cursor-not-allowed motion-reduce:transition-none',
                  isDone
                    ? 'border-[color:var(--border-active)] bg-[color:var(--accent-soft)]'
                    : 'border-[color:var(--border)] hover:bg-[color:var(--surface-overlay)]',
                  disabled && 'opacity-45 hover:bg-transparent',
                )}
              >
                <span
                  aria-hidden
                  className={clsx(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                    isDone
                      ? 'bg-[color:var(--accent)] text-[color:var(--on-accent)]'
                      : 'border border-[color:var(--border-strong)] text-[color:var(--text-subtle)]',
                  )}
                >
                  <StatusIcon className="h-3.5 w-3.5" strokeWidth={2.1} />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block font-grotesk text-[13px] font-semibold tracking-tight text-[color:var(--text-strong)]">
                    {t.platform.onboarding.guides[`${guide.id}Title`]}
                  </span>
                  <span className="block font-grotesk text-[11.5px] leading-snug text-[color:var(--text-muted)]">
                    {disabled ? hint : t.platform.onboarding.guides[`${guide.id}Summary`]}
                  </span>
                </span>

                <span className="shrink-0 font-mono-ui text-[9.5px] tracking-[0.1em] text-[color:var(--text-subtle)] lowercase">
                  {isDone ? (
                    <RotateCcw
                      aria-label={t.platform.onboarding.pickerReplay}
                      className="h-3.5 w-3.5"
                      strokeWidth={1.9}
                    />
                  ) : (
                    t.platform.onboarding.pickerStart
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </TourDialog>
  );
};
