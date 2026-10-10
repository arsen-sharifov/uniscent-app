import type { Edge, Node, NodeProps } from '@xyflow/react';

import {
  ECanvasNodeType,
  type IComment,
  type ICanvasNodeData,
  type INodeReference,
  type TCanvasNode,
  type TCanvasOperation,
  type TNodeStatus,
  type TReferenceNode,
} from '@interfaces';

export const THREAD_ID = 'thread-1';

export const createNodeOp = (id: string): TCanvasOperation => ({
  type: 'createCanvasNode',
  id,
  threadId: THREAD_ID,
  x: 0,
  y: 0,
  label: `Node ${id}`,
});

export const updateLabelOp = (id: string, label: string): TCanvasOperation => ({ type: 'updateNodeLabel', id, label });

export const updateStatusOp = (id: string, status: TNodeStatus): TCanvasOperation => ({
  type: 'updateNodeStatus',
  id,
  status,
});

export const updatePositionOp = (id: string, x: number, y: number): TCanvasOperation => ({
  type: 'updateNodePosition',
  id,
  x,
  y,
});

export const updateAnswerOp = (id: string, isAnswer: boolean): TCanvasOperation => ({
  type: 'updateNodeAnswer',
  id,
  isAnswer,
});

export const createEdgeOp = (id: string): TCanvasOperation => ({
  type: 'createEdge',
  id,
  threadId: THREAD_ID,
  source: 'node-a',
  target: 'node-b',
  sourceHandle: 'right',
  targetHandle: 'left',
});

export const createCommentOp = (id: string): TCanvasOperation => ({
  type: 'createComment',
  id,
  nodeId: 'node-a',
  text: `Comment ${id}`,
});

export const deleteNodeOp = (id: string): TCanvasOperation => ({ type: 'deleteNode', id });

export const deleteEdgeOp = (id: string): TCanvasOperation => ({ type: 'deleteEdge', id });

export const deleteCommentOp = (id: string): TCanvasOperation => ({ type: 'deleteComment', id });

export const canvasNode = (id: string, data?: Partial<ICanvasNodeData>): TCanvasNode => ({
  id,
  type: ECanvasNodeType.Canvas,
  position: { x: 0, y: 0 },
  data: { label: `Node ${id}`, status: null, isAnswer: false, comments: [], ...data },
});

export const questionNode = (id: string): TCanvasNode => ({
  id,
  type: ECanvasNodeType.Question,
  position: { x: 0, y: 0 },
  data: { label: 'Main question', status: null, isAnswer: false, comments: [] },
});

export const referenceNode = (id: string): TReferenceNode => ({
  id,
  type: ECanvasNodeType.Reference,
  position: { x: 0, y: 0 },
  data: {
    label: 'Ref',
    sourceNodeId: 'origin',
    sourceNodeLabel: 'Origin node',
    sourceThreadId: 'th-2',
    sourceThreadName: 'Other thread',
    sourceWorkspaceId: 'ws-2',
    sourceWorkspaceName: 'Other workspace',
  },
});

export const createReferenceNodeOp = (id: string): TCanvasOperation => ({
  type: 'createReferenceNode',
  id,
  threadId: THREAD_ID,
  x: 0,
  y: 0,
  data: referenceNode(id).data,
});

export const nodeProps = <TNode extends Node>(node: TNode, selected = false): NodeProps<TNode> =>
  ({
    id: node.id,
    data: node.data,
    selected,
    type: node.type,
    dragging: false,
    zIndex: 0,
    isConnectable: true,
    positionAbsoluteX: 0,
    positionAbsoluteY: 0,
    selectable: true,
    deletable: true,
    draggable: true,
    width: 240,
    height: 96,
  }) as unknown as NodeProps<TNode>;

export const canvasEdge = (id: string, source: string, target: string): Edge => ({
  id,
  source,
  target,
  sourceHandle: 'right',
  targetHandle: 'left',
  type: 'default',
});

export const measuredNode = (id: string, x: number, y: number, width: number, height: number): Node => ({
  id,
  position: { x, y },
  measured: { width, height },
  data: {},
});

export const bareNode = (id: string, x: number, y: number): Node => ({
  id,
  position: { x, y },
  data: {},
});

export const comment = (id: string, overrides?: Partial<IComment>): IComment => ({
  id,
  text: `Comment ${id}`,
  authorId: 'user-1',
  ...overrides,
});

export const nodeReference = (id: string): INodeReference => ({
  id,
  label: `Ref ${id}`,
  threadId: 'thread-2',
  threadName: 'Other thread',
  workspaceId: 'ws-1',
  workspaceName: 'Workspace one',
});
