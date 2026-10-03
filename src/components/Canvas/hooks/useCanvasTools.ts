'use client';

import { type EdgeMouseHandler, type IsValidConnection, type NodeMouseHandler, useReactFlow } from '@xyflow/react';
import { useRouter } from 'next/navigation';
import { type MouseEvent, useCallback } from 'react';

import { ECanvasNodeType, type IUseCanvasToolsResult } from '@interfaces';

import { ECanvasTool } from '@/components/tools';
import { useTranslations } from '@/i18n';
import { findNearestHandlePair } from '@/lib/canvas';
import { useCanvasStore, usePermissionsStore } from '@/lib/stores';

import { ZOOM_DURATION_MS, ZOOM_MAX, ZOOM_MIN, ZOOM_STEP_FACTOR } from '../consts';
import { buildReferenceTargetUrl } from '../utils';

const isValidConnection: IsValidConnection = (connection) => connection.source !== connection.target;

const clampZoom = (zoom: number): number => Math.min(Math.max(zoom, ZOOM_MIN), ZOOM_MAX);

export const useCanvasTools = (): IUseCanvasToolsResult => {
  const t = useTranslations();
  const router = useRouter();
  const { screenToFlowPosition, getViewport, setViewport } = useReactFlow();

  const activeTool = useCanvasStore((state) => state.activeTool);
  const connectNodes = useCanvasStore((state) => state.connectNodes);

  const zoomToCursor = useCallback(
    (event: MouseEvent, baseFactor: number) => {
      const factor = event.shiftKey ? 1 / baseFactor : baseFactor;
      const { x: viewportX, y: viewportY, zoom } = getViewport();
      const targetZoom = clampZoom(zoom * factor);
      if (targetZoom === zoom) return;

      const flow = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      setViewport(
        {
          x: viewportX + flow.x * (zoom - targetZoom),
          y: viewportY + flow.y * (zoom - targetZoom),
          zoom: targetZoom,
        },
        { duration: ZOOM_DURATION_MS },
      );
    },
    [getViewport, screenToFlowPosition, setViewport],
  );

  const handleZoomTool = useCallback(
    (event: MouseEvent): boolean => {
      if (activeTool === ECanvasTool.ZoomIn) {
        zoomToCursor(event, ZOOM_STEP_FACTOR);

        return true;
      }
      if (activeTool === ECanvasTool.ZoomOut) {
        zoomToCursor(event, 1 / ZOOM_STEP_FACTOR);

        return true;
      }

      return false;
    },
    [activeTool, zoomToCursor],
  );

  const onPaneClick = useCallback(
    (event: MouseEvent) => {
      if (handleZoomTool(event)) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      const store = useCanvasStore.getState();

      if (activeTool === ECanvasTool.AddNode) {
        store.addNode(position, t.platform.canvas.node.defaultLabel);
      } else if (activeTool === ECanvasTool.CrossReference) {
        store.setReferenceSearchPosition(position);
      }
    },
    [activeTool, handleZoomTool, screenToFlowPosition, t.platform.canvas.node.defaultLabel],
  );

  const onNodeClick: NodeMouseHandler = useCallback(
    (event, node) => {
      if (handleZoomTool(event)) return;

      const store = useCanvasStore.getState();

      switch (activeTool) {
        case ECanvasTool.Delete:
          store.deleteNode(node.id);
          break;

        case ECanvasTool.ValidPath:
          store.setNodeStatus(node.id, 'valid');
          break;

        case ECanvasTool.InvalidPath:
          store.setNodeStatus(node.id, 'invalid');
          break;

        case ECanvasTool.Answer:
          if (node.type === ECanvasNodeType.Canvas) store.setNodeAnswer(node.id);
          break;

        case ECanvasTool.Connect: {
          const { pendingConnection, nodes } = store;

          if (!pendingConnection) {
            store.setPendingConnection(node.id);
            break;
          }

          const sourceNode = nodes.find((candidate) => candidate.id === pendingConnection);
          if (!sourceNode) break;

          const { sourceHandle, targetHandle } = findNearestHandlePair(sourceNode, node);
          store.connectNodes({
            source: pendingConnection,
            target: node.id,
            sourceHandle,
            targetHandle,
          });
          break;
        }
      }
    },
    [activeTool, handleZoomTool],
  );

  const onNodeDoubleClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      if (node.type === ECanvasNodeType.Reference) {
        const targetUrl = buildReferenceTargetUrl(node.data);
        if (targetUrl) router.push(targetUrl);

        return;
      }
      if (activeTool !== ECanvasTool.Select) return;
      if (!usePermissionsStore.getState().canEditCanvas) return;
      if (node.type === ECanvasNodeType.Canvas || node.type === ECanvasNodeType.Question) {
        useCanvasStore.getState().setEditingNodeId(node.id);
      }
    },
    [activeTool, router],
  );

  const onEdgeClick: EdgeMouseHandler = useCallback(
    (event, edge) => {
      if (handleZoomTool(event)) return;
      if (activeTool !== ECanvasTool.Delete) return;

      useCanvasStore.getState().deleteEdge(edge.id);
    },
    [activeTool, handleZoomTool],
  );

  return {
    onPaneClick,
    onNodeClick,
    onNodeDoubleClick,
    onEdgeClick,
    onConnect: connectNodes,
    isValidConnection,
  };
};
