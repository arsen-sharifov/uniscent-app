import { describe, expect, test } from 'vitest';

import { canvasEdge, canvasNode, questionNode, referenceNode } from '@mocks/canvas';
import { NODE_ALARM_WASHES } from '@/components/Canvas/consts';
import {
  collectStatusTargetIds,
  computeEffectiveStatuses,
  isCanvasNodeData,
  isReferenceNodeData,
  resolveBidirectionalEdgeTone,
  resolveEdgeTone,
  resolveNodeWashStyle,
} from '@/components/Canvas/utils';

describe('isCanvasNodeData', () => {
  describe('GIVEN a complete canvas node data object', () => {
    describe('WHEN the shape is checked', () => {
      test('THEN every allowed status passes', () => {
        expect(isCanvasNodeData(canvasNode('n1').data)).toBe(true);
        expect(isCanvasNodeData(canvasNode('n1', { status: 'valid' }).data)).toBe(true);
        expect(isCanvasNodeData(canvasNode('n1', { status: 'invalid' }).data)).toBe(true);
      });
    });
  });

  describe('GIVEN data with an unknown status value', () => {
    describe('WHEN the shape is checked', () => {
      test('THEN it fails', () => {
        expect(isCanvasNodeData({ ...canvasNode('n1').data, status: 'tainted' })).toBe(false);
      });
    });
  });

  describe('GIVEN data without a label', () => {
    describe('WHEN the shape is checked', () => {
      test('THEN it fails', () => {
        expect(isCanvasNodeData({ ...canvasNode('n1').data, label: undefined })).toBe(false);
      });
    });
  });

  describe('GIVEN data with comments that are not an array', () => {
    describe('WHEN the shape is checked', () => {
      test('THEN it fails', () => {
        expect(isCanvasNodeData({ ...canvasNode('n1').data, comments: 'none' })).toBe(false);
      });
    });
  });
});

describe('isReferenceNodeData', () => {
  describe('GIVEN a complete reference node data object', () => {
    describe('WHEN the shape is checked', () => {
      test('THEN it passes', () => {
        expect(isReferenceNodeData(referenceNode('ref').data)).toBe(true);
      });
    });
  });

  describe('GIVEN data with any required field missing', () => {
    describe('WHEN the shape is checked', () => {
      test('THEN each missing field fails the guard', () => {
        const fields = [
          'label',
          'sourceNodeId',
          'sourceNodeLabel',
          'sourceThreadId',
          'sourceThreadName',
          'sourceWorkspaceId',
          'sourceWorkspaceName',
        ] as const;

        fields.forEach((field) => {
          expect(isReferenceNodeData({ ...referenceNode('ref').data, [field]: undefined })).toBe(false);
        });
      });
    });
  });
});

describe('collectStatusTargetIds', () => {
  describe('GIVEN several selected canvas nodes including the clicked one', () => {
    describe('WHEN targets are collected', () => {
      test('THEN the whole selection is targeted', () => {
        const nodes = [
          { ...canvasNode('n1'), selected: true },
          { ...canvasNode('n2'), selected: true },
          canvasNode('n3'),
        ];

        expect(collectStatusTargetIds(nodes, 'n1')).toEqual(['n1', 'n2']);
      });
    });
  });

  describe('GIVEN a selection that does not include the clicked node', () => {
    describe('WHEN targets are collected', () => {
      test('THEN only the clicked node is targeted', () => {
        const nodes = [
          { ...canvasNode('n1'), selected: true },
          { ...canvasNode('n2'), selected: true },
          canvasNode('n3'),
        ];

        expect(collectStatusTargetIds(nodes, 'n3')).toEqual(['n3']);
      });
    });
  });

  describe('GIVEN a selection containing the question node', () => {
    describe('WHEN targets are collected', () => {
      test('THEN non-canvas nodes are ignored', () => {
        const nodes = [
          { ...questionNode('q'), selected: true },
          { ...canvasNode('n1'), selected: true },
          canvasNode('n2'),
        ];

        expect(collectStatusTargetIds(nodes, 'n1')).toEqual(['n1']);
      });
    });
  });
});

describe('resolveNodeWashStyle', () => {
  describe('GIVEN an alarm tone', () => {
    describe('WHEN the node is at rest', () => {
      test('THEN the tone wash is painted as a flat background layer', () => {
        expect(resolveNodeWashStyle('invalid', false)).toEqual({
          backgroundImage: `linear-gradient(${NODE_ALARM_WASHES.invalid}, ${NODE_ALARM_WASHES.invalid})`,
        });
        expect(resolveNodeWashStyle('affected', false)).toEqual({
          backgroundImage: `linear-gradient(${NODE_ALARM_WASHES.affected}, ${NODE_ALARM_WASHES.affected})`,
        });
      });
    });

    describe('WHEN the node is being edited', () => {
      test('THEN no wash is painted', () => {
        expect(resolveNodeWashStyle('invalid', true)).toBeUndefined();
      });
    });
  });

  describe('GIVEN a calm tone or no tone at all', () => {
    describe('WHEN the node is at rest', () => {
      test('THEN no wash is painted', () => {
        expect(resolveNodeWashStyle('valid', false)).toBeUndefined();
        expect(resolveNodeWashStyle('answer', false)).toBeUndefined();
        expect(resolveNodeWashStyle(undefined, false)).toBeUndefined();
      });
    });
  });
});

describe('resolveEdgeTone', () => {
  describe('GIVEN an invalid source', () => {
    describe('WHEN the target is valid', () => {
      test('THEN the edge is tainted', () => {
        expect(resolveEdgeTone('invalid', 'valid')).toBe('tainted');
      });
    });

    describe('WHEN the target is unmarked', () => {
      test('THEN the edge is invalid', () => {
        expect(resolveEdgeTone('invalid', null)).toBe('invalid');
      });
    });
  });

  describe('GIVEN an invalid source with a tainted-valid target', () => {
    describe('WHEN the tone is resolved', () => {
      test('THEN the edge is tainted', () => {
        expect(resolveEdgeTone('invalid', 'tainted-valid')).toBe('tainted');
      });
    });
  });

  describe('GIVEN a tainted source', () => {
    describe('WHEN the target is anything', () => {
      test('THEN the edge is tainted', () => {
        expect(resolveEdgeTone('tainted', 'valid')).toBe('tainted');
        expect(resolveEdgeTone('tainted-valid', null)).toBe('tainted');
      });
    });
  });

  describe('GIVEN a valid source', () => {
    describe('WHEN the target is invalid', () => {
      test('THEN the edge is invalid', () => {
        expect(resolveEdgeTone('valid', 'invalid')).toBe('invalid');
      });
    });

    describe('WHEN the target is marked valid in any form', () => {
      test('THEN the edge is valid', () => {
        expect(resolveEdgeTone('valid', 'valid')).toBe('valid');
        expect(resolveEdgeTone('valid', 'tainted')).toBe('valid');
        expect(resolveEdgeTone('valid', 'tainted-valid')).toBe('valid');
      });
    });

    describe('WHEN the target is unmarked', () => {
      test('THEN the edge is default', () => {
        expect(resolveEdgeTone('valid', null)).toBe('default');
      });
    });
  });

  describe('GIVEN an unmarked source', () => {
    describe('WHEN the target is valid', () => {
      test('THEN the edge is default', () => {
        expect(resolveEdgeTone(null, 'valid')).toBe('default');
      });
    });
  });
});

describe('resolveBidirectionalEdgeTone', () => {
  describe('GIVEN a valid and an invalid endpoint', () => {
    describe('WHEN the tone is resolved in both directions', () => {
      test('THEN the more severe tone wins', () => {
        expect(resolveBidirectionalEdgeTone('valid', 'invalid')).toBe('invalid');
        expect(resolveBidirectionalEdgeTone('invalid', 'valid')).toBe('invalid');
      });
    });
  });

  describe('GIVEN two valid endpoints', () => {
    describe('WHEN the tone is resolved', () => {
      test('THEN the edge is valid', () => {
        expect(resolveBidirectionalEdgeTone('valid', 'valid')).toBe('valid');
      });
    });
  });

  describe('GIVEN two unmarked endpoints', () => {
    describe('WHEN the tone is resolved', () => {
      test('THEN the edge is default', () => {
        expect(resolveBidirectionalEdgeTone(null, null)).toBe('default');
      });
    });
  });
});

describe('computeEffectiveStatuses', () => {
  describe('GIVEN a chain without invalid nodes', () => {
    describe('WHEN effective statuses are computed', () => {
      test('THEN nodes keep their own statuses and the question is valid', () => {
        const nodes = [questionNode('q'), canvasNode('n1', { status: 'valid' }), canvasNode('n2')];
        const edges = [canvasEdge('e1', 'q', 'n1'), canvasEdge('e2', 'n1', 'n2')];

        const statuses = computeEffectiveStatuses(nodes, edges);

        expect(statuses.get('q')).toBe('valid');
        expect(statuses.get('n1')).toBe('valid');
        expect(statuses.get('n2')).toBeNull();
      });
    });
  });

  describe('GIVEN an invalid node with a downstream chain', () => {
    describe('WHEN effective statuses are computed', () => {
      test('THEN valid descendants become tainted-valid and unmarked ones tainted', () => {
        const nodes = [canvasNode('bad', { status: 'invalid' }), canvasNode('v', { status: 'valid' }), canvasNode('u')];
        const edges = [canvasEdge('e1', 'bad', 'v'), canvasEdge('e2', 'v', 'u')];

        const statuses = computeEffectiveStatuses(nodes, edges);

        expect(statuses.get('bad')).toBe('invalid');
        expect(statuses.get('v')).toBe('tainted-valid');
        expect(statuses.get('u')).toBe('tainted');
      });
    });
  });

  describe('GIVEN an invalid node pointing at another invalid node with a valid child', () => {
    describe('WHEN effective statuses are computed', () => {
      test('THEN the downstream invalid keeps its status and still taints its own children', () => {
        const nodes = [
          canvasNode('a', { status: 'invalid' }),
          canvasNode('b', { status: 'invalid' }),
          canvasNode('c', { status: 'valid' }),
        ];
        const edges = [canvasEdge('e1', 'a', 'b'), canvasEdge('e2', 'b', 'c')];

        const statuses = computeEffectiveStatuses(nodes, edges);

        expect(statuses.get('b')).toBe('invalid');
        expect(statuses.get('c')).toBe('tainted-valid');
      });
    });
  });

  describe('GIVEN an invalid chain that cycles back to its start', () => {
    describe('WHEN effective statuses are computed', () => {
      test('THEN the traversal terminates and the cycle edge is ignored', () => {
        const nodes = [canvasNode('a', { status: 'invalid' }), canvasNode('b', { status: 'valid' }), canvasNode('c')];
        const edges = [canvasEdge('e1', 'a', 'b'), canvasEdge('e2', 'b', 'c'), canvasEdge('e3', 'c', 'a')];

        const statuses = computeEffectiveStatuses(nodes, edges);

        expect(statuses.get('a')).toBe('invalid');
        expect(statuses.get('b')).toBe('tainted-valid');
        expect(statuses.get('c')).toBe('tainted');
      });
    });
  });

  describe('GIVEN a reference node in the canvas', () => {
    describe('WHEN effective statuses are computed', () => {
      test('THEN the reference node stays out of the result map', () => {
        const statuses = computeEffectiveStatuses([canvasNode('n1', { status: 'valid' }), referenceNode('ref')], []);

        expect(statuses.has('ref')).toBe(false);
        expect(statuses.get('n1')).toBe('valid');
      });
    });
  });

  describe('GIVEN an answer node with an explicit invalid status', () => {
    describe('WHEN effective statuses are computed', () => {
      test('THEN the answer overrides the invalid status', () => {
        const statuses = computeEffectiveStatuses([canvasNode('n1', { isAnswer: true, status: 'invalid' })], []);

        expect(statuses.get('n1')).toBe('valid');
      });
    });
  });

  describe('GIVEN an answer node', () => {
    describe('WHEN effective statuses are computed', () => {
      test('THEN the answer counts as valid', () => {
        const statuses = computeEffectiveStatuses([canvasNode('n1', { isAnswer: true })], []);

        expect(statuses.get('n1')).toBe('valid');
      });
    });
  });
});
