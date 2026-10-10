import type { Node } from '@xyflow/react';

import type { INodePositionUpdate } from '@interfaces';

export const detectPositionChanges = (previous: Node[], next: Node[]): INodePositionUpdate[] => {
  const previousById = new Map(previous.map((node) => [node.id, node]));

  return next.flatMap((node) => {
    const before = previousById.get(node.id);
    if (!before) return [];

    const moved = before.position.x !== node.position.x || before.position.y !== node.position.y;

    if (!moved) return [];

    return [{ id: node.id, x: node.position.x, y: node.position.y }];
  });
};
