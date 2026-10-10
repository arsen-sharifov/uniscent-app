import { BaseEdge, type EdgeProps, Position } from '@xyflow/react';

import type { TCanvasEdge } from '@interfaces';

import { getCanvasEdgePath } from '@/lib/canvas';

export const CanvasEdge = ({
  id,
  source: sourceId,
  target: targetId,
  sourceHandleId,
  targetHandleId,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  data,
}: EdgeProps<TCanvasEdge>) => {
  const tone = data?.tone ?? 'default';
  const bidirectional = data?.bidirectional === true;

  const path = getCanvasEdgePath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourceSide: sourcePosition ?? Position.Bottom,
    targetSide: targetPosition ?? Position.Top,
    bidirectional,
  });

  const markerRef = `url(#canvas-arrow-${tone})`;

  return (
    <g
      data-export-edge={id}
      data-source={sourceId}
      data-target={targetId}
      data-source-handle={sourceHandleId ?? sourcePosition}
      data-target-handle={targetHandleId ?? targetPosition}
      data-tone={tone}
      data-bidirectional={bidirectional || undefined}
    >
      <BaseEdge
        id={id}
        path={path}
        markerStart={bidirectional ? markerRef : undefined}
        markerEnd={markerRef}
        style={style}
      />
      {bidirectional && (
        <path
          d={path}
          className="react-flow__edge-path canvas-edge-bidi-reverse"
          style={{ ...style, fill: 'none', pointerEvents: 'none' }}
        />
      )}
    </g>
  );
};
