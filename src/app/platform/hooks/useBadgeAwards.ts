'use client';

import { useEffect } from 'react';

import type { IUserMetadata } from '@interfaces';
import { BADGES } from '@constants';
import { getUser } from '@api/client';
import { useTranslations } from '@/i18n';
import { hydrateBadges, useBadgeStore, watchCanvasBadges } from '@/lib/badges';
import { event } from '@/lib/events';

export const useBadgeAwards = () => {
  const t = useTranslations();

  useEffect(() => {
    getUser()
      .then(({ data }) => hydrateBadges((data.user?.user_metadata as IUserMetadata | undefined)?.badges))
      .catch((error: unknown) => event.error(error, { toast: false, context: 'badges.load' }));

    const unwatch = watchCanvasBadges();

    return () => {
      unwatch();
      useBadgeStore.getState().forget();
    };
  }, []);

  useEffect(
    () =>
      useBadgeStore.subscribe((state, previous) => {
        const award = state.lastAward;
        if (!award?.announce || award === previous.lastAward) return;

        const badge = BADGES.find((definition) => definition.id === award.id);
        if (!badge) return;

        event.success(t.platform.settings.profile.badges[badge.unlockKey], {
          title: t('platform.settings.profile.badgeEarned', {
            name: t.platform.settings.profile.badges[badge.labelKey],
          }),
        });
      }),
    [t],
  );
};
