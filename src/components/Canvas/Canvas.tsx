'use client';

import { Background, ConnectionMode, type Edge, type Node, ReactFlow } from '@xyflow/react';
import { clsx } from 'clsx';
import { type MouseEvent as ReactMouseEvent, useCallback, useMemo, useState } from 'react';

import { ECanvasNodeType, type IAlignmentGuide, type TDefaultZoom } from '@interfaces';
import { DEFAULT_PREFERENCES } from '@constants';
import { useEscapeKey } from '@hooks';
import { ECanvasTool } from '@/components/tools';
import {
  computeEdgeTones,
  computeEffectiveStatuses,
  computeEligibleIds,
  isAffected,
  pickStrongerTone,
} from '@/lib/canvas';
import { useCanvasStore, usePermissionsStore } from '@/lib/stores';

import {
  BACKGROUND_DOT_GAP,
  BACKGROUND_SIZE_BY_PATTERN,
  BACKGROUND_VARIANT_BY_PATTERN,
  CONNECTION_RADIUS,
  DEFAULT_EDGE_OPTIONS,
  EDGE_DEFAULT_STROKE_WIDTH,
  EDGE_TONE_STROKES,
  ELIGIBLE_ACTION_BY_TOOL,
  NODE_DRAG_THRESHOLD,
  OPEN_COMMENTS_Z_INDEX,
  PAN_BUTTONS_ALL,
  PAN_BUTTONS_MIDDLE,
  PRO_OPTIONS,
  SNAP_GRID,
  ZOOM_MAX,
  ZOOM_MIN,
} from './consts';
import {
  AlignmentGuides,
  ArrivalGlow,
  CanvasEdge,
  CanvasLoadError,
  CanvasNode,
  CanvasSkeleton,
  ContextMenu,
  EdgeMarkers,
  QuestionNode,
  ReferenceNode,
  ReferenceSearchPanel,
  ResolutionBar,
  RubberLine,
  SaveStatus,
} from './fragments';
import {
  useCanvasContextMenu,
  useCanvasPattern,
  useCanvasSync,
  useCanvasTools,
  useCanvasViewport,
  useMiddlePan,
  useReferenceSearch,
} from './hooks';
import { computeAlignmentGuides } from './utils';

const NODE_TYPES = {
  [ECanvasNodeType.Canvas]: CanvasNode,
  [ECanvasNodeType.Reference]: ReferenceNode,
  [ECanvasNodeType.Question]: QuestionNode,
};

const EDGE_TYPES = {
  default: CanvasEdge,
};

const NO_GUIDES: readonly IAlignmentGuide[] = [];

const NO_ELIGIBLE_IDS: ReadonlySet<string> = new Set();

const NO_NODES: Node[] = [];

const NO_EDGES: Edge[] = [];

interface ICanvasProps {
  workspaceId: string;
  threadId: string;
  snapToGrid?: boolean;
  smartGuides?: boolean;
  defaultZoom?: TDefaultZoom;
}

export const Canvas = ({
  workspaceId,
  threadId,
  snapToGrid = DEFAULT_PREFERENCES.snapToGrid,
  smartGuides = DEFAULT_PREFERENCES.smartGuides,
  defaultZoom = DEFAULT_PREFERENCES.defaultZoom,
}: ICanvasProps) => {
  const { saveState, loadFailed, retryLoad } = useCanvasSync(workspaceId, threadId);
  const referenceSearch = useReferenceSearch({ workspaceId, threadId });
  const { defaultViewport, arriving, onMoveEnd } = useCanvasViewport({ threadId, defaultZoom });
  const { contextMenu, closeContextMenu, onPaneContextMenu, onNodeContextMenu, onEdgeContextMenu } =
    useCanvasContextMenu();
  const { onPaneClick, onNodeClick, onNodeDoubleClick, onEdgeClick, onConnect, isValidConnection } = useCanvasTools();
  const middlePan = useMiddlePan();
  const canvasPattern = useCanvasPattern();

  const canEditCanvas = usePermissionsStore((state) => state.canEditCanvas);
  const hydrated = useCanvasStore((state) => state.threadId === threadId);
  const activeTool = useCanvasStore((state) => state.activeTool);
  const nodes = useCanvasStore((state) => (state.threadId === threadId ? state.nodes : NO_NODES));
  const edges = useCanvasStore((state) => (state.threadId === threadId ? state.edges : NO_EDGES));
  const pendingConnection = useCanvasStore((state) => state.pendingConnection);
  const openCommentsNodeId = useCanvasStore((state) => state.openCommentsNodeId);
  const closeAllOverlays = useCanvasStore((state) => state.closeAllOverlays);
  const onNodesChange = useCanvasStore((state) => state.onNodesChange);
  const onEdgesChange = useCanvasStore((state) => state.onEdgesChange);

  const [alignmentGuides, setAlignmentGuides] = useState<readonly IAlignmentGuide[]>(NO_GUIDES);

  useEscapeKey(() => useCanvasStore.getState().setPendingConnection(null), pendingConnection !== null);

  const effectiveStatusById = useMemo(() => computeEffectiveStatuses(nodes, edges), [nodes, edges]);

  const eligibleAction = ELIGIBLE_ACTION_BY_TOOL[activeTool] ?? null;

  const eligibleIds = useMemo(
    () => (eligibleAction ? computeEligibleIds(nodes, edges, eligibleAction) : NO_ELIGIBLE_IDS),
    [nodes, edges, eligibleAction],
  );

  const displayNodes = useMemo(() => {
    const decorated = nodes.map((node) => {
      const eligibleHint = eligibleIds.has(node.id) || undefined;
      const status = effectiveStatusById.get(node.id);
      const effectiveStatus = isAffected(status) ? status : undefined;
      const commentsOpen = node.id === openCommentsNodeId;

      if (!eligibleHint && !effectiveStatus && !commentsOpen) return node;

      return {
        ...node,
        ...(commentsOpen && { zIndex: OPEN_COMMENTS_Z_INDEX }),
        data: { ...node.data, eligibleHint, effectiveStatus },
      };
    });

    return decorated.some((node, index) => node !== nodes[index]) ? decorated : nodes;
  }, [nodes, eligibleIds, effectiveStatusById, openCommentsNodeId]);

  const edgeTones = useMemo(
    () => computeEdgeTones(nodes, edges, effectiveStatusById),
    [nodes, edges, effectiveStatusById],
  );

  const styledEdges = useMemo(() => {
    const edgeIdByDirection = new Map(edges.map((edge) => [`${edge.source}->${edge.target}`, edge.id]));
    const rendered = new Set<string>();

    return edges.flatMap<Edge>((edge) => {
      const pairKey = edge.source < edge.target ? `${edge.source}|${edge.target}` : `${edge.target}|${edge.source}`;
      if (rendered.has(pairKey)) return [];
      rendered.add(pairKey);

      const reverseId = edgeIdByDirection.get(`${edge.target}->${edge.source}`);
      const bidirectional = reverseId !== undefined;
      const ownTone = edgeTones.get(edge.id) ?? 'default';
      const tone = reverseId ? pickStrongerTone(ownTone, edgeTones.get(reverseId) ?? 'default') : ownTone;

      return [
        {
          ...edge,
          type: 'default',
          className: clsx(`edge-tone-${tone}`, bidirectional && 'edge-bidirectional'),
          style: {
            ...edge.style,
            stroke: EDGE_TONE_STROKES[tone],
            strokeWidth: EDGE_DEFAULT_STROKE_WIDTH,
          },
          data: { ...edge.data, tone, bidirectional },
        },
      ];
    });
  }, [edges, edgeTones]);

  const handlePaneClick = useCallback(
    (event: ReactMouseEvent) => {
      closeAllOverlays();
      closeContextMenu();
      onPaneClick(event);
    },
    [closeAllOverlays, closeContextMenu, onPaneClick],
  );

  const handleNodeDrag = useCallback(
    (_event: MouseEvent | TouchEvent, node: Node) => {
      if (!smartGuides) return;

      setAlignmentGuides(computeAlignmentGuides(node, nodes));
    },
    [smartGuides, nodes],
  );

  const handleNodeDragStop = useCallback(() => {
    setAlignmentGuides(NO_GUIDES);
  }, []);

  return (
    <div
      data-tour="canvas"
      data-canvas-thread={threadId}
      data-canvas-tool={activeTool}
      data-canvas-save={saveState.status}
      className="relative h-full w-full"
    >
      <EdgeMarkers />

      <ReactFlow
        nodes={displayNodes}
        edges={styledEdges}
        nodeTypes={NODE_TYPES}
        edgeTypes={EDGE_TYPES}
        defaultEdgeOptions={DEFAULT_EDGE_OPTIONS}
        defaultViewport={defaultViewport}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onMoveEnd={onMoveEnd}
        onPaneClick={handlePaneClick}
        onPaneContextMenu={onPaneContextMenu}
        onNodeContextMenu={onNodeContextMenu}
        onEdgeContextMenu={onEdgeContextMenu}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        onNodeDrag={handleNodeDrag}
        onNodeDragStop={handleNodeDragStop}
        onEdgeClick={onEdgeClick}
        onConnect={onConnect}
        isValidConnection={isValidConnection}
        connectionMode={ConnectionMode.Loose}
        connectionRadius={CONNECTION_RADIUS}
        minZoom={ZOOM_MIN}
        maxZoom={ZOOM_MAX}
        snapToGrid={snapToGrid}
        snapGrid={SNAP_GRID}
        panOnDrag={activeTool === ECanvasTool.Pan || middlePan ? PAN_BUTTONS_ALL : PAN_BUTTONS_MIDDLE}
        selectionOnDrag={activeTool === ECanvasTool.Select}
        elementsSelectable={activeTool === ECanvasTool.Select}
        nodesDraggable={!middlePan && canEditCanvas}
        nodesConnectable={canEditCanvas}
        nodeDragThreshold={NODE_DRAG_THRESHOLD}
        deleteKeyCode={null}
        proOptions={PRO_OPTIONS}
      >
        {canvasPattern !== 'none' && (
          <Background
            variant={BACKGROUND_VARIANT_BY_PATTERN[canvasPattern]}
            gap={BACKGROUND_DOT_GAP}
            size={BACKGROUND_SIZE_BY_PATTERN[canvasPattern]}
            color="var(--app-bg-grid)"
          />
        )}
        <ReferenceSearchPanel nodes={referenceSearch.nodes} loading={referenceSearch.loading} />
      </ReactFlow>

      {smartGuides && <AlignmentGuides guides={alignmentGuides} />}

      <RubberLine />

      {contextMenu && <ContextMenu menu={contextMenu} onClose={closeContextMenu} />}

      {arriving && <ArrivalGlow />}

      {!hydrated && !loadFailed && <CanvasSkeleton />}

      {loadFailed && !hydrated && <CanvasLoadError onRetry={retryLoad} />}

      {hydrated && <ResolutionBar />}

      {hydrated && <SaveStatus state={saveState} />}
    </div>
  );
};
