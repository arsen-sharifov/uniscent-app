import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import {
  canvasEdge,
  canvasNode,
  createCommentOp,
  createEdgeOp,
  createNodeOp,
  createReferenceNodeOp,
  deleteNodeOp,
  updateAnswerOp,
  updateStatusOp,
} from '@mocks/canvas';
import { addUserBadge } from '@mocks/userApi';
import { hydrateBadges, useBadgeStore, watchCanvasBadges } from '@/lib/badges';
import { emitCanvasOperation } from '@/lib/canvas';
import { useCanvasStore } from '@/lib/stores';

vi.mock('@api/client', () => import('@mocks/userApi'));
vi.mock('@/lib/events', () => import('@mocks/events'));

const AFTERNOON = new Date(2026, 9, 3, 15, 0);
const unwatchers: Array<() => void> = [];

const earnedOnCanvas = () => useBadgeStore.getState().earned?.filter((id) => id !== 'founder');

const nodes = (count: number) => Array.from({ length: count }, (_, index) => canvasNode(`n${index}`));

const edges = (count: number) => Array.from({ length: count }, (_, index) => canvasEdge(`e${index}`, 'n0', 'n1'));

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(AFTERNOON);
  addUserBadge.mockResolvedValue(undefined);
  useCanvasStore.setState({ nodes: [], edges: [] });
  hydrateBadges(['founder']);
  unwatchers.push(watchCanvasBadges());
});

afterEach(() => {
  unwatchers.splice(0).forEach((unwatch) => unwatch());
  useBadgeStore.getState().forget();
  vi.useRealTimers();
});

describe('canvas badges', () => {
  describe('GIVEN a canvas with 24 nodes', () => {
    beforeEach(() => {
      useCanvasStore.setState({ nodes: nodes(24) });
    });

    describe('WHEN a node is added in the afternoon', () => {
      beforeEach(() => {
        emitCanvasOperation(createNodeOp('n24'));
      });

      test('THEN no badge is earned', () => {
        expect(earnedOnCanvas()).toEqual([]);
      });
    });
  });

  describe('GIVEN a canvas that reached 25 nodes', () => {
    beforeEach(() => {
      useCanvasStore.setState({ nodes: nodes(25) });
    });

    describe('WHEN the last node is added', () => {
      beforeEach(() => {
        emitCanvasOperation(createNodeOp('n24'));
      });

      test('THEN Architect is earned', () => {
        expect(earnedOnCanvas()).toEqual(['architect']);
      });
    });
  });

  describe('GIVEN it is past midnight', () => {
    beforeEach(() => {
      vi.setSystemTime(new Date(2026, 9, 3, 2, 30));
    });

    describe('WHEN a node is added', () => {
      beforeEach(() => {
        emitCanvasOperation(createNodeOp('n1'));
      });

      test('THEN Night owl is earned', () => {
        expect(earnedOnCanvas()).toEqual(['nightOwl']);
      });
    });
  });

  describe('GIVEN it is five in the morning', () => {
    beforeEach(() => {
      vi.setSystemTime(new Date(2026, 9, 3, 5, 0));
    });

    describe('WHEN a node is added', () => {
      beforeEach(() => {
        emitCanvasOperation(createNodeOp('n1'));
      });

      test('THEN Night owl is not earned', () => {
        expect(earnedOnCanvas()).toEqual([]);
      });
    });
  });

  describe('GIVEN an open canvas', () => {
    describe('WHEN a cross-canvas reference is dropped', () => {
      beforeEach(() => {
        emitCanvasOperation(createReferenceNodeOp('r1'));
      });

      test('THEN Curator is earned', () => {
        expect(earnedOnCanvas()).toEqual(['curator']);
      });
    });

    describe('WHEN a comment is posted', () => {
      beforeEach(() => {
        emitCanvasOperation(createCommentOp('c1'));
      });

      test('THEN Voice is earned', () => {
        expect(earnedOnCanvas()).toEqual(['voice']);
      });
    });

    describe('WHEN a node is marked as the answer', () => {
      beforeEach(() => {
        emitCanvasOperation(updateAnswerOp('n1', true));
      });

      test('THEN Verdict is earned', () => {
        expect(earnedOnCanvas()).toEqual(['verdict']);
      });
    });

    describe('WHEN the answer is unmarked', () => {
      beforeEach(() => {
        emitCanvasOperation(updateAnswerOp('n1', false));
      });

      test('THEN no badge is earned', () => {
        expect(earnedOnCanvas()).toEqual([]);
      });
    });

    describe('WHEN a node is deleted', () => {
      beforeEach(() => {
        emitCanvasOperation(deleteNodeOp('n1'));
      });

      test('THEN no badge is earned', () => {
        expect(earnedOnCanvas()).toEqual([]);
      });
    });
  });

  describe('GIVEN a canvas with 14 connections', () => {
    beforeEach(() => {
      useCanvasStore.setState({ edges: edges(14) });
    });

    describe('WHEN a connection is drawn', () => {
      beforeEach(() => {
        emitCanvasOperation(createEdgeOp('e14'));
      });

      test('THEN no badge is earned', () => {
        expect(earnedOnCanvas()).toEqual([]);
      });
    });
  });

  describe('GIVEN a canvas that reached 15 connections', () => {
    beforeEach(() => {
      useCanvasStore.setState({ edges: edges(15) });
    });

    describe('WHEN the last connection is drawn', () => {
      beforeEach(() => {
        emitCanvasOperation(createEdgeOp('e14'));
      });

      test('THEN Connector is earned', () => {
        expect(earnedOnCanvas()).toEqual(['connector']);
      });
    });
  });

  describe('GIVEN a canvas with only valid paths', () => {
    beforeEach(() => {
      useCanvasStore.setState({
        nodes: [canvasNode('n1', { status: 'valid' }), canvasNode('n2', { status: 'valid' })],
      });
    });

    describe('WHEN a path is marked valid', () => {
      beforeEach(() => {
        emitCanvasOperation(updateStatusOp('n2', 'valid'));
      });

      test('THEN no badge is earned', () => {
        expect(earnedOnCanvas()).toEqual([]);
      });
    });
  });

  describe('GIVEN a canvas mixing valid and invalid paths', () => {
    beforeEach(() => {
      useCanvasStore.setState({
        nodes: [canvasNode('n1', { status: 'valid' }), canvasNode('n2', { status: 'invalid' })],
      });
    });

    describe('WHEN the invalid mark lands', () => {
      beforeEach(() => {
        emitCanvasOperation(updateStatusOp('n2', 'invalid'));
      });

      test('THEN Critic and Weaver are earned', () => {
        expect(earnedOnCanvas()).toEqual(['critic', 'weaver']);
      });
    });
  });

  describe('GIVEN the watcher was stopped', () => {
    beforeEach(() => {
      unwatchers.splice(0).forEach((unwatch) => unwatch());
    });

    describe('WHEN a comment is posted', () => {
      beforeEach(() => {
        emitCanvasOperation(createCommentOp('c1'));
      });

      test('THEN no badge is earned', () => {
        expect(earnedOnCanvas()).toEqual([]);
      });
    });
  });
});
