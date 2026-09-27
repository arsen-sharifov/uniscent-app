'use client';

import { useRef } from 'react';

import type { TTourHint } from '@interfaces';
import { SPOTLIGHT_RADIUS, TOUR_HINT_WIDTH } from '@constants';
import { Mascot } from '@/components/Mascot';
import { useTranslations } from '@/i18n';
import { useOnboardingStore } from '@/lib/onboarding';

import { TourButton } from './TourButton';
import { useCardPosition, useTourGeometry } from '../hooks';
import { inflate } from '../utils';

interface ITourHintProps {
  hint: TTourHint;
}

export const TourHint = ({ hint }: ITourHintProps) => {
  const t = useTranslations();
  const onboarding = t.platform.onboarding;
  const openPicker = useOnboardingStore((state) => state.openPicker);
  const dismissHint = useOnboardingStore((state) => state.dismissHint);

  const cardRef = useRef<HTMLDialogElement>(null);
  const { rect, blocked } = useTourGeometry('toolbarHelp', '');
  const { top, left, measured } = useCardPosition(cardRef, rect, 'left');
  const ring = rect && !blocked ? inflate(rect) : null;
  const copy = onboarding.continueHint[hint];

  return (
    <>
      {ring && (
        <span
          aria-hidden
          style={{
            top: ring.top,
            left: ring.left,
            width: ring.width,
            height: ring.height,
            borderRadius: SPOTLIGHT_RADIUS,
          }}
          className="pointer-events-none fixed z-70 animate-hint-ring border-2 border-[color:var(--accent)] motion-reduce:animate-none"
        />
      )}

      <dialog
        open
        ref={cardRef}
        data-tour-hint
        aria-label={copy.title}
        style={{ top, left, visibility: measured && ring ? undefined : 'hidden' }}
        className="fixed inset-auto z-70 m-0 flex items-end gap-1 border-0 bg-transparent p-0 text-inherit"
      >
        <div
          className="app-panel rounded-2xl border border-[color:var(--border)] px-4 py-4 shadow-[var(--shadow-modal)]"
          style={{ width: TOUR_HINT_WIDTH }}
        >
          <h3 className="font-grotesk text-[15px] leading-snug font-semibold tracking-tight text-[color:var(--text-strong)]">
            {copy.title}
          </h3>

          <p className="mt-1.5 font-grotesk text-[13px] leading-relaxed text-pretty text-[color:var(--text-muted)]">
            {copy.body}
          </p>

          <div className="mt-3.5 flex justify-end gap-2">
            <TourButton variant="secondary" onClick={dismissHint}>
              {onboarding.continueHint.dismiss}
            </TourButton>
            <TourButton variant="primary" onClick={openPicker}>
              {onboarding.continueHint.open}
            </TourButton>
          </div>
        </div>

        <Mascot pose={hint === 'afterTour' ? 'cheer' : 'point'} label={onboarding.nodiAlt} className="-mb-2" />
      </dialog>
    </>
  );
};
