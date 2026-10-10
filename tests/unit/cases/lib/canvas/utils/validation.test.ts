import { describe, expect, test } from 'vitest';

import { ECanvasNodeType } from '@interfaces';

import { canvasEdge, canvasNode, questionNode, referenceNode } from '@mocks/canvas';
import { computeEligibleIds, hasValidatedParent } from '@/lib/canvas';

describe('hasValidatedParent', () => {
  describe('GIVEN a node linked under the question node', () => {
    describe('WHEN the parent chain is checked', () => {
      test('THEN the node counts as validated', () => {
        const nodes = [questionNode('q'), canvasNode('n1')];
        const edges = [canvasEdge('e1', 'q', 'n1')];

        expect(hasValidatedParent('n1', nodes, edges)).toBe(true);
      });
    });
  });

  describe('GIVEN a node linked under a valid node', () => {
    describe('WHEN the parent chain is checked', () => {
      test('THEN the node counts as validated', () => {
        const nodes = [canvasNode('n1', { status: 'valid' }), canvasNode('n2')];
        const edges = [canvasEdge('e1', 'n1', 'n2')];

        expect(hasValidatedParent('n2', nodes, edges)).toBe(true);
      });
    });
  });

  describe('GIVEN a node linked under an unmarked node', () => {
    describe('WHEN the parent chain is checked', () => {
      test('THEN the node does not count as validated', () => {
        const nodes = [canvasNode('n1'), canvasNode('n2')];
        const edges = [canvasEdge('e1', 'n1', 'n2')];

        expect(hasValidatedParent('n2', nodes, edges)).toBe(false);
      });
    });
  });

  describe('GIVEN a node linked under an invalid node', () => {
    describe('WHEN the parent chain is checked', () => {
      test('THEN the node does not count as validated', () => {
        const nodes = [canvasNode('n1', { status: 'invalid' }), canvasNode('n2')];
        const edges = [canvasEdge('e1', 'n1', 'n2')];

        expect(hasValidatedParent('n2', nodes, edges)).toBe(false);
      });
    });
  });

  describe('GIVEN a node linked under a reference node with canvas-shaped data', () => {
    describe('WHEN the parent chain is checked', () => {
      test('THEN the reference parent does not validate the node', () => {
        const nodes = [
          { ...referenceNode('ref'), data: { label: 'Ref', status: 'valid', isAnswer: false, comments: [] } },
          canvasNode('n2'),
        ];
        const edges = [canvasEdge('e1', 'ref', 'n2')];

        expect(hasValidatedParent('n2', nodes, edges)).toBe(false);
      });
    });
  });

  describe('GIVEN a canvas parent with a valid status but malformed data', () => {
    describe('WHEN the parent chain is checked', () => {
      test('THEN the malformed parent does not validate the node', () => {
        const nodes = [
          { id: 'n1', type: ECanvasNodeType.Canvas, position: { x: 0, y: 0 }, data: { status: 'valid' } },
          canvasNode('n2'),
        ];
        const edges = [canvasEdge('e1', 'n1', 'n2')];

        expect(hasValidatedParent('n2', nodes, edges)).toBe(false);
      });
    });
  });

  describe('GIVEN a node with both an invalid and a valid parent', () => {
    describe('WHEN the parent chain is checked', () => {
      test('THEN the valid parent wins', () => {
        const nodes = [
          canvasNode('bad', { status: 'invalid' }),
          canvasNode('good', { status: 'valid' }),
          canvasNode('n2'),
        ];
        const edges = [canvasEdge('e1', 'bad', 'n2'), canvasEdge('e2', 'good', 'n2')];

        expect(hasValidatedParent('n2', nodes, edges)).toBe(true);
      });
    });
  });

  describe('GIVEN a node without parents', () => {
    describe('WHEN the parent chain is checked', () => {
      test('THEN the node does not count as validated', () => {
        expect(hasValidatedParent('n1', [canvasNode('n1')], [])).toBe(false);
      });
    });
  });

  describe('GIVEN an edge pointing from a missing node', () => {
    describe('WHEN the parent chain is checked', () => {
      test('THEN the dangling parent is ignored', () => {
        const nodes = [canvasNode('n2')];
        const edges = [canvasEdge('e1', 'ghost', 'n2')];

        expect(hasValidatedParent('n2', nodes, edges)).toBe(false);
      });
    });
  });
});

describe('computeEligibleIds', () => {
  describe('GIVEN a chain with a valid parent, an unmarked child and an orphan', () => {
    describe('WHEN eligibility for marking valid is computed', () => {
      test('THEN only unmarked nodes with a validated parent qualify', () => {
        const nodes = [
          questionNode('q'),
          canvasNode('n1', { status: 'valid' }),
          canvasNode('n2', { isAnswer: true }),
          canvasNode('n3'),
        ];
        const edges = [canvasEdge('e1', 'q', 'n1'), canvasEdge('e2', 'n1', 'n2')];

        expect(computeEligibleIds(nodes, edges, 'valid')).toEqual(new Set(['n2']));
      });
    });

    describe('WHEN eligibility for marking the answer is computed', () => {
      test('THEN the current answer and orphans are excluded', () => {
        const nodes = [
          questionNode('q'),
          canvasNode('n1', { status: 'valid' }),
          canvasNode('n2', { isAnswer: true }),
          canvasNode('n3'),
        ];
        const edges = [canvasEdge('e1', 'q', 'n1'), canvasEdge('e2', 'n1', 'n2')];

        expect(computeEligibleIds(nodes, edges, 'answer')).toEqual(new Set(['n1']));
      });
    });
  });

  describe('GIVEN an invalid node with a validated parent', () => {
    describe('WHEN eligibility for marking valid is computed', () => {
      test('THEN the invalid node still qualifies', () => {
        const nodes = [questionNode('q'), canvasNode('n1', { status: 'invalid' })];
        const edges = [canvasEdge('e1', 'q', 'n1')];

        expect(computeEligibleIds(nodes, edges, 'valid')).toEqual(new Set(['n1']));
      });
    });
  });

  describe('GIVEN only the question node', () => {
    describe('WHEN eligibility is computed', () => {
      test('THEN nothing qualifies', () => {
        expect(computeEligibleIds([questionNode('q')], [], 'valid')).toEqual(new Set());
      });
    });
  });
});
