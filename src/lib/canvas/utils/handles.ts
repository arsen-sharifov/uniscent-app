import type { Node, XYPosition } from '@xyflow/react';

import type { IHandlePair, IHandlePairWithDistance, IRect, THandleId } from '@interfaces';

import { DEFAULT_NODE_HEIGHT, DEFAULT_NODE_WIDTH, HANDLE_IDS } from '../consts';

export const isHandleId = (value: unknown): value is THandleId =>
  typeof value === 'string' && HANDLE_IDS.includes(value as THandleId);

export const getHandleAnchor = ({ x, y, width, height }: IRect, handleId: THandleId): XYPosition => {
  switch (handleId) {
    case 'top':
      return { x: x + width / 2, y };
    case 'right':
      return { x: x + width, y: y + height / 2 };
    case 'bottom':
      return { x: x + width / 2, y: y + height };
    case 'left':
      return { x, y: y + height / 2 };
  }
};

const toRect = (node: Node): IRect => ({
  x: node.position.x,
  y: node.position.y,
  width: node.measured?.width ?? DEFAULT_NODE_WIDTH,
  height: node.measured?.height ?? DEFAULT_NODE_HEIGHT,
});

const distance = (from: XYPosition, to: XYPosition) => Math.hypot(from.x - to.x, from.y - to.y);

export const findNearestSides = (source: IRect, target: IRect): IHandlePair => {
  const candidates = HANDLE_IDS.flatMap((sourceHandle) =>
    HANDLE_IDS.map((targetHandle): IHandlePair => ({ sourceHandle, targetHandle })),
  );

  const best = candidates.reduce<IHandlePairWithDistance>(
    (current, pair) => {
      const next = distance(getHandleAnchor(source, pair.sourceHandle), getHandleAnchor(target, pair.targetHandle));

      return next < current.distance ? { ...pair, distance: next } : current;
    },
    { sourceHandle: 'right', targetHandle: 'left', distance: Infinity },
  );

  return { sourceHandle: best.sourceHandle, targetHandle: best.targetHandle };
};

export const findNearestHandlePair = (source: Node, target: Node): IHandlePair =>
  findNearestSides(toRect(source), toRect(target));
