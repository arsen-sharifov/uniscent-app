'use client';

import {
  type Connection,
  type Edge,
  type Node,
  type OnEdgesChange,
  type OnNodesChange,
  type XYPosition,
  applyEdgeChanges,
  applyNodeChanges,
} from '@xyflow/react';
import { temporal } from 'zundo';
import { create } from 'zustand';

import {
  ECanvasNodeType,
  type ICanvasHistoryState,
  type ICanvasNodeData,
  type ICanvasSnapshot,
  type IComment,
  type IReferenceNodeData,
  type TCanvasNode,
  type TFitPadding,
  type TNodeStatus,
  type TReferenceNode,
} from '@interfaces';

import { ECanvasTool } from '@/components/tools';
import {
  CANVAS_HISTORY_LIMIT,
  DUPLICATE_NODE_OFFSET,
  detectPositionChanges,
  diffHistoryStates,
  emitCanvasOperation,
  hasValidatedParent,
  isCanvasNodeData,
  isHandleId,
  isSameHistoryState,
  toCreateOperations,
  withReverseEdgeIds,
} from '@/lib/canvas';
import { canDeleteNode, canEditNode } from '@/lib/utils';

import { usePermissionsStore } from './permissionsStore';

interface ICanvasState extends ICanvasHistoryState {
  threadId: string | null;
  hydrated: boolean;
  activeTool: ECanvasTool;
  pendingConnection: string | null;
  referenceSearchPosition: XYPosition | null;
  editingNodeId: string | null;
  openCommentsNodeId: string | null;
  middlePan: boolean;
  fitRequest: number;
  fitPadding: TFitPadding | null;
}

interface ICanvasStore extends ICanvasState {
  loadCanvas: (threadId: string, snapshot: ICanvasSnapshot) => void;
  clearCanvas: () => void;
  setActiveTool: (tool: ECanvasTool) => void;
  closeAllOverlays: () => void;
  setOpenCommentsNodeId: (id: string | null) => void;
  setMiddlePan: (active: boolean) => void;
  requestFit: (padding?: TFitPadding) => void;
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  addNode: (position: XYPosition, label: string, id?: string) => void;
  addReferenceNode: (position: XYPosition, data: IReferenceNodeData) => void;
  setReferenceSearchPosition: (position: XYPosition | null) => void;
  deleteNode: (id: string) => void;
  deleteEdge: (id: string) => void;
  deleteElements: (nodeIds: string[], edgeIds: string[]) => void;
  connectNodes: (connection: Connection) => void;
  setPendingConnection: (nodeId: string | null) => void;
  setNodeStatus: (id: string, status: TNodeStatus) => void;
  setNodeAnswer: (id: string) => void;
  updateNodeLabel: (id: string, label: string) => void;
  addComment: (nodeId: string, text: string) => void;
  deleteComment: (nodeId: string, commentId: string) => void;
  duplicateNode: (id: string) => void;
  setEditingNodeId: (id: string | null) => void;
  clearNewFlag: (id: string) => void;
  undo: () => void;
  redo: () => void;
}

const CLEARED_OVERLAYS = {
  pendingConnection: null,
  referenceSearchPosition: null,
  editingNodeId: null,
  openCommentsNodeId: null,
} as const;

const EMPTY_CANVAS_STATE: Omit<ICanvasState, 'threadId' | 'hydrated' | 'fitRequest' | 'fitPadding'> = {
  nodes: [],
  edges: [],
  activeTool: ECanvasTool.Select,
  ...CLEARED_OVERLAYS,
  middlePan: false,
};

const INITIAL_STATE: ICanvasState = {
  threadId: null,
  hydrated: false,
  fitRequest: 0,
  fitPadding: null,
  ...EMPTY_CANVAS_STATE,
};

const historyStateOf = (state: ICanvasHistoryState): ICanvasHistoryState => ({
  nodes: state.nodes,
  edges: state.edges,
});

export const useCanvasStore = create<ICanvasStore>()(
  temporal(
    (set, get) => {
      let dragOrigin: Node[] | null = null;

      const appendNode = (node: TCanvasNode | TReferenceNode, extra?: Partial<ICanvasState>) => {
        set({ nodes: [...get().nodes, node], ...extra });
      };

      const patchCanvasNodes = (
        matches: (id: string) => boolean,
        patch: (data: ICanvasNodeData, id: string) => Partial<ICanvasNodeData>,
      ) =>
        set({
          nodes: get().nodes.map((node) =>
            matches(node.id) && isCanvasNodeData(node.data)
              ? { ...node, data: { ...node.data, ...patch(node.data, node.id) } }
              : node,
          ),
        });

      const withoutHistory = (update: () => void) => {
        const temporalApi = useCanvasStore.temporal.getState();
        temporalApi.pause();
        update();
        temporalApi.resume();
      };

      const replayHistoryStep = (step: 'undo' | 'redo') => {
        const before = historyStateOf(get());
        useCanvasStore.temporal.getState()[step]();
        diffHistoryStates(before, historyStateOf(get()), get().threadId).forEach(emitCanvasOperation);
      };

      const resetState = (overrides: Partial<ICanvasState>) => {
        dragOrigin = null;
        withoutHistory(() => {
          set({ ...EMPTY_CANVAS_STATE, ...overrides });
          useCanvasStore.temporal.getState().clear();
        });
      };

      const removeElements = (nodeIds: string[], edgeIds: string[]) => {
        const state = get();
        const access = usePermissionsStore.getState();
        if (!access.canEditCanvas) return;

        const removedNodeIds = new Set(
          state.nodes.filter((node) => nodeIds.includes(node.id) && canDeleteNode(node, access)).map((node) => node.id),
        );
        const pickedEdgeIds = new Set(withReverseEdgeIds(state.edges, edgeIds));
        const isAttached = (edge: Edge) => removedNodeIds.has(edge.source) || removedNodeIds.has(edge.target);
        const removedEdges = state.edges.filter((edge) => pickedEdgeIds.has(edge.id) || isAttached(edge));
        if (removedNodeIds.size === 0 && removedEdges.length === 0) return;

        const isRemovedNode = (id: string | null) => id !== null && removedNodeIds.has(id);

        set({
          nodes: state.nodes.filter((node) => !removedNodeIds.has(node.id)),
          edges: state.edges.filter((edge) => !removedEdges.includes(edge)),
          ...(isRemovedNode(state.editingNodeId) && { editingNodeId: null }),
          ...(isRemovedNode(state.openCommentsNodeId) && { openCommentsNodeId: null }),
          ...(isRemovedNode(state.pendingConnection) && { pendingConnection: null }),
        });
        removedNodeIds.forEach((id) => emitCanvasOperation({ type: 'deleteNode', id }));
        removedEdges
          .filter((edge) => !isAttached(edge))
          .forEach((edge) => emitCanvasOperation({ type: 'deleteEdge', id: edge.id }));
      };

      return {
        ...INITIAL_STATE,

        loadCanvas: (threadId, snapshot) => {
          resetState({
            threadId,
            hydrated: true,
            nodes: snapshot.nodes,
            edges: snapshot.edges,
          });
        },

        clearCanvas: () => resetState({ threadId: null, hydrated: false }),

        setActiveTool: (tool) => {
          const state = get();
          if (state.activeTool === tool) return;

          set({
            activeTool: tool,
            ...(state.nodes.some((node) => node.selected) && {
              nodes: state.nodes.map((node) => (node.selected ? { ...node, selected: false } : node)),
            }),
            ...(state.edges.some((edge) => edge.selected) && {
              edges: state.edges.map((edge) => (edge.selected ? { ...edge, selected: false } : edge)),
            }),
            ...CLEARED_OVERLAYS,
          });
        },

        closeAllOverlays: () => set({ ...CLEARED_OVERLAYS }),

        setEditingNodeId: (id) =>
          set(id === null ? { editingNodeId: null } : { editingNodeId: id, openCommentsNodeId: null }),

        setOpenCommentsNodeId: (id) =>
          set(id === null ? { openCommentsNodeId: null } : { openCommentsNodeId: id, editingNodeId: null }),

        requestFit: (padding) => set((state) => ({ fitRequest: state.fitRequest + 1, fitPadding: padding ?? null })),

        setMiddlePan: (active) => set({ middlePan: active }),

        onNodesChange: (changes) => {
          const previous = get().nodes;
          const { canEditCanvas } = usePermissionsStore.getState();

          const allowed = changes.filter(
            (change) => change.type !== 'remove' && (canEditCanvas || change.type !== 'position'),
          );

          const next = applyNodeChanges(allowed, previous);

          const isDragging = allowed.some((change) => change.type === 'position' && change.dragging === true);
          const positionEnd = allowed.some((change) => change.type === 'position' && change.dragging === false);

          const temporalApi = useCanvasStore.temporal.getState();

          if (isDragging) {
            dragOrigin ??= previous;
            temporalApi.pause();
            set({ nodes: next });

            return;
          }

          if (positionEnd) {
            const origin = dragOrigin ?? previous;
            dragOrigin = null;

            withoutHistory(() => set({ nodes: origin }));
            set({ nodes: next });

            detectPositionChanges(origin, next).forEach((change) =>
              emitCanvasOperation({
                type: 'updateNodePosition',
                id: change.id,
                x: change.x,
                y: change.y,
              }),
            );

            return;
          }

          set({ nodes: next });
        },

        onEdgesChange: (changes) =>
          set({
            edges: applyEdgeChanges(
              changes.filter((change) => change.type !== 'remove'),
              get().edges,
            ),
          }),

        addNode: (position, label, id = crypto.randomUUID()) => {
          const { threadId } = get();
          if (!threadId) return;

          const access = usePermissionsStore.getState();
          if (!access.canEditCanvas) return;

          const newNode: TCanvasNode = {
            id,
            type: ECanvasNodeType.Canvas,
            position,
            data: {
              label,
              status: null,
              isAnswer: false,
              comments: [],
              createdBy: access.userId ?? undefined,
              isNew: true,
            },
          };

          appendNode(newNode);
          toCreateOperations(id, threadId, position, newNode.data).forEach(emitCanvasOperation);
        },

        addReferenceNode: (position, data) => {
          const { threadId } = get();
          if (!threadId) return;

          const access = usePermissionsStore.getState();
          if (!access.canEditCanvas) return;

          const id = crypto.randomUUID();
          const newNode: TReferenceNode = {
            id,
            type: ECanvasNodeType.Reference,
            position,
            data: { ...data, createdBy: access.userId ?? undefined },
          };

          appendNode(newNode, { referenceSearchPosition: null });
          emitCanvasOperation({
            type: 'createReferenceNode',
            id,
            threadId,
            x: position.x,
            y: position.y,
            data,
          });
        },

        setReferenceSearchPosition: (position) => set({ referenceSearchPosition: position }),

        deleteNode: (id) => removeElements([id], []),

        deleteEdge: (id) => removeElements([], [id]),

        deleteElements: removeElements,

        connectNodes: (connection) => {
          const { source, target } = connection;
          const cancel = () => set({ pendingConnection: null });

          if (!usePermissionsStore.getState().canEditCanvas) return cancel();
          if (!source || !target || source === target) return cancel();

          const sourceHandle = connection.sourceHandle ?? 'right';
          const targetHandle = connection.targetHandle ?? 'left';

          if (!isHandleId(sourceHandle) || !isHandleId(targetHandle)) {
            return cancel();
          }

          const { edges, threadId } = get();
          if (!threadId) return cancel();

          const isDuplicate = edges.some((edge) => edge.source === source && edge.target === target);
          if (isDuplicate) return cancel();

          const id = crypto.randomUUID();
          const newEdge: Edge = {
            id,
            source,
            target,
            sourceHandle,
            targetHandle,
            type: 'default',
          };

          set({
            edges: [...edges, newEdge],
            pendingConnection: null,
          });

          emitCanvasOperation({
            type: 'createEdge',
            id,
            threadId,
            source,
            target,
            sourceHandle,
            targetHandle,
          });
        },

        setPendingConnection: (nodeId) => set({ pendingConnection: nodeId }),

        setNodeStatus: (id, status) => {
          if (!usePermissionsStore.getState().canEditCanvas) return;

          const { nodes, edges } = get();
          const target = nodes.find((node) => node.id === id);
          if (target?.type !== ECanvasNodeType.Canvas || !isCanvasNodeData(target.data)) return;

          const nextStatus: TNodeStatus = target.data.status === status ? null : status;
          if (nextStatus === 'valid' && !hasValidatedParent(id, nodes, edges)) return;

          patchCanvasNodes(
            (nodeId) => nodeId === id,
            () => ({ status: nextStatus }),
          );
          emitCanvasOperation({ type: 'updateNodeStatus', id, status: nextStatus });
        },

        setNodeAnswer: (id) => {
          if (!usePermissionsStore.getState().canEditCanvas) return;

          const currentNodes = get().nodes;
          const target = currentNodes.find((node) => node.id === id);
          if (target?.type !== ECanvasNodeType.Canvas || !isCanvasNodeData(target.data)) return;

          const nextValue = !target.data.isAnswer;
          if (nextValue && !hasValidatedParent(id, currentNodes, get().edges)) return;

          const answerFor = (nodeId: string) => nodeId === id && nextValue;
          const changedIds = new Set(
            currentNodes
              .filter((node) => isCanvasNodeData(node.data) && (node.id === id || (nextValue && node.data.isAnswer)))
              .map((node) => node.id),
          );

          patchCanvasNodes(
            (nodeId) => changedIds.has(nodeId),
            (_, nodeId) => ({ isAnswer: answerFor(nodeId) }),
          );
          changedIds.forEach((changedId) =>
            emitCanvasOperation({ type: 'updateNodeAnswer', id: changedId, isAnswer: answerFor(changedId) }),
          );
        },

        updateNodeLabel: (id, label) => {
          const target = get().nodes.find((node) => node.id === id);
          if (!target || !isCanvasNodeData(target.data)) return;
          if (!canEditNode(target.data.createdBy, usePermissionsStore.getState())) return;

          patchCanvasNodes(
            (nodeId) => nodeId === id,
            () => ({ label }),
          );
          emitCanvasOperation({ type: 'updateNodeLabel', id, label });
        },

        duplicateNode: (id) => {
          const { nodes, threadId } = get();
          if (!threadId) return;

          const access = usePermissionsStore.getState();
          if (!access.canEditCanvas) return;

          const source = nodes.find((node) => node.id === id);
          if (source?.type !== ECanvasNodeType.Canvas) return;
          if (!isCanvasNodeData(source.data)) return;

          const newNodeId = crypto.randomUUID();
          const position = {
            x: source.position.x + DUPLICATE_NODE_OFFSET,
            y: source.position.y + DUPLICATE_NODE_OFFSET,
          };
          const data: ICanvasNodeData = {
            label: source.data.label,
            status: source.data.status,
            isAnswer: false,
            comments: [],
            createdBy: access.userId ?? undefined,
            isNew: true,
          };

          appendNode({
            id: newNodeId,
            type: ECanvasNodeType.Canvas,
            position,
            data,
          } satisfies TCanvasNode);
          toCreateOperations(newNodeId, threadId, position, data).forEach(emitCanvasOperation);
        },

        addComment: (nodeId, text) => {
          const { userId, canComment } = usePermissionsStore.getState();
          if (!userId || !canComment) return;

          const id = crypto.randomUUID();
          const comment: IComment = { id, text, authorId: userId };

          patchCanvasNodes(
            (candidateId) => candidateId === nodeId,
            (data) => ({ comments: [...data.comments, comment] }),
          );

          emitCanvasOperation({ type: 'createComment', id, nodeId, text });
        },

        deleteComment: (nodeId, commentId) => {
          const { canComment, userId } = usePermissionsStore.getState();
          if (!canComment) return;

          const target = get().nodes.find((node) => node.id === nodeId);
          const comment =
            target && isCanvasNodeData(target.data)
              ? target.data.comments.find((comment) => comment.id === commentId)
              : null;
          if (comment?.authorId !== userId) return;

          patchCanvasNodes(
            (id) => id === nodeId,
            (data) => ({ comments: data.comments.filter((comment) => comment.id !== commentId) }),
          );
          emitCanvasOperation({ type: 'deleteComment', id: commentId });
        },

        clearNewFlag: (id) => {
          const target = get().nodes.find((node) => node.id === id);
          if (!target || !('isNew' in target.data)) return;

          set({
            nodes: get().nodes.map((node) => {
              if (node.id !== id) return node;
              const data = { ...node.data };
              delete data.isNew;

              return { ...node, data };
            }),
          });
        },

        undo: () => replayHistoryStep('undo'),

        redo: () => replayHistoryStep('redo'),
      };
    },
    {
      partialize: (state) => historyStateOf(state),
      limit: CANVAS_HISTORY_LIMIT,
      equality: isSameHistoryState,
    },
  ),
);
