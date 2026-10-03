import { describe, expect, test } from 'vitest';

import { canvasEdge } from '@mocks/canvas';
import { findLinkedNodeIds, getCanvasEdgePath, offsetAlongSide, withReverseEdgeIds } from '@/lib/canvas';

describe('offsetAlongSide', () => {
  describe('GIVEN a point on each side of a node', () => {
    describe('WHEN it is pushed outwards by ten pixels', () => {
      test('THEN it moves along that side normal only', () => {
        expect(offsetAlongSide({ x: 100, y: 200 }, 'top', 10)).toEqual({ x: 100, y: 190 });
        expect(offsetAlongSide({ x: 100, y: 200 }, 'bottom', 10)).toEqual({ x: 100, y: 210 });
        expect(offsetAlongSide({ x: 100, y: 200 }, 'left', 10)).toEqual({ x: 90, y: 200 });
        expect(offsetAlongSide({ x: 100, y: 200 }, 'right', 10)).toEqual({ x: 110, y: 200 });
      });
    });
  });
});

describe('getCanvasEdgePath', () => {
  describe('GIVEN an edge leaving the bottom of one node for the top of another', () => {
    describe('WHEN the path is built', () => {
      test('THEN it starts at the source handle and stops one arrow length short of the target', () => {
        const path = getCanvasEdgePath({
          sourceX: 100,
          sourceY: 200,
          targetX: 300,
          targetY: 400,
          sourceSide: 'bottom',
          targetSide: 'top',
        });

        expect(path.startsWith('M100,200 ')).toBe(true);
        expect(path.endsWith(' 300,390')).toBe(true);
      });
    });
  });

  describe('GIVEN an edge between side handles', () => {
    describe('WHEN the path is built', () => {
      test('THEN the gap is left along the target handle axis', () => {
        const path = getCanvasEdgePath({
          sourceX: 100,
          sourceY: 200,
          targetX: 300,
          targetY: 400,
          sourceSide: 'right',
          targetSide: 'left',
        });

        expect(path.startsWith('M100,200 ')).toBe(true);
        expect(path.endsWith(' 290,400')).toBe(true);
      });
    });
  });

  describe('GIVEN a bidirectional edge that carries an arrowhead on both ends', () => {
    describe('WHEN the path is built', () => {
      test('THEN both ends leave room for their arrowhead', () => {
        const path = getCanvasEdgePath({
          sourceX: 100,
          sourceY: 200,
          targetX: 300,
          targetY: 400,
          sourceSide: 'bottom',
          targetSide: 'top',
          bidirectional: true,
        });

        expect(path.startsWith('M100,210 ')).toBe(true);
        expect(path.endsWith(' 300,390')).toBe(true);
      });
    });
  });

  describe('GIVEN the same endpoints with and without the reverse arrowhead', () => {
    describe('WHEN both paths are built', () => {
      test('THEN the curve is recomputed rather than reused', () => {
        const geometry = {
          sourceX: 100,
          sourceY: 200,
          targetX: 300,
          targetY: 400,
          sourceSide: 'bottom',
          targetSide: 'top',
        } as const;

        expect(getCanvasEdgePath(geometry)).not.toBe(getCanvasEdgePath({ ...geometry, bidirectional: true }));
      });
    });
  });
});

describe('findLinkedNodeIds', () => {
  describe('GIVEN edges between a question and two claims', () => {
    describe('WHEN the linked nodes are collected', () => {
      test('THEN both ends of every edge are included once', () => {
        const edges = [canvasEdge('e1', 'question', 'claim-a'), canvasEdge('e2', 'claim-a', 'claim-b')];

        expect(findLinkedNodeIds(edges)).toEqual(new Set(['question', 'claim-a', 'claim-b']));
      });
    });
  });

  describe('GIVEN the same edges array read twice', () => {
    describe('WHEN the linked nodes are collected again', () => {
      test('THEN the cached set is returned instead of a new one', () => {
        const edges = [canvasEdge('e1', 'question', 'claim-a')];

        expect(findLinkedNodeIds(edges)).toBe(findLinkedNodeIds(edges));
      });
    });
  });
});

describe('withReverseEdgeIds', () => {
  describe('GIVEN a bidirectional pair and an unrelated edge', () => {
    const edges = [canvasEdge('ab', 'a', 'b'), canvasEdge('ba', 'b', 'a'), canvasEdge('bc', 'b', 'c')];

    describe('WHEN one direction of the pair is picked', () => {
      test('THEN its reverse twin joins the ids', () => {
        expect(withReverseEdgeIds(edges, ['ab'])).toEqual(['ab', 'ba']);
      });
    });

    describe('WHEN both directions of the pair are picked', () => {
      test('THEN each id is listed once', () => {
        expect(withReverseEdgeIds(edges, ['ab', 'ba'])).toEqual(['ab', 'ba']);
      });
    });

    describe('WHEN the one-way edge is picked', () => {
      test('THEN only that edge is returned', () => {
        expect(withReverseEdgeIds(edges, ['bc'])).toEqual(['bc']);
      });
    });
  });

  describe('GIVEN an id that no longer matches an edge', () => {
    describe('WHEN it is picked', () => {
      test('THEN it is passed through without twins', () => {
        expect(withReverseEdgeIds([canvasEdge('ab', 'a', 'b')], ['gone'])).toEqual(['gone']);
      });
    });
  });
});
