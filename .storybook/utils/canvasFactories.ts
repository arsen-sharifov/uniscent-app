import type { Edge } from '@xyflow/react';

import { ECanvasNodeType, type IComment, type TCanvasNode, type THandleId, type TNodeStatus } from '@interfaces';
import type { ICanvasFixture } from '@story-interfaces';

import { STORYBOOK_AUTHOR_ID } from '../consts';

export const createCanvasNode = (
  id: string,
  x: number,
  y: number,
  label: string,
  status: TNodeStatus = null,
  comments: IComment[] = [],
  selected: boolean = false,
  isAnswer: boolean = false,
): TCanvasNode => ({
  id,
  type: ECanvasNodeType.Canvas,
  position: { x, y },
  selected,
  data: { label, status, isAnswer, comments },
});

export const createQuestionNode = (id: string, label: string, selected: boolean = false): TCanvasNode => ({
  id,
  type: ECanvasNodeType.Question,
  position: { x: 0, y: 0 },
  selected,
  deletable: false,
  data: { label, status: null, isAnswer: false, comments: [] },
});

export const createCanvasEdge = (
  id: string,
  source: string,
  target: string,
  sourceHandle: THandleId = 'bottom',
  targetHandle: THandleId = 'top',
): Edge => ({
  id,
  source,
  target,
  sourceHandle,
  targetHandle,
  type: 'default',
});

export const createComment = (id: string, text: string, authorId: string = STORYBOOK_AUTHOR_ID): IComment => ({
  id,
  text,
  authorId,
});

const denseStatus = (index: number): TNodeStatus => {
  if (index % 5 === 0) return 'valid';
  if (index % 7 === 0) return 'invalid';

  return null;
};

export const buildDenseCanvas = (): ICanvasFixture => ({
  nodes: Array.from({ length: 12 }, (_, index) =>
    createCanvasNode(
      `n${index}`,
      (index % 4) * 240 + 40,
      Math.floor(index / 4) * 170 + 40,
      `Reasoning node ${index + 1}`,
      denseStatus(index),
    ),
  ),
  edges: Array.from({ length: 8 }, (_, index) => createCanvasEdge(`de${index}`, `n${index}`, `n${index + 4}`)),
});
