'use client';

import {
  Background,
  ConnectionMode,
  type Edge,
  type EdgeMouseHandler,
  type Node,
  type NodeMouseHandler,
  ReactFlow,
  useReactFlow,
} from '@xyflow/react';
import { clsx } from 'clsx';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { type MouseEvent as ReactMouseEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import '@xyflow/react/dist/style.css';
import './canvas.css';
import {
  ECanvasNodeType,
  type IAlignmentGuide,
  type IScreenPoint,
  type TCanvasContextMenu,
  type TDefaultZoom,
} from '@interfaces';
import { DEFAULT_PREFERENCES } from '@constants';
import { useEscapeKey } from '@hooks';
import { ECanvasTool } from '@/components/tools';
import { useTranslations } from '@/i18n';
import { ARROW_MARKER_ATTRIBUTES, ARROW_PATH_D } from '@/lib/canvas';
import { useCanvasStore, usePermissionsStore } from '@/lib/stores';
import { canEditNode } from '@/lib/utils';

import { CanvasEdge } from './CanvasEdge';
import { CanvasNode } from './CanvasNode';
import {
  ACCENT_GLOW_FALLBACK,
  ARRIVAL_CLEANUP_MS,
  ARRIVAL_FIT_DURATION_MS,
  ARRIVAL_FIT_PADDING,
  BACKGROUND_COLOR_FALLBACK,
  BACKGROUND_DOT_GAP,
  BACKGROUND_SIZE_BY_PATTERN,
  BACKGROUND_VARIANT_BY_PATTERN,
  CONNECTION_RADIUS,
  DEFAULT_EDGE_OPTIONS,
  EDGE_DEFAULT_STROKE_WIDTH,
  EDGE_TONES,
  ELIGIBLE_ACTION_BY_TOOL,
  FIT_REQUEST_DURATION_MS,
  FRESH_FIT_PADDING,
  NODE_DRAG_THRESHOLD,
  OPEN_COMMENTS_Z_INDEX,
  PAN_BUTTONS_ALL,
  PAN_BUTTONS_MIDDLE,
  RUBBER_LINE_DASH_ARRAY,
  RUBBER_LINE_DOT_FILL_FALLBACK,
  RUBBER_LINE_DOT_RADIUS,
  RUBBER_LINE_DOT_STROKE_WIDTH,
  RUBBER_LINE_STROKE_FALLBACK,
  RUBBER_LINE_STROKE_WIDTH,
  SELECT_DELETE_KEYS,
  SNAP_GRID,
  ZOOM_MAX,
  ZOOM_MIN,
} from './consts';
import { AlignmentGuides, CanvasSkeleton, ContextMenu, ResolutionBar, SaveStatus } from './fragments';
import {
  useCanvasPattern,
  useCanvasSync,
  useCanvasTools,
  useEdgePalette,
  useMiddlePan,
  useReferenceSearch,
  useThemeToken,
} from './hooks';
import { QuestionNode } from './QuestionNode';
import { ReferenceNode } from './ReferenceNode';
import { ReferenceSearchPanel } from './ReferenceSearchPanel';
import {
  computeAlignmentGuides,
  computeEffectiveStatuses,
  computeEligibleIds,
  isAffected,
  isCanvasNodeData,
  resolveBidirectionalEdgeTone,
  resolveEdgeTone,
} from './utils';

const NODE_TYPES = {
  [ECanvasNodeType.Canvas]: CanvasNode,
  [ECanvasNodeType.Reference]: ReferenceNode,
  [ECanvasNodeType.Question]: QuestionNode,
};

const EDGE_TYPES = {
  default: CanvasEdge,
};

const PRO_OPTIONS = { hideAttribution: true } as const;

const NO_GUIDES: readonly IAlignmentGuide[] = [];

const NO_ELIGIBLE_IDS: ReadonlySet<string> = new Set();

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
  const t = useTranslations();
  const { saveState, loadError } = useCanvasSync(threadId);
  const referenceSearch = useReferenceSearch({ workspaceId, threadId });

  const canEditCanvas = usePermissionsStore((s) => s.canEditCanvas);
  const canComment = usePermissionsStore((s) => s.canComment);

  useMiddlePan();

  const dotColor = useThemeToken('--app-bg-grid', BACKGROUND_COLOR_FALLBACK);
  const rubberStroke = useThemeToken('--accent', RUBBER_LINE_STROKE_FALLBACK);
  const rubberDotFill = useThemeToken('--accent', RUBBER_LINE_DOT_FILL_FALLBACK);
  const accentGlow = useThemeToken('--accent-glow', ACCENT_GLOW_FALLBACK);
  const edgePalette = useEdgePalette();
  const canvasPattern = useCanvasPattern();

  const { fitView, screenToFlowPosition, setViewport } = useReactFlow();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const hydrated = useCanvasStore((s) => s.hydrated);
  const storeThreadId = useCanvasStore((s) => s.threadId);
  const arriving = hydrated && searchParams.get('focus') === 'ref';
  const arrivalNodeId = searchParams.get('node');
  const activeTool = useCanvasStore((s) => s.activeTool);
  const nodes = useCanvasStore((s) => s.nodes);
  const edges = useCanvasStore((s) => s.edges);
  const pendingConnection = useCanvasStore((s) => s.pendingConnection);
  const openCommentsNodeId = useCanvasStore((s) => s.openCommentsNodeId);
  const closeAllOverlays = useCanvasStore((s) => s.closeAllOverlays);
  const middlePan = useCanvasStore((s) => s.middlePan);
  const onNodesChange = useCanvasStore((s) => s.onNodesChange);
  const onEdgesChange = useCanvasStore((s) => s.onEdgesChange);

  const { onPaneClick, onNodeClick, onNodeDoubleClick, onEdgeClick, onConnect, isValidConnection } = useCanvasTools();

  const [contextMenu, setContextMenu] = useState<TCanvasContextMenu | null>(null);
  const [cursorScreen, setCursorScreen] = useState<IScreenPoint | null>(null);
  const [sourceScreen, setSourceScreen] = useState<IScreenPoint | null>(null);
  const [alignmentGuides, setAlignmentGuides] = useState<readonly IAlignmentGuide[]>(NO_GUIDES);

  const defaultViewport = useMemo(() => ({ x: 0, y: 0, zoom: defaultZoom / 100 }), [defaultZoom]);

  useEffect(() => {
    if (!middlePan) return;

    document.body.classList.add('canvas-middle-pan');

    return () => document.body.classList.remove('canvas-middle-pan');
  }, [middlePan]);

  useEscapeKey(() => useCanvasStore.getState().setPendingConnection(null), pendingConnection !== null);

  useEffect(() => {
    if (!pendingConnection) return;

    const onMove = (event: MouseEvent) => {
      setCursorScreen({ x: event.clientX, y: event.clientY });

      const element = document.querySelector(`.react-flow__node[data-id="${pendingConnection}"]`);
      if (!element) return;

      const rect = element.getBoundingClientRect();
      setSourceScreen({
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      });
    };

    window.addEventListener('mousemove', onMove);

    return () => {
      window.removeEventListener('mousemove', onMove);
      setCursorScreen(null);
      setSourceScreen(null);
    };
  }, [pendingConnection]);

  useEffect(() => {
    if (!arriving) return;

    const raf = requestAnimationFrame(() => {
      fitView({
        duration: ARRIVAL_FIT_DURATION_MS,
        padding: ARRIVAL_FIT_PADDING,
        ...(arrivalNodeId && { nodes: [{ id: arrivalNodeId }] }),
      });
    });
    const cleanupTimer = window.setTimeout(() => {
      router.replace(pathname, { scroll: false });
    }, ARRIVAL_CLEANUP_MS);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(cleanupTimer);
    };
  }, [arriving, arrivalNodeId, fitView, pathname, router]);

  const didInitViewport = useRef(false);

  useEffect(() => {
    if (didInitViewport.current || !hydrated) return;
    didInitViewport.current = true;
    if (arriving) return;

    setViewport({ x: 0, y: 0, zoom: defaultZoom / 100 });
  }, [hydrated, arriving, defaultZoom, setViewport]);

  const focusedQuestionThreadId = useRef<string | null>(null);

  useEffect(() => {
    if (!hydrated || arriving) return;
    if (storeThreadId !== threadId) return;
    if (focusedQuestionThreadId.current === threadId) return;

    const { nodes: loadedNodes, setEditingNodeId } = useCanvasStore.getState();
    const onlyNode = loadedNodes.length === 1 ? loadedNodes[0] : null;
    const freshQuestion = onlyNode?.type === ECanvasNodeType.Question ? onlyNode : null;
    if (!freshQuestion) {
      focusedQuestionThreadId.current = threadId;

      return;
    }

    const frame = requestAnimationFrame(() => {
      focusedQuestionThreadId.current = threadId;
      fitView({ duration: 0, padding: FRESH_FIT_PADDING, maxZoom: defaultZoom / 100 });
    });

    if (isCanvasNodeData(freshQuestion.data) && freshQuestion.data.label.trim().length === 0) {
      setEditingNodeId(freshQuestion.id);
    }

    return () => cancelAnimationFrame(frame);
  }, [hydrated, threadId, storeThreadId, arriving, fitView, defaultZoom]);

  useEffect(() => {
    return useCanvasStore.subscribe((state, previous) => {
      if (state.fitRequest === previous.fitRequest) return;

      fitView({
        duration: FIT_REQUEST_DURATION_MS,
        padding: state.fitPadding ?? FRESH_FIT_PADDING,
        maxZoom: defaultZoom / 100,
      });
    });
  }, [fitView, defaultZoom]);

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

  const styledEdges = useMemo(() => {
    const directionsByPair = new Map<string, Set<string>>();

    edges.forEach((edge) => {
      const pairKey = edge.source < edge.target ? `${edge.source}|${edge.target}` : `${edge.target}|${edge.source}`;
      const directions = directionsByPair.get(pairKey) ?? new Set<string>();
      directions.add(`${edge.source}->${edge.target}`);
      directionsByPair.set(pairKey, directions);
    });

    const rendered = new Set<string>();

    return edges.flatMap<Edge>((edge) => {
      const pairKey = edge.source < edge.target ? `${edge.source}|${edge.target}` : `${edge.target}|${edge.source}`;
      if (rendered.has(pairKey)) return [];
      rendered.add(pairKey);

      const bidirectional = (directionsByPair.get(pairKey)?.size ?? 0) >= 2;
      const sourceStatus = effectiveStatusById.get(edge.source);
      const targetStatus = effectiveStatusById.get(edge.target);
      const tone = bidirectional
        ? resolveBidirectionalEdgeTone(sourceStatus, targetStatus)
        : resolveEdgeTone(sourceStatus, targetStatus);

      return [
        {
          ...edge,
          type: 'default',
          className: clsx(`edge-tone-${tone}`, bidirectional && 'edge-bidirectional'),
          style: {
            ...edge.style,
            stroke: edgePalette[tone].stroke,
            strokeWidth: EDGE_DEFAULT_STROKE_WIDTH,
          },
          data: { ...edge.data, tone, bidirectional },
        },
      ];
    });
  }, [edges, effectiveStatusById, edgePalette]);

  const showRubberLine =
    activeTool === ECanvasTool.Connect && pendingConnection !== null && cursorScreen !== null && sourceScreen !== null;

  const handlePaneClick = useCallback(
    (event: ReactMouseEvent) => {
      closeAllOverlays();
      setContextMenu(null);
      onPaneClick(event);
    },
    [closeAllOverlays, onPaneClick],
  );

  const handlePaneContextMenu = useCallback(
    (event: ReactMouseEvent | MouseEvent) => {
      event.preventDefault();
      closeAllOverlays();
      if (!canEditCanvas) return;

      const flow = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      setContextMenu({
        type: 'pane',
        x: event.clientX,
        y: event.clientY,
        flowX: flow.x,
        flowY: flow.y,
      });
    },
    [closeAllOverlays, screenToFlowPosition, canEditCanvas],
  );

  const handleNodeContextMenu: NodeMouseHandler = useCallback(
    (event, node) => {
      event.preventDefault();
      closeAllOverlays();
      if (!canEditCanvas && !canComment && node.type !== ECanvasNodeType.Reference) return;

      setContextMenu({
        type: 'node',
        x: event.clientX,
        y: event.clientY,
        nodeId: node.id,
      });
    },
    [closeAllOverlays, canEditCanvas, canComment],
  );

  const handleEdgeContextMenu: EdgeMouseHandler = useCallback(
    (event, edge) => {
      event.preventDefault();
      closeAllOverlays();
      if (!canEditCanvas) return;

      setContextMenu({
        type: 'edge',
        x: event.clientX,
        y: event.clientY,
        edgeId: edge.id,
      });
    },
    [closeAllOverlays, canEditCanvas],
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

  const handleBeforeDelete = useCallback(
    async ({ nodes: nodesToDelete, edges: edgesToDelete }: { nodes: Node[]; edges: Edge[] }) => {
      const access = usePermissionsStore.getState();
      if (!access.canEditCanvas) return false;

      const allowedNodes = nodesToDelete.filter(
        (node) => node.type !== ECanvasNodeType.Question && canEditNode(node.data.createdBy, access),
      );
      const allowedNodeIds = new Set(allowedNodes.map((node) => node.id));
      const allowedEdges = edgesToDelete.filter(
        (edge) => edge.selected || allowedNodeIds.has(edge.source) || allowedNodeIds.has(edge.target),
      );

      if (allowedNodes.length === 0 && allowedEdges.length === 0) return false;

      return { nodes: allowedNodes, edges: allowedEdges };
    },
    [],
  );

  return (
    <div
      data-tour="canvas"
      data-canvas-thread={threadId}
      data-canvas-tool={activeTool}
      data-canvas-save={saveState.status}
      className="relative h-full w-full"
    >
      <svg aria-hidden width="0" height="0" style={{ position: 'absolute', overflow: 'hidden' }}>
        <defs>
          {EDGE_TONES.map((tone) => (
            <marker key={tone} id={`canvas-arrow-${tone}`} {...ARROW_MARKER_ATTRIBUTES}>
              <path d={ARROW_PATH_D} fill={edgePalette[tone].marker} />
            </marker>
          ))}
        </defs>
      </svg>

      <ReactFlow
        nodes={displayNodes}
        edges={styledEdges}
        nodeTypes={NODE_TYPES}
        edgeTypes={EDGE_TYPES}
        defaultEdgeOptions={DEFAULT_EDGE_OPTIONS}
        defaultViewport={defaultViewport}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onPaneClick={handlePaneClick}
        onPaneContextMenu={handlePaneContextMenu}
        onNodeContextMenu={handleNodeContextMenu}
        onEdgeContextMenu={handleEdgeContextMenu}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        onNodeDrag={handleNodeDrag}
        onNodeDragStop={handleNodeDragStop}
        onEdgeClick={onEdgeClick}
        onConnect={onConnect}
        onBeforeDelete={handleBeforeDelete}
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
        deleteKeyCode={activeTool === ECanvasTool.Select && canEditCanvas ? SELECT_DELETE_KEYS : null}
        proOptions={PRO_OPTIONS}
      >
        {canvasPattern !== 'none' && (
          <Background
            variant={BACKGROUND_VARIANT_BY_PATTERN[canvasPattern]}
            gap={BACKGROUND_DOT_GAP}
            size={BACKGROUND_SIZE_BY_PATTERN[canvasPattern]}
            color={dotColor}
          />
        )}
        <ReferenceSearchPanel nodes={referenceSearch.nodes} loading={referenceSearch.loading} />
      </ReactFlow>

      {smartGuides && <AlignmentGuides guides={alignmentGuides} />}

      {showRubberLine && (
        <svg aria-hidden className="pointer-events-none fixed inset-0 z-40" width="100%" height="100%">
          <line
            x1={sourceScreen.x}
            y1={sourceScreen.y}
            x2={cursorScreen.x}
            y2={cursorScreen.y}
            stroke={rubberStroke}
            strokeWidth={RUBBER_LINE_STROKE_WIDTH}
            strokeDasharray={RUBBER_LINE_DASH_ARRAY}
            strokeLinecap="round"
          />
          <circle
            cx={cursorScreen.x}
            cy={cursorScreen.y}
            r={RUBBER_LINE_DOT_RADIUS}
            fill={rubberDotFill}
            className="stroke-[color:var(--surface)]"
            strokeWidth={RUBBER_LINE_DOT_STROKE_WIDTH}
          />
        </svg>
      )}

      {contextMenu && <ContextMenu menu={contextMenu} onClose={() => setContextMenu(null)} />}

      {arriving && (
        <>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-30 animate-ref-arrival-glow motion-reduce:hidden"
            style={{
              background: `radial-gradient(ellipse at center, ${accentGlow} 0%, transparent 70%)`,
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-30 animate-ref-arrival-ring motion-reduce:hidden"
          />
        </>
      )}

      {!hydrated && !loadError && <CanvasSkeleton />}

      {loadError && !hydrated && (
        <div
          role="alert"
          aria-live="assertive"
          className="absolute inset-0 z-20 flex items-center justify-center bg-[color:var(--app-bg)]/55 backdrop-blur-sm"
        >
          <div className="flex max-w-sm flex-col items-center gap-2 rounded-2xl border border-[color:var(--status-warning-border)] bg-[color:var(--status-warning-bg)] px-5 py-4 text-center font-grotesk shadow-[var(--shadow-modal)] backdrop-blur-xl">
            <span className="text-[12.5px] font-semibold tracking-tight text-[color:var(--status-warning)]">
              {t.platform.canvas.loadError.title}
            </span>
            <p className="text-[11.5px] leading-snug text-[color:var(--status-warning)] opacity-85">
              {t.platform.canvas.loadError.hint}
            </p>
            <button
              type="button"
              onClick={() => router.refresh()}
              className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-[color:var(--status-warning-soft)] px-3 py-1 font-mono-ui text-[10.5px] tracking-[0.04em] text-[color:var(--status-warning)] lowercase transition-colors duration-150 hover:bg-[color:var(--status-warning-border)] focus-visible:ring-2 focus-visible:ring-[color:var(--ring-focus)] focus-visible:outline-none motion-reduce:transition-none"
            >
              {t.platform.canvas.loadError.retry}
            </button>
          </div>
        </div>
      )}

      {hydrated && <ResolutionBar />}

      {hydrated && <SaveStatus state={saveState} />}
    </div>
  );
};
