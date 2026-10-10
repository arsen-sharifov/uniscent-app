'use client';

import { useId } from 'react';

import { Badge } from '@/components/Badge';
import { Mascot } from '@/components/Mascot';
import { useTranslations } from '@/i18n';
import { useOnboardingStore } from '@/lib/onboarding';

import { TourButton } from './TourButton';
import { TourDialog } from './TourDialog';
import { ONBOARDING_BADGE } from '../consts';

export const TourCelebration = () => {
  const t = useTranslations();
  const titleId = useId();
  const open = useOnboardingStore((state) => state.celebrating);
  const closeCelebration = useOnboardingStore((state) => state.closeCelebration);

  return (
    <TourDialog open={open} onClose={closeCelebration} width="max-w-md" labelledBy={titleId}>
      <div className="flex items-end gap-2">
        <Mascot pose="cheer" label={t.platform.onboarding.nodiAlt} />
        <h2
          id={titleId}
          className="mb-1.5 font-grotesk text-lg leading-tight font-semibold tracking-tight text-[color:var(--text-strong)]"
        >
          {t.platform.onboarding.celebrationTitle}
        </h2>
      </div>

      <p className="mt-3 font-grotesk text-[13px] leading-relaxed text-pretty text-[color:var(--text-muted)]">
        {t.platform.onboarding.celebrationBody}
      </p>

      {ONBOARDING_BADGE && (
        <div className="mt-4 w-28">
          <Badge
            icon={ONBOARDING_BADGE.icon}
            label={t.platform.settings.profile.badges[ONBOARDING_BADGE.labelKey]}
            unlock={t.platform.settings.profile.badges[ONBOARDING_BADGE.unlockKey]}
            earned
          />
        </div>
      )}

      <div className="mt-5 flex justify-end">
        <TourButton variant="primary" size="md" onClick={closeCelebration}>
          {t.platform.onboarding.celebrationClose}
        </TourButton>
      </div>
    </TourDialog>
  );
};
