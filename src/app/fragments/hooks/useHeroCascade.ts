'use client';

import { useEffect, useMemo, useState } from 'react';

import type { IHeroCascade, THeroPhase } from '@interfaces';

import {
  HERO_CLAIMS,
  HERO_CLAIMS_REPAIRED,
  HERO_EDGES,
  HERO_EDGES_REPAIRED,
  HERO_NEXT_PHASE,
  HERO_PHASE_DURATION_MS,
  HERO_SCRIPT_REFUTED,
} from '../consts';
import { collectCascadeDepths, computeClaimStatuses, computeEdgeTones } from '../utils';
import { useReducedMotion } from './useReducedMotion';

export const useHeroCascade = (): IHeroCascade => {
  const [scriptPhase, setScriptPhase] = useState<THeroPhase>('healthy');

  const reducedMotion = useReducedMotion();
  const phase = reducedMotion ? 'repaired' : scriptPhase;

  useEffect(() => {
    if (reducedMotion) return;

    const timer = setTimeout(() => setScriptPhase(HERO_NEXT_PHASE[scriptPhase]), HERO_PHASE_DURATION_MS[scriptPhase]);

    return () => clearTimeout(timer);
  }, [scriptPhase, reducedMotion]);

  const refutedIds = useMemo(() => new Set(HERO_SCRIPT_REFUTED[phase]), [phase]);

  const claims = phase === 'repaired' ? HERO_CLAIMS_REPAIRED : HERO_CLAIMS;
  const edges = phase === 'repaired' ? HERO_EDGES_REPAIRED : HERO_EDGES;

  const statuses = useMemo(() => computeClaimStatuses(claims, edges, refutedIds), [claims, edges, refutedIds]);
  const edgeTones = useMemo(
    () => computeEdgeTones(claims, edges, refutedIds, statuses),
    [claims, edges, refutedIds, statuses],
  );
  const depths = useMemo(() => collectCascadeDepths(edges, refutedIds), [edges, refutedIds]);

  return { phase, claims, edges, statuses, edgeTones, depths, refutedIds };
};
