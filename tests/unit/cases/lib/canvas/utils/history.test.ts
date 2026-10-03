import type { Node } from '@xyflow/react';
import { beforeEach, describe, expect, test } from 'vitest';

import { ECanvasNodeType, type ICanvasHistoryState, type TCanvasOperation } from '@interfaces';

import { THREAD_ID, canvasEdge, canvasNode, comment, questionNode, referenceNode } from '@mocks/canvas';
import { diffHistoryStates, isSameHistoryState, toCreateOperations } from '@/lib/canvas';

const malformedNode = (id: string, type: ECanvasNodeType): Node => ({
  id,
  type,
  position: { x: 0, y: 0 },
  data: { label: 42 },
});

let operations: TCanvasOperation[];
let isSame: boolean;

describe('history', () => {
  describe('GIVEN a commented canvas node marked valid and as the answer', () => {
    describe('WHEN its create operations are built', () => {
      beforeEach(() => {
        operations = toCreateOperations(
          'n1',
          THREAD_ID,
          { x: 10, y: 20 },
          canvasNode('n1', { status: 'valid', isAnswer: true, comments: [comment('c1')] }).data,
        );
      });

      test('THEN the create comes first, followed by the status, the answer mark and the comment', () => {
        expect(operations).toEqual([
          { type: 'createCanvasNode', id: 'n1', threadId: THREAD_ID, x: 10, y: 20, label: 'Node n1' },
          { type: 'updateNodeStatus', id: 'n1', status: 'valid' },
          { type: 'updateNodeAnswer', id: 'n1', isAnswer: true },
          { type: 'createComment', id: 'c1', nodeId: 'n1', text: 'Comment c1' },
        ]);
      });
    });
  });

  describe('GIVEN a canvas holding the question and one that also holds a reference, an answer and an edge', () => {
    const before: ICanvasHistoryState = { nodes: [questionNode('q')], edges: [] };
    const after: ICanvasHistoryState = {
      nodes: [questionNode('q'), referenceNode('ref'), canvasNode('n1', { status: 'valid', isAnswer: true })],
      edges: [canvasEdge('e1', 'q', 'n1')],
    };

    describe('WHEN the step forward is diffed', () => {
      beforeEach(() => {
        operations = diffHistoryStates(before, after, THREAD_ID);
      });

      test('THEN the reference and the answer are created with their marks before the edge', () => {
        expect(operations).toEqual([
          {
            type: 'createReferenceNode',
            id: 'ref',
            threadId: THREAD_ID,
            x: 0,
            y: 0,
            data: referenceNode('ref').data,
          },
          { type: 'createCanvasNode', id: 'n1', threadId: THREAD_ID, x: 0, y: 0, label: 'Node n1' },
          { type: 'updateNodeStatus', id: 'n1', status: 'valid' },
          { type: 'updateNodeAnswer', id: 'n1', isAnswer: true },
          {
            type: 'createEdge',
            id: 'e1',
            threadId: THREAD_ID,
            source: 'q',
            target: 'n1',
            sourceHandle: 'right',
            targetHandle: 'left',
          },
        ]);
      });
    });

    describe('WHEN the step back is diffed', () => {
      beforeEach(() => {
        operations = diffHistoryStates(after, before, THREAD_ID);
      });

      test('THEN both nodes and the edge are deleted', () => {
        expect(operations).toEqual([
          { type: 'deleteNode', id: 'ref' },
          { type: 'deleteNode', id: 'n1' },
          { type: 'deleteEdge', id: 'e1' },
        ]);
      });
    });

    describe('WHEN the step is diffed without a loaded thread', () => {
      beforeEach(() => {
        operations = diffHistoryStates(before, after, null);
      });

      test('THEN no operation is produced', () => {
        expect(operations).toEqual([]);
      });
    });
  });

  describe('GIVEN a node whose position, label, marks and comments all changed', () => {
    const before: ICanvasHistoryState = {
      nodes: [canvasNode('n1', { label: 'Old', comments: [comment('c1')] })],
      edges: [],
    };
    const after: ICanvasHistoryState = {
      nodes: [
        {
          ...canvasNode('n1', { label: 'New', status: 'invalid', isAnswer: true, comments: [comment('c2')] }),
          position: { x: 5, y: 6 },
        },
      ],
      edges: [],
    };

    describe('WHEN the change is diffed', () => {
      beforeEach(() => {
        operations = diffHistoryStates(before, after, THREAD_ID);
      });

      test('THEN each changed field gets its own update and the comments are swapped', () => {
        expect(operations).toEqual([
          { type: 'updateNodePosition', id: 'n1', x: 5, y: 6 },
          { type: 'updateNodeLabel', id: 'n1', label: 'New' },
          { type: 'updateNodeStatus', id: 'n1', status: 'invalid' },
          { type: 'updateNodeAnswer', id: 'n1', isAnswer: true },
          { type: 'deleteComment', id: 'c1' },
          { type: 'createComment', id: 'c2', nodeId: 'n1', text: 'Comment c2' },
        ]);
      });
    });
  });

  describe('GIVEN nodes with malformed data and an edge with unknown handles', () => {
    const before: ICanvasHistoryState = { nodes: [malformedNode('kept', ECanvasNodeType.Canvas)], edges: [] };
    const after: ICanvasHistoryState = {
      nodes: [
        { ...malformedNode('kept', ECanvasNodeType.Canvas), position: { x: 1, y: 1 } },
        malformedNode('canvas', ECanvasNodeType.Canvas),
        malformedNode('reference', ECanvasNodeType.Reference),
      ],
      edges: [{ ...canvasEdge('e1', 'kept', 'canvas'), sourceHandle: 'north', targetHandle: null }],
    };

    describe('WHEN the change is diffed', () => {
      beforeEach(() => {
        operations = diffHistoryStates(before, after, THREAD_ID);
      });

      test('THEN only the move and the edge with default handles are produced', () => {
        expect(operations).toEqual([
          { type: 'updateNodePosition', id: 'kept', x: 1, y: 1 },
          {
            type: 'createEdge',
            id: 'e1',
            threadId: THREAD_ID,
            source: 'kept',
            target: 'canvas',
            sourceHandle: 'right',
            targetHandle: 'left',
          },
        ]);
      });
    });
  });

  describe('GIVEN two states that differ only in selection', () => {
    const reference = referenceNode('ref');

    describe('WHEN they are compared', () => {
      beforeEach(() => {
        isSame = isSameHistoryState(
          { nodes: [canvasNode('n1'), reference], edges: [canvasEdge('e1', 'n1', 'ref')] },
          {
            nodes: [
              { ...canvasNode('n1'), selected: true },
              { ...reference, selected: true },
            ],
            edges: [{ ...canvasEdge('e1', 'n1', 'ref'), selected: true }],
          },
        );
      });

      test('THEN they count as the same history entry', () => {
        expect(isSame).toBe(true);
      });
    });
  });

  describe('GIVEN two states whose only difference is a comment text', () => {
    describe('WHEN they are compared', () => {
      beforeEach(() => {
        isSame = isSameHistoryState(
          { nodes: [canvasNode('n1', { comments: [comment('c1')] })], edges: [] },
          { nodes: [canvasNode('n1', { comments: [comment('c1', { text: 'Edited' })] })], edges: [] },
        );
      });

      test('THEN they are different entries', () => {
        expect(isSame).toBe(false);
      });
    });
  });

  describe('GIVEN two states whose only difference is an edge handle', () => {
    describe('WHEN they are compared', () => {
      beforeEach(() => {
        isSame = isSameHistoryState(
          { nodes: [], edges: [canvasEdge('e1', 'n1', 'n2')] },
          { nodes: [], edges: [{ ...canvasEdge('e1', 'n1', 'n2'), targetHandle: 'top' }] },
        );
      });

      test('THEN they are different entries', () => {
        expect(isSame).toBe(false);
      });
    });
  });
});
