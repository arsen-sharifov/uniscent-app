'use client';

import { type EdgeMouseHandler, type NodeMouseHandler, useReactFlow } from '@xyflow/react';
import { type MouseEvent as ReactMouseEvent, useCallback, useState } from 'react';

import { ECanvasNodeType, type IUseCanvasContextMenuResult, type TCanvasContextMenu } from '@interfaces';

import { useCanvasStore, usePermissionsStore } from '@/lib/stores';

export const useCanvasContextMenu = (): IUseCanvasContextMenuResult => {
  const { screenToFlowPosition } = useReactFlow();

  const closeAllOverlays = useCanvasStore((state) => state.closeAllOverlays);
  const canEditCanvas = usePermissionsStore((state) => state.canEditCanvas);
  const canComment = usePermissionsStore((state) => state.canComment);

  const [contextMenu, setContextMenu] = useState<TCanvasContextMenu | null>(null);

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  const onPaneContextMenu = useCallback(
    (event: ReactMouseEvent | MouseEvent) => {
      event.preventDefault();
      closeAllOverlays();
      if (!canEditCanvas) return;

      const flow = screenToFlowPosition({ x: event.clientX, y: event.clientY });

      setContextMenu({ type: 'pane', x: event.clientX, y: event.clientY, flowX: flow.x, flowY: flow.y });
    },
    [closeAllOverlays, screenToFlowPosition, canEditCanvas],
  );

  const onNodeContextMenu: NodeMouseHandler = useCallback(
    (event, node) => {
      event.preventDefault();
      closeAllOverlays();
      if (!canEditCanvas && !canComment && node.type !== ECanvasNodeType.Reference) return;

      setContextMenu({ type: 'node', x: event.clientX, y: event.clientY, nodeId: node.id });
    },
    [closeAllOverlays, canEditCanvas, canComment],
  );

  const onEdgeContextMenu: EdgeMouseHandler = useCallback(
    (event, edge) => {
      event.preventDefault();
      closeAllOverlays();
      if (!canEditCanvas) return;

      setContextMenu({ type: 'edge', x: event.clientX, y: event.clientY, edgeId: edge.id });
    },
    [closeAllOverlays, canEditCanvas],
  );

  return { contextMenu, closeContextMenu, onPaneContextMenu, onNodeContextMenu, onEdgeContextMenu };
};
