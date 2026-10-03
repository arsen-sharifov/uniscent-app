import type { Edge, Node, XYPosition } from '@xyflow/react';

import {
  ECanvasNodeType,
  type ICanvasHistoryState,
  type ICanvasNodeData,
  type IComment,
  type TCanvasOperation,
} from '@interfaces';

import { isHandleId } from './handles';
import { isCanvasNodeData, isReferenceNodeData } from './status';

export const toCreateOperations = (
  id: string,
  threadId: string,
  { x, y }: XYPosition,
  { label, status, isAnswer, comments }: ICanvasNodeData,
): TCanvasOperation[] => {
  const operations: TCanvasOperation[] = [{ type: 'createCanvasNode', id, threadId, x, y, label }];

  if (status !== null) operations.push({ type: 'updateNodeStatus', id, status });
  if (isAnswer) operations.push({ type: 'updateNodeAnswer', id, isAnswer });
  comments.forEach((comment) =>
    operations.push({ type: 'createComment', id: comment.id, nodeId: id, text: comment.text }),
  );

  return operations;
};

const diffNodeAdditions = (
  operations: TCanvasOperation[],
  nextNodeMap: Map<string, Node>,
  previousNodeMap: Map<string, Node>,
  threadId: string,
): void => {
  nextNodeMap.forEach((node, id) => {
    if (previousNodeMap.has(id)) return;
    if (node.type === ECanvasNodeType.Question) return;

    if (node.type === ECanvasNodeType.Reference) {
      if (!isReferenceNodeData(node.data)) return;

      operations.push({
        type: 'createReferenceNode',
        id,
        threadId,
        x: node.position.x,
        y: node.position.y,
        data: node.data,
      });

      return;
    }

    if (!isCanvasNodeData(node.data)) return;

    operations.push(...toCreateOperations(id, threadId, node.position, node.data));
  });
};

const diffNodeUpdates = (
  operations: TCanvasOperation[],
  nextNodeMap: Map<string, Node>,
  previousNodeMap: Map<string, Node>,
): void => {
  nextNodeMap.forEach((nextNode, id) => {
    const previousNode = previousNodeMap.get(id);
    if (!previousNode) return;

    if (previousNode.position.x !== nextNode.position.x || previousNode.position.y !== nextNode.position.y) {
      operations.push({
        type: 'updateNodePosition',
        id,
        x: nextNode.position.x,
        y: nextNode.position.y,
      });
    }

    if (!isCanvasNodeData(previousNode.data) || !isCanvasNodeData(nextNode.data)) {
      return;
    }

    if (previousNode.data.label !== nextNode.data.label) {
      operations.push({ type: 'updateNodeLabel', id, label: nextNode.data.label });
    }

    if (previousNode.data.status !== nextNode.data.status) {
      operations.push({
        type: 'updateNodeStatus',
        id,
        status: nextNode.data.status,
      });
    }

    if (previousNode.data.isAnswer !== nextNode.data.isAnswer) {
      operations.push({ type: 'updateNodeAnswer', id, isAnswer: nextNode.data.isAnswer });
    }

    const previousCommentIds = new Set(previousNode.data.comments.map((comment) => comment.id));
    const nextCommentIds = new Set(nextNode.data.comments.map((comment) => comment.id));

    previousNode.data.comments.forEach((comment) => {
      if (nextCommentIds.has(comment.id)) return;
      operations.push({ type: 'deleteComment', id: comment.id });
    });

    nextNode.data.comments.forEach((comment) => {
      if (previousCommentIds.has(comment.id)) return;
      operations.push({
        type: 'createComment',
        id: comment.id,
        nodeId: id,
        text: comment.text,
      });
    });
  });
};

const diffEdges = (
  operations: TCanvasOperation[],
  previous: ICanvasHistoryState,
  next: ICanvasHistoryState,
  threadId: string,
): void => {
  const previousEdgeMap = new Map(previous.edges.map((edge) => [edge.id, edge]));
  const nextEdgeMap = new Map(next.edges.map((edge) => [edge.id, edge]));

  previousEdgeMap.forEach((_, id) => {
    if (!nextEdgeMap.has(id)) operations.push({ type: 'deleteEdge', id });
  });

  nextEdgeMap.forEach((edge, id) => {
    if (previousEdgeMap.has(id)) return;

    const sourceHandle = isHandleId(edge.sourceHandle) ? edge.sourceHandle : 'right';
    const targetHandle = isHandleId(edge.targetHandle) ? edge.targetHandle : 'left';

    operations.push({
      type: 'createEdge',
      id,
      threadId,
      source: edge.source,
      target: edge.target,
      sourceHandle,
      targetHandle,
    });
  });
};

export const diffHistoryStates = (
  previous: ICanvasHistoryState,
  next: ICanvasHistoryState,
  threadId: string | null,
): TCanvasOperation[] => {
  if (!threadId) return [];

  const operations: TCanvasOperation[] = [];
  const previousNodeMap = new Map(previous.nodes.map((node) => [node.id, node]));
  const nextNodeMap = new Map(next.nodes.map((node) => [node.id, node]));

  previousNodeMap.forEach((_, id) => {
    if (!nextNodeMap.has(id)) operations.push({ type: 'deleteNode', id });
  });

  diffNodeAdditions(operations, nextNodeMap, previousNodeMap, threadId);
  diffNodeUpdates(operations, nextNodeMap, previousNodeMap);
  diffEdges(operations, previous, next, threadId);

  return operations;
};

const sameComments = (previous: IComment[], next: IComment[]): boolean =>
  previous.length === next.length &&
  previous.every((comment, index) => {
    const other = next[index];

    return comment.id === other?.id && comment.text === other.text;
  });

const sameNodeContent = (previous: Node, next: Node): boolean => {
  if (previous.position.x !== next.position.x || previous.position.y !== next.position.y) return false;

  if (isCanvasNodeData(previous.data) && isCanvasNodeData(next.data)) {
    return (
      previous.data.label === next.data.label &&
      previous.data.status === next.data.status &&
      previous.data.isAnswer === next.data.isAnswer &&
      sameComments(previous.data.comments, next.data.comments)
    );
  }

  return previous.data === next.data;
};

const sameNodes = (previous: Node[], next: Node[]): boolean =>
  previous.length === next.length &&
  previous.every((node, index) => {
    const other = next[index];

    return other !== undefined && node.id === other.id && sameNodeContent(node, other);
  });

const sameEdges = (previous: Edge[], next: Edge[]): boolean =>
  previous.length === next.length &&
  previous.every((edge, index) => {
    const other = next[index];

    return (
      other !== undefined &&
      edge.id === other.id &&
      edge.source === other.source &&
      edge.target === other.target &&
      edge.sourceHandle === other.sourceHandle &&
      edge.targetHandle === other.targetHandle
    );
  });

export const isSameHistoryState = (previous: ICanvasHistoryState, next: ICanvasHistoryState): boolean =>
  sameNodes(previous.nodes, next.nodes) && sameEdges(previous.edges, next.edges);
