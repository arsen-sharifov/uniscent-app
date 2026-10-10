'use client';

import { useTranslations } from '@/i18n';

import {
  COLLABORATION_VIGNETTE_EDGES,
  COLLABORATION_VIGNETTE_INTERVAL_MS,
  COLLABORATION_VIGNETTE_PHASES,
} from '../../consts';
import { useVignettePhase } from '../../hooks';
import { CanvasVignette } from '../CanvasVignette';
import { MiniNode } from '../MiniNode';

export const CollaborationVignette = () => {
  const t = useTranslations();
  const commentCount = useVignettePhase(COLLABORATION_VIGNETTE_PHASES, COLLABORATION_VIGNETTE_INTERVAL_MS) + 1;

  return (
    <CanvasVignette edges={COLLABORATION_VIGNETTE_EDGES} className="h-40">
      <MiniNode
        nodeId="cv-a"
        tone="valid"
        label={t.landing.product.vignettes.collaborationClaim}
        commentCount={commentCount}
        className="absolute top-4 left-4 w-32 sm:w-48"
      />
      <MiniNode
        nodeId="cv-b"
        tone="open"
        label={t.landing.product.vignettes.collaborationClaimB}
        className="absolute right-4 bottom-4 w-28 sm:w-44"
      />
      <span className="absolute top-4 right-4 flex -space-x-1.5">
        {['M', 'T'].map((initial) => (
          <span
            key={initial}
            className="flex h-6 w-6 items-center justify-center rounded-full bg-[color:var(--hero-card)] font-mono-ui text-[9px] font-bold text-[color:var(--hero-card-text)] ring-2 ring-[color:var(--hero-ground-deep)]"
          >
            {initial}
          </span>
        ))}
      </span>
      <span className="absolute bottom-4 left-4 rounded border border-[color:var(--hero-hairline-strong)] bg-[color:var(--hero-chip-strong)] px-1.5 py-px font-mono-ui text-[8.5px] font-bold tracking-[0.14em] text-[color:var(--hero-card-muted)] uppercase">
        {t.landing.product.vignettes.collaborationRole}
      </span>
    </CanvasVignette>
  );
};
