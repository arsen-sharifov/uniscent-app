import { describe, expect, test } from 'vitest';

import { canvasEdge, canvasNode, questionNode, referenceNode } from '@mocks/canvas';
import {
  computeEdgeTones,
  computeEffectiveStatuses,
  isAffected,
  isCanvasNodeData,
  isReferenceNodeData,
  isThreadResolved,
  pickStrongerTone,
  resolveEdgeTone,
} from '@/lib/canvas';

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

describe('pickStrongerTone', () => {
  describe('GIVEN an invalid and a valid direction', () => {
    describe('WHEN the stronger tone is picked in either order', () => {
      test('THEN the invalid tone wins', () => {
        expect(pickStrongerTone('valid', 'invalid')).toBe('invalid');
        expect(pickStrongerTone('invalid', 'valid')).toBe('invalid');
      });
    });
  });

  describe('GIVEN a tainted and an answer direction', () => {
    describe('WHEN the stronger tone is picked', () => {
      test('THEN the tainted tone wins', () => {
        expect(pickStrongerTone('answer', 'tainted')).toBe('tainted');
      });
    });
  });

  describe('GIVEN an answer and a valid direction', () => {
    describe('WHEN the stronger tone is picked', () => {
      test('THEN the answer tone wins', () => {
        expect(pickStrongerTone('valid', 'answer')).toBe('answer');
      });
    });
  });

  describe('GIVEN a valid and a default direction', () => {
    describe('WHEN the stronger tone is picked', () => {
      test('THEN the valid tone wins', () => {
        expect(pickStrongerTone('default', 'valid')).toBe('valid');
      });
    });
  });

  describe('GIVEN two equal tones', () => {
    describe('WHEN the stronger tone is picked', () => {
      test('THEN that tone is kept', () => {
        expect(pickStrongerTone('default', 'default')).toBe('default');
      });
    });
  });
});

describe('isAffected', () => {
  describe('GIVEN each effective status', () => {
    describe('WHEN it is checked for an invalid dependency', () => {
      test('THEN only the tainted statuses count as affected', () => {
        expect(isAffected('tainted')).toBe(true);
        expect(isAffected('tainted-valid')).toBe(true);
        expect(isAffected('valid')).toBe(false);
        expect(isAffected('invalid')).toBe(false);
        expect(isAffected(null)).toBe(false);
        expect(isAffected(undefined)).toBe(false);
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
      test('THEN the answer stays invalid and affects its descendants', () => {
        const nodes = [canvasNode('n1', { isAnswer: true, status: 'invalid' }), canvasNode('n2')];

        const statuses = computeEffectiveStatuses(nodes, [canvasEdge('e1', 'n1', 'n2')]);

        expect(statuses.get('n1')).toBe('invalid');
        expect(statuses.get('n2')).toBe('tainted');
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

describe('computeEdgeTones', () => {
  describe('GIVEN a resolved answer two valid hops below the question with a valid side branch', () => {
    const nodes = [
      questionNode('q'),
      canvasNode('a', { status: 'valid' }),
      canvasNode('b', { status: 'valid' }),
      canvasNode('answer', { isAnswer: true }),
      canvasNode('side', { status: 'valid' }),
      canvasNode('open'),
    ];
    const edges = [
      canvasEdge('q-a', 'q', 'a'),
      canvasEdge('a-b', 'a', 'b'),
      canvasEdge('b-answer', 'b', 'answer'),
      canvasEdge('a-side', 'a', 'side'),
      canvasEdge('q-open', 'q', 'open'),
    ];

    describe('WHEN the edge tones are computed', () => {
      test('THEN every edge on the path to the answer takes the answer tone', () => {
        const tones = computeEdgeTones(nodes, edges, computeEffectiveStatuses(nodes, edges));

        expect(tones.get('q-a')).toBe('answer');
        expect(tones.get('a-b')).toBe('answer');
        expect(tones.get('b-answer')).toBe('answer');
      });

      test('THEN the valid side branch stays valid and the open branch stays default', () => {
        const tones = computeEdgeTones(nodes, edges, computeEffectiveStatuses(nodes, edges));

        expect(tones.get('a-side')).toBe('valid');
        expect(tones.get('q-open')).toBe('default');
      });
    });
  });

  describe('GIVEN two valid routes from the question that meet at the resolved answer', () => {
    const nodes = [
      questionNode('q'),
      canvasNode('left', { status: 'valid' }),
      canvasNode('right', { status: 'valid' }),
      canvasNode('answer', { isAnswer: true }),
    ];
    const edges = [
      canvasEdge('q-left', 'q', 'left'),
      canvasEdge('q-right', 'q', 'right'),
      canvasEdge('left-answer', 'left', 'answer'),
      canvasEdge('right-answer', 'right', 'answer'),
    ];

    describe('WHEN the edge tones are computed', () => {
      test('THEN both routes take the answer tone', () => {
        const tones = computeEdgeTones(nodes, edges, computeEffectiveStatuses(nodes, edges));

        expect([...tones.values()]).toEqual(['answer', 'answer', 'answer', 'answer']);
      });
    });
  });

  describe('GIVEN a valid node that feeds the resolved answer without a route from the question', () => {
    const nodes = [
      questionNode('q'),
      canvasNode('answer', { isAnswer: true }),
      canvasNode('orphan', { status: 'valid' }),
    ];
    const edges = [canvasEdge('q-answer', 'q', 'answer'), canvasEdge('orphan-answer', 'orphan', 'answer')];

    describe('WHEN the edge tones are computed', () => {
      test('THEN only the edge reached from the question takes the answer tone', () => {
        const tones = computeEdgeTones(nodes, edges, computeEffectiveStatuses(nodes, edges));

        expect(tones.get('q-answer')).toBe('answer');
        expect(tones.get('orphan-answer')).toBe('valid');
      });
    });
  });

  describe('GIVEN an answer affected by a refuted node upstream', () => {
    const nodes = [
      questionNode('q'),
      canvasNode('bad', { status: 'invalid' }),
      canvasNode('support', { status: 'valid' }),
      canvasNode('answer', { isAnswer: true }),
    ];
    const edges = [
      canvasEdge('q-bad', 'q', 'bad'),
      canvasEdge('bad-support', 'bad', 'support'),
      canvasEdge('support-answer', 'support', 'answer'),
    ];

    describe('WHEN the edge tones are computed', () => {
      test('THEN the edge into the false answer turns invalid instead of tainted', () => {
        const tones = computeEdgeTones(nodes, edges, computeEffectiveStatuses(nodes, edges));

        expect(tones.get('support-answer')).toBe('invalid');
        expect(tones.get('bad-support')).toBe('tainted');
        expect(tones.get('q-bad')).toBe('invalid');
      });
    });
  });

  describe('GIVEN an answer that was marked invalid', () => {
    const nodes = [
      questionNode('q'),
      canvasNode('support', { status: 'valid' }),
      canvasNode('answer', { isAnswer: true, status: 'invalid' }),
      canvasNode('follow-up'),
    ];
    const edges = [
      canvasEdge('q-support', 'q', 'support'),
      canvasEdge('support-answer', 'support', 'answer'),
      canvasEdge('answer-follow-up', 'answer', 'follow-up'),
    ];

    describe('WHEN the edge tones are computed', () => {
      test('THEN no edge takes the answer tone and the edges around the answer are invalid', () => {
        const tones = computeEdgeTones(nodes, edges, computeEffectiveStatuses(nodes, edges));

        expect(tones.get('q-support')).toBe('valid');
        expect(tones.get('support-answer')).toBe('invalid');
        expect(tones.get('answer-follow-up')).toBe('invalid');
      });
    });
  });

  describe('GIVEN a canvas without an answer', () => {
    const nodes = [questionNode('q'), canvasNode('a', { status: 'valid' }), canvasNode('b', { status: 'invalid' })];
    const edges = [canvasEdge('q-a', 'q', 'a'), canvasEdge('a-b', 'a', 'b')];

    describe('WHEN the edge tones are computed', () => {
      test('THEN each edge takes the tone of its endpoints', () => {
        const tones = computeEdgeTones(nodes, edges, computeEffectiveStatuses(nodes, edges));

        expect(tones.get('q-a')).toBe('valid');
        expect(tones.get('a-b')).toBe('invalid');
      });
    });
  });
});

describe('isThreadResolved', () => {
  describe('GIVEN an answer linked under the question', () => {
    describe('WHEN the thread is checked', () => {
      test('THEN it is resolved', () => {
        const nodes = [questionNode('q'), canvasNode('answer', { isAnswer: true })];

        expect(isThreadResolved(nodes, [canvasEdge('e1', 'q', 'answer')])).toBe(true);
      });
    });
  });

  describe('GIVEN a canvas without an answer', () => {
    describe('WHEN the thread is checked', () => {
      test('THEN it is not resolved', () => {
        expect(isThreadResolved([questionNode('q'), canvasNode('a', { status: 'valid' })], [])).toBe(false);
      });
    });
  });

  describe('GIVEN an answer that was marked invalid', () => {
    describe('WHEN the thread is checked', () => {
      test('THEN it is not resolved', () => {
        expect(isThreadResolved([canvasNode('answer', { isAnswer: true, status: 'invalid' })], [])).toBe(false);
      });
    });
  });

  describe('GIVEN an answer below a refuted node', () => {
    describe('WHEN the thread is checked', () => {
      test('THEN it is not resolved', () => {
        const nodes = [canvasNode('bad', { status: 'invalid' }), canvasNode('answer', { isAnswer: true })];

        expect(isThreadResolved(nodes, [canvasEdge('e1', 'bad', 'answer')])).toBe(false);
      });
    });
  });
});
