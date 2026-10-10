'use client';

import { useEffect, useState } from 'react';

import type { ITourGeometry, ITourGeometryState, ITrackedGeometry, TTourAnchor } from '@interfaces';
import { LOST_TARGET_MS } from '@constants';
import { parseAnchors, readTourGeometry } from '@/lib/onboarding';

import { EMPTY_GEOMETRY, INITIAL_GEOMETRY_STATE } from '../consts';
import { sameGeometry } from '../utils';

export const useTourGeometry = (anchorKey: string, openKey: string): ITrackedGeometry => {
  const [tracked, setTracked] = useState<ITourGeometryState>(INITIAL_GEOMETRY_STATE);

  useEffect(() => {
    const order = parseAnchors(anchorKey);
    const openAnchors = parseAnchors(openKey);
    const rank = (anchor: TTourAnchor | null) => (anchor === null ? order.length : order.indexOf(anchor));

    let animationFrameId = 0;
    let shown: ITourGeometry = EMPTY_GEOMETRY;
    let wasLost = false;
    let fadingSince = 0;
    let missingSince = 0;

    const update = () => {
      const next = readTourGeometry(order, openAnchors);
      const now = performance.now();
      const settled = shown.anchor !== null;
      const demoted = settled && rank(next.anchor) > rank(shown.anchor);
      const faded = demoted || (settled && next.blocked !== null && shown.blocked === null);

      missingSince = next.rect === null && anchorKey !== '' ? missingSince || now : 0;

      const lost = missingSince > 0 && now - missingSince >= LOST_TARGET_MS;

      if (faded) fadingSince ||= now;
      if (faded && !lost && now - fadingSince < LOST_TARGET_MS) return;

      fadingSince = 0;
      if (sameGeometry(shown, next) && lost === wasLost) return;

      shown = next;
      wasLost = lost;
      setTracked((previous) => ({ ...next, key: anchorKey, lost, lastRect: next.rect ?? previous.lastRect }));
    };

    const track = () => {
      update();
      animationFrameId = requestAnimationFrame(track);
    };

    animationFrameId = requestAnimationFrame(track);

    return () => cancelAnimationFrame(animationFrameId);
  }, [anchorKey, openKey]);

  return tracked.key === anchorKey ? tracked : { ...EMPTY_GEOMETRY, lastRect: tracked.lastRect, lost: false };
};
