import { ReactFlow } from '@xyflow/react';

import type { INodeReference } from '@interfaces';

import { ReferenceSearchPanel } from '@/components';

import { LOCKED_GESTURES, PRO_OPTIONS } from '../../../consts';

interface IReferenceSearchFlowProps {
  nodes: INodeReference[];
}

const DEFAULT_VIEWPORT = { x: 320, y: 200, zoom: 1 };

export const ReferenceSearchFlow = ({ nodes }: IReferenceSearchFlowProps) => (
  <ReactFlow nodes={[]} edges={[]} defaultViewport={DEFAULT_VIEWPORT} proOptions={PRO_OPTIONS} {...LOCKED_GESTURES}>
    <ReferenceSearchPanel nodes={nodes} />
  </ReactFlow>
);
