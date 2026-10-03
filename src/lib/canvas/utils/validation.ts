import type { Edge, Node } from '@xyflow/react';

import { ECanvasNodeType, type TValidationAction } from '@interfaces';

import { isCanvasNodeData } from './status';

const isValidatedParent = (parent: Node | undefined): boolean => {
  if (!parent) return false;
  if (parent.type === ECanvasNodeType.Question) return true;

  return parent.type === ECanvasNodeType.Canvas && isCanvasNodeData(parent.data) && parent.data.status === 'valid';
};

export const hasValidatedParent = (nodeId: string, nodes: Node[], edges: Edge[]): boolean => {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));

  return edges.some((edge) => edge.target === nodeId && isValidatedParent(nodeById.get(edge.source)));
};

export const computeEligibleIds = (nodes: Node[], edges: Edge[], action: TValidationAction): Set<string> => {
  const validatedIds = new Set(nodes.filter(isValidatedParent).map((node) => node.id));
  const withValidatedParent = new Set(edges.filter((edge) => validatedIds.has(edge.source)).map((edge) => edge.target));

  return new Set(
    nodes
      .filter((node) => {
        if (node.type !== ECanvasNodeType.Canvas || !isCanvasNodeData(node.data)) return false;
        if (action === 'valid' && node.data.status === 'valid') return false;
        if (action === 'answer' && node.data.isAnswer) return false;

        return withValidatedParent.has(node.id);
      })
      .map((node) => node.id),
  );
};
