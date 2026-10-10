import { type Node, ReactFlow } from '@xyflow/react';

import { FIT_VIEW_OPTIONS, LOCKED_GESTURES, NODE_TYPES, PRO_OPTIONS } from '../consts';

interface ISingleNodeFlowProps {
  node: Node;
}

export const SingleNodeFlow = ({ node }: ISingleNodeFlowProps) => (
  <ReactFlow
    nodes={[node]}
    edges={[]}
    nodeTypes={NODE_TYPES}
    fitView
    fitViewOptions={FIT_VIEW_OPTIONS}
    proOptions={PRO_OPTIONS}
    {...LOCKED_GESTURES}
  />
);
