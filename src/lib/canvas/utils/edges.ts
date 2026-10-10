import { type Edge, type XYPosition, getBezierPath } from '@xyflow/react';

import type { ICanvasEdgeGeometry, THandleId } from '@interfaces';

import { ARROW_LENGTH, EDGE_CURVATURE, POSITION_BY_HANDLE, SIDE_NORMALS } from '../consts';

export const offsetAlongSide = (point: XYPosition, side: THandleId, amount: number): XYPosition => ({
  x: point.x + SIDE_NORMALS[side].x * amount,
  y: point.y + SIDE_NORMALS[side].y * amount,
});

export const getCanvasEdgePath = ({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourceSide,
  targetSide,
  bidirectional,
}: ICanvasEdgeGeometry): string => {
  const source = { x: sourceX, y: sourceY };
  const target = offsetAlongSide({ x: targetX, y: targetY }, targetSide, ARROW_LENGTH);
  const start = bidirectional ? offsetAlongSide(source, sourceSide, ARROW_LENGTH) : source;

  return getBezierPath({
    sourceX: start.x,
    sourceY: start.y,
    targetX: target.x,
    targetY: target.y,
    sourcePosition: POSITION_BY_HANDLE[sourceSide],
    targetPosition: POSITION_BY_HANDLE[targetSide],
    curvature: EDGE_CURVATURE,
  })[0];
};

const linkedIdsByEdges = new WeakMap<readonly Edge[], ReadonlySet<string>>();

export const findLinkedNodeIds = (edges: readonly Edge[]): ReadonlySet<string> => {
  const cached = linkedIdsByEdges.get(edges);
  if (cached) return cached;

  const linked = new Set(edges.flatMap((edge) => [edge.source, edge.target]));
  linkedIdsByEdges.set(edges, linked);

  return linked;
};

export const withReverseEdgeIds = (edges: readonly Edge[], ids: readonly string[]): string[] => {
  const picked = edges.filter((edge) => ids.includes(edge.id));
  const reverseIds = edges
    .filter((edge) => !ids.includes(edge.id))
    .filter((edge) => picked.some((pick) => pick.source === edge.target && pick.target === edge.source))
    .map((edge) => edge.id);

  return [...ids, ...reverseIds];
};
