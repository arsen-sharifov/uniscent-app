import type { Edge } from '@xyflow/react';

import {
  ECanvasNodeType,
  type IHeroClaim,
  type IHeroEdge,
  type TCanvasNode,
  type TEdgeTone,
  type TEffectiveStatus,
  type THeroTone,
} from '@interfaces';

import { computeEdgeTones as computeCanvasEdgeTones, computeEffectiveStatuses, isAffected } from '@/lib/canvas/utils';
import { groupBy } from '@/lib/utils';

const toCanvasNodes = (claims: IHeroClaim[], refutedIds: ReadonlySet<string>): TCanvasNode[] =>
  claims.map((claim) => ({
    id: claim.id,
    type: claim.kind === 'question' ? ECanvasNodeType.Question : ECanvasNodeType.Canvas,
    position: { x: 0, y: 0 },
    data: {
      label: claim.code,
      status: refutedIds.has(claim.id) ? 'invalid' : claim.status,
      isAnswer: claim.isAnswer === true && !refutedIds.has(claim.id),
      comments: [],
    },
  }));

const toCanvasEdges = (edges: IHeroEdge[]): Edge[] =>
  edges.map((edge) => ({ id: edge.id, source: edge.source, target: edge.target }));

export const resolveClaimTone = (claim: IHeroClaim, status: TEffectiveStatus | undefined): THeroTone => {
  if (claim.kind === 'question') return 'question';
  if (status === 'invalid') return 'refuted';
  if (isAffected(status)) return 'affected';
  if (claim.isAnswer) return 'answer';

  return 'valid';
};

export const computeClaimStatuses = (
  claims: IHeroClaim[],
  edges: IHeroEdge[],
  refutedIds: ReadonlySet<string>,
): Map<string, TEffectiveStatus> => computeEffectiveStatuses(toCanvasNodes(claims, refutedIds), toCanvasEdges(edges));

export const computeEdgeTones = (
  claims: IHeroClaim[],
  edges: IHeroEdge[],
  refutedIds: ReadonlySet<string>,
  statuses: Map<string, TEffectiveStatus>,
): Map<string, TEdgeTone> => computeCanvasEdgeTones(toCanvasNodes(claims, refutedIds), toCanvasEdges(edges), statuses);

const walkDepths = (
  frontier: string[],
  depth: number,
  edgesBySource: Map<string, IHeroEdge[]>,
  depthById: Map<string, number>,
): Map<string, number> => {
  const targets = frontier.flatMap((id) => (edgesBySource.get(id) ?? []).map((edge) => edge.target));
  const next = [...new Set(targets.filter((target) => !depthById.has(target)))];
  if (next.length === 0) return depthById;

  next.forEach((target) => depthById.set(target, depth));

  return walkDepths(next, depth + 1, edgesBySource, depthById);
};

export const collectCascadeDepths = (edges: IHeroEdge[], refutedIds: ReadonlySet<string>): Map<string, number> => {
  const edgesBySource = groupBy(edges, (edge) => edge.source);
  const roots = [...refutedIds];
  const seeded = new Map(roots.map((id) => [id, 0]));

  return walkDepths(roots, 1, edgesBySource, seeded);
};
