'use client';

import { useEffect, useRef } from 'react';

import { ONBOARDING_BADGE_ID } from '@constants';
import { getCurrentUserId, getOnboarding, upsertOnboarding } from '@api/client';
import { awardBadge } from '@/lib/badges';
import { event } from '@/lib/events';
import { hasEarnedBadge, useOnboardingStore } from '@/lib/onboarding';

export const useOnboarding = () => {
  const hydrate = useOnboardingStore((state) => state.hydrate);
  const loaded = useOnboardingStore((state) => state.loaded);
  const offerAnswered = useOnboardingStore((state) => state.offerAnswered);
  const completedGuides = useOnboardingStore((state) => state.completedGuides);

  const syncedRef = useRef(false);
  const persistedRef = useRef<string | null>(null);
  const awardedRef = useRef(false);

  useEffect(() => {
    Promise.all([getCurrentUserId(), getOnboarding()])
      .then(([userId, progress]) => {
        syncedRef.current = true;
        hydrate(userId, progress);
      })
      .catch((error: unknown) => {
        event.error(error, { toast: false, context: 'onboarding.load' });
        hydrate(null, { offerAnswered: true, completedGuides: [] });
      });
  }, [hydrate]);

  useEffect(() => {
    if (!loaded || !syncedRef.current) return;

    const signature = JSON.stringify([offerAnswered, completedGuides]);
    const previous = persistedRef.current;
    persistedRef.current = signature;

    if (previous === null || previous === signature) return;

    upsertOnboarding({ offerAnswered, completedGuides }).catch((error: unknown) =>
      event.error(error, { toast: false, context: 'onboarding.save' }),
    );
  }, [loaded, offerAnswered, completedGuides]);

  useEffect(() => {
    if (!loaded || !syncedRef.current || awardedRef.current || !hasEarnedBadge(completedGuides)) return;

    awardedRef.current = true;

    awardBadge(ONBOARDING_BADGE_ID, { quiet: true });
  }, [loaded, completedGuides]);
};
