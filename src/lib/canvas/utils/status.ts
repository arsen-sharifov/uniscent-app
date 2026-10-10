import type { Edge, Node } from '@xyflow/react';

import {
  ECanvasNodeType,
  type ICanvasNodeData,
  type IReferenceNodeData,
  type TEdgeTone,
  type TEffectiveStatus,
} from '@interfaces';

import { groupBy } from '@/lib/utils';

import { EDGE_TONE_SEVERITY } from '../consts';

export const isCanvasNodeData = (data: Record<string, unknown>): data is ICanvasNodeData =>
  typeof data.label === 'string' &&
  (data.status === null || data.status === 'valid' || data.status === 'invalid') &&
  Array.isArray(data.comments);

export const isReferenceNodeData = (data: Record<string, unknown>): data is IReferenceNodeData =>
  typeof data.label === 'string' &&
  typeof data.sourceNodeId === 'string' &&
  typeof data.sourceNodeLabel === 'string' &&
  typeof data.sourceThreadId === 'string' &&
  typeof data.sourceThreadName === 'string' &&
  typeof data.sourceWorkspaceId === 'string' &&
  typeof data.sourceWorkspaceName === 'string';

export const isAffected = (status: TEffectiveStatus | undefined): boolean =>
  status === 'tainted' || status === 'tainted-valid';

const isMarkedValid = (status: TEffectiveStatus | undefined): boolean => status === 'valid' || isAffected(status);

const isAnswerNode = (node: Node): boolean =>
  node.type === ECanvasNodeType.Canvas && isCanvasNodeData(node.data) && node.data.isAnswer;

const collectReachableNodeIds = (
  frontier: string[],
  nextIds: (id: string) => string[],
  reachableIds = new Set(frontier),
): Set<string> => {
  const nextFrontier = [...new Set(frontier.flatMap(nextIds))].filter((id) => !reachableIds.has(id));
  if (nextFrontier.length === 0) return reachableIds;

  nextFrontier.forEach((id) => reachableIds.add(id));

  return collectReachableNodeIds(nextFrontier, nextIds, reachableIds);
};

export const resolveEdgeTone = (
  sourceStatus: TEffectiveStatus | undefined,
  targetStatus: TEffectiveStatus | undefined,
): TEdgeTone => {
  if (sourceStatus === 'invalid') {
    if (targetStatus === 'valid' || targetStatus === 'tainted-valid') return 'tainted';

    return 'invalid';
  }
  if (sourceStatus === 'tainted' || sourceStatus === 'tainted-valid') return 'tainted';
  if (sourceStatus === 'valid' && targetStatus === 'invalid') return 'invalid';
  if (sourceStatus === 'valid' && isMarkedValid(targetStatus)) return 'valid';

  return 'default';
};

export const pickStrongerTone = (first: TEdgeTone, second: TEdgeTone): TEdgeTone =>
  EDGE_TONE_SEVERITY[first] >= EDGE_TONE_SEVERITY[second] ? first : second;

export const computeEffectiveStatuses = (nodes: Node[], edges: Edge[]): Map<string, TEffectiveStatus> => {
  const result = new Map<string, TEffectiveStatus>();

  nodes.forEach((node) => {
    if (node.type === ECanvasNodeType.Question) {
      result.set(node.id, 'valid');

      return;
    }
    if (node.type !== ECanvasNodeType.Canvas) return;
    if (!isCanvasNodeData(node.data)) return;

    result.set(node.id, node.data.status ?? (node.data.isAnswer ? 'valid' : null));
  });

  const edgesBySource = groupBy(edges, (edge) => edge.source);
  const refutedIds = [...result.entries()].filter(([, status]) => status === 'invalid').map(([id]) => id);
  const reached = collectReachableNodeIds(refutedIds, (id) =>
    (edgesBySource.get(id) ?? []).map((edge) => edge.target).filter((target) => result.get(target) !== 'invalid'),
  );

  refutedIds.forEach((id) => reached.delete(id));
  reached.forEach((id) => result.set(id, result.get(id) === 'valid' ? 'tainted-valid' : 'tainted'));

  return result;
};

const collectAnswerPathEdgeIds = (
  nodes: Node[],
  edges: Edge[],
  statuses: Map<string, TEffectiveStatus>,
): Set<string> => {
  const isValid = (id: string) => statuses.get(id) === 'valid';
  const questionIds = nodes.filter((node) => node.type === ECanvasNodeType.Question).map((node) => node.id);
  const resolvedAnswerIds = nodes.filter((node) => isAnswerNode(node) && isValid(node.id)).map((node) => node.id);
  if (resolvedAnswerIds.length === 0) return new Set();

  const edgesBySource = groupBy(edges, (edge) => edge.source);
  const edgesByTarget = groupBy(edges, (edge) => edge.target);
  const fromQuestion = collectReachableNodeIds(questionIds, (id) =>
    (edgesBySource.get(id) ?? []).map((edge) => edge.target).filter(isValid),
  );
  const toAnswer = collectReachableNodeIds(resolvedAnswerIds, (id) =>
    (edgesByTarget.get(id) ?? []).map((edge) => edge.source).filter(isValid),
  );

  return new Set(
    edges.filter((edge) => fromQuestion.has(edge.source) && toAnswer.has(edge.target)).map((edge) => edge.id),
  );
};

export const computeEdgeTones = (
  nodes: Node[],
  edges: Edge[],
  statuses: Map<string, TEffectiveStatus>,
): Map<string, TEdgeTone> => {
  const answerPathIds = collectAnswerPathEdgeIds(nodes, edges, statuses);
  const falseAnswerIds = new Set(
    nodes.filter((node) => isAnswerNode(node) && statuses.get(node.id) !== 'valid').map((node) => node.id),
  );

  const toneOf = (edge: Edge): TEdgeTone => {
    if (answerPathIds.has(edge.id)) return 'answer';
    if (falseAnswerIds.has(edge.target)) return 'invalid';

    return resolveEdgeTone(statuses.get(edge.source), statuses.get(edge.target));
  };

  return new Map(edges.map((edge) => [edge.id, toneOf(edge)]));
};

export const isThreadResolved = (nodes: Node[], edges: Edge[]): boolean => {
  const answerIds = nodes.filter(isAnswerNode).map((node) => node.id);
  if (answerIds.length === 0) return false;

  const statusById = computeEffectiveStatuses(nodes, edges);

  return answerIds.some((id) => statusById.get(id) === 'valid');
};
