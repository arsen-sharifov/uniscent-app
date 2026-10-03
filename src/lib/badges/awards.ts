import type { IAwardBadgeOptions, TBadgeId } from '@interfaces';
import { addUserBadge } from '@api/client';
import { event } from '@/lib/events';
import { resolveEarnedBadges } from '@/lib/utils';

import { useBadgeStore } from './stores';

let saveQueue = Promise.resolve();

const persist = (id: TBadgeId) => {
  saveQueue = saveQueue
    .then(() => addUserBadge(id))
    .catch((error: unknown) => {
      event.error(error, { toast: false, context: 'badges.award' });
    });
};

export const hydrateBadges = (stored: unknown) => useBadgeStore.getState().hydrate(resolveEarnedBadges(stored));

export const awardBadge = (id: TBadgeId, options?: IAwardBadgeOptions) => {
  const { earned, earn } = useBadgeStore.getState();
  if (earned?.includes(id)) return;

  if (earned) earn({ id, announce: !options?.quiet });
  persist(id);
};
