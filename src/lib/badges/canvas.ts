import type { TCanvasOperation } from '@interfaces';
import { ARCHITECT_NODE_COUNT, CONNECTOR_EDGE_COUNT, NIGHT_OWL_END_HOUR } from '@constants';
import { isCanvasNodeData, subscribeCanvasOperations } from '@/lib/canvas';
import { useCanvasStore } from '@/lib/stores';

import { awardBadge } from './awards';

const hasMixedVerdicts = () => {
  const statuses = new Set(
    useCanvasStore.getState().nodes.map((node) => (isCanvasNodeData(node.data) ? node.data.status : null)),
  );

  return statuses.has('valid') && statuses.has('invalid');
};

const awardForNode = () => {
  if (new Date().getHours() < NIGHT_OWL_END_HOUR) awardBadge('nightOwl');
  if (useCanvasStore.getState().nodes.length >= ARCHITECT_NODE_COUNT) awardBadge('architect');
};

const awardFor = (operation: TCanvasOperation) => {
  switch (operation.type) {
    case 'createCanvasNode':
      awardForNode();

      return;
    case 'createReferenceNode':
      awardBadge('curator');
      awardForNode();

      return;
    case 'createEdge':
      if (useCanvasStore.getState().edges.length >= CONNECTOR_EDGE_COUNT) awardBadge('connector');

      return;
    case 'updateNodeStatus':
      if (operation.status === 'invalid') awardBadge('critic');
      if (hasMixedVerdicts()) awardBadge('weaver');

      return;
    case 'updateNodeAnswer':
      if (operation.isAnswer) awardBadge('verdict');

      return;
    case 'createComment':
      awardBadge('voice');

      return;
    default:
      return;
  }
};

export const watchCanvasBadges = () => subscribeCanvasOperations(awardFor);
