'use client';

import { useReactFlow } from '@xyflow/react';

import type { INodeReference } from '@interfaces';

import { useCanvasStore } from '@/lib/stores';

import { ReferenceSearchPanelContent } from './ReferenceSearchPanelContent';

interface IReferenceSearchPanelProps {
  nodes?: INodeReference[];
  loading?: boolean;
}

export const ReferenceSearchPanel = ({ nodes = [], loading = false }: IReferenceSearchPanelProps) => {
  const { flowToScreenPosition } = useReactFlow();

  const referenceSearchPosition = useCanvasStore((state) => state.referenceSearchPosition);
  const addReferenceNode = useCanvasStore((state) => state.addReferenceNode);
  const setReferenceSearchPosition = useCanvasStore((state) => state.setReferenceSearchPosition);

  if (!referenceSearchPosition) return null;

  return (
    <ReferenceSearchPanelContent
      key={`${referenceSearchPosition.x},${referenceSearchPosition.y}`}
      nodes={nodes}
      loading={loading}
      position={referenceSearchPosition}
      screenPosition={flowToScreenPosition(referenceSearchPosition)}
      onSelect={addReferenceNode}
      onClose={() => setReferenceSearchPosition(null)}
    />
  );
};
