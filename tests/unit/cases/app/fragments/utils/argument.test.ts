import { beforeEach, describe, expect, test } from 'vitest';

import type { TEffectiveStatus, THeroTone } from '@interfaces';

import { heroClaim, heroEdge } from '@mocks/landing';
import { collectCascadeDepths, computeClaimStatuses, computeEdgeTones, resolveClaimTone } from '@/app/fragments/utils';

describe('computeClaimStatuses', () => {
  let statuses: Map<string, TEffectiveStatus>;

  describe('GIVEN a validated premise supporting an answer', () => {
    describe('WHEN that premise is refuted', () => {
      beforeEach(() => {
        statuses = computeClaimStatuses(
          [heroClaim('q', { kind: 'question', status: null }), heroClaim('p1'), heroClaim('c1', { isAnswer: true })],
          [heroEdge('q', 'p1'), heroEdge('p1', 'c1')],
          new Set(['p1']),
        );
      });

      test('THEN the answer is affected while the question stays a valid root', () => {
        expect(statuses.get('q')).toBe('valid');
        expect(statuses.get('p1')).toBe('invalid');
        expect(statuses.get('c1')).toBe('tainted-valid');
      });
    });

    describe('WHEN the refuted dependency is removed', () => {
      beforeEach(() => {
        statuses = computeClaimStatuses(
          [heroClaim('p1'), heroClaim('p2'), heroClaim('c1', { isAnswer: true })],
          [heroEdge('p2', 'c1')],
          new Set(['p1']),
        );
      });

      test('THEN the answer recovers without restoring the refuted claim', () => {
        expect(statuses.get('p1')).toBe('invalid');
        expect(statuses.get('c1')).toBe('valid');
      });
    });
  });
});

describe('computeEdgeTones', () => {
  let tones: ReturnType<typeof computeEdgeTones>;

  describe('GIVEN an invalid premise, its affected descendants and a neutral pair', () => {
    describe('WHEN the graph edges are coloured', () => {
      beforeEach(() => {
        tones = computeEdgeTones(
          [
            heroClaim('q', { kind: 'question', status: null }),
            heroClaim('p1'),
            heroClaim('p2', { status: null }),
            heroClaim('c1'),
            heroClaim('c2', { status: null }),
          ],
          [heroEdge('p1', 'c1'), heroEdge('p1', 'c2'), heroEdge('c1', 'c2'), heroEdge('q', 'p2')],
          new Set(['p1']),
          new Map([
            ['p1', 'invalid'],
            ['c1', 'tainted-valid'],
            ['c2', 'tainted'],
          ]),
        );
      });

      test('THEN edges into surviving claims read tainted, edges into lost claims read invalid and neutral edges stay default', () => {
        expect(tones.get('p1-c1')).toBe('tainted');
        expect(tones.get('p1-c2')).toBe('invalid');
        expect(tones.get('c1-c2')).toBe('tainted');
        expect(tones.get('q-p2')).toBe('default');
      });
    });
  });

  describe('GIVEN a question reaching a resolved answer through a valid premise', () => {
    describe('WHEN the graph edges are coloured', () => {
      beforeEach(() => {
        const claims = [
          heroClaim('q', { kind: 'question', status: null }),
          heroClaim('p1'),
          heroClaim('p3'),
          heroClaim('c2', { status: null, isAnswer: true }),
        ];
        const edges = [heroEdge('q', 'p1'), heroEdge('p1', 'c2'), heroEdge('p3', 'c2')];
        const refutedIds = new Set<string>();

        tones = computeEdgeTones(claims, edges, refutedIds, computeClaimStatuses(claims, edges, refutedIds));
      });

      test('THEN the path from the question to the answer reads answer while a side support stays valid', () => {
        expect(tones.get('q-p1')).toBe('answer');
        expect(tones.get('p1-c2')).toBe('answer');
        expect(tones.get('p3-c2')).toBe('valid');
      });
    });
  });

  describe('GIVEN an answer whose support chain starts at a refuted premise', () => {
    describe('WHEN the graph edges are coloured', () => {
      beforeEach(() => {
        const claims = [
          heroClaim('q', { kind: 'question', status: null }),
          heroClaim('p1'),
          heroClaim('c1'),
          heroClaim('c2', { status: null, isAnswer: true }),
        ];
        const edges = [heroEdge('q', 'p1'), heroEdge('p1', 'c1'), heroEdge('c1', 'c2')];
        const refutedIds = new Set(['p1']);

        tones = computeEdgeTones(claims, edges, refutedIds, computeClaimStatuses(claims, edges, refutedIds));
      });

      test('THEN the edge into the false answer reads invalid and no edge reads answer', () => {
        expect(tones.get('q-p1')).toBe('invalid');
        expect(tones.get('p1-c1')).toBe('tainted');
        expect(tones.get('c1-c2')).toBe('invalid');
        expect([...tones.values()]).not.toContain('answer');
      });
    });
  });
});

describe('collectCascadeDepths', () => {
  let depths: Map<string, number>;

  describe('GIVEN converging paths and a cycle', () => {
    describe('WHEN a premise starts a cascade', () => {
      beforeEach(() => {
        depths = collectCascadeDepths(
          [heroEdge('p1', 'c1'), heroEdge('c1', 'c2'), heroEdge('p1', 'c2'), heroEdge('c2', 'p1')],
          new Set(['p1']),
        );
      });

      test('THEN each node uses its shortest distance and the cycle terminates', () => {
        expect([...depths]).toEqual([
          ['p1', 0],
          ['c1', 1],
          ['c2', 1],
        ]);
      });
    });
  });

  describe('GIVEN two refuted roots with a shared descendant', () => {
    describe('WHEN the cascades are combined', () => {
      beforeEach(() => {
        depths = collectCascadeDepths([heroEdge('p1', 'p2'), heroEdge('p2', 'c1')], new Set(['p1', 'p2']));
      });

      test('THEN roots retain depth zero and the shared descendant animates once', () => {
        expect([...depths]).toEqual([
          ['p1', 0],
          ['p2', 0],
          ['c1', 1],
        ]);
      });
    });
  });

  describe('GIVEN a graph with no refuted claims', () => {
    describe('WHEN cascade depths are requested', () => {
      beforeEach(() => {
        depths = collectCascadeDepths([heroEdge('p1', 'c1')], new Set());
      });

      test('THEN no nodes receive a cascade delay', () => {
        expect(depths.size).toBe(0);
      });
    });
  });
});

describe('resolveClaimTone', () => {
  let tone: THeroTone;

  describe('GIVEN an answer supported by a refuted premise', () => {
    describe('WHEN its visible tone is resolved', () => {
      beforeEach(() => {
        tone = resolveClaimTone(heroClaim('c1', { isAnswer: true }), 'tainted-valid');
      });

      test('THEN the affected state takes precedence over the answer badge', () => {
        expect(tone).toBe('affected');
      });
    });
  });

  describe('GIVEN a refuted answer', () => {
    describe('WHEN its visible tone is resolved', () => {
      beforeEach(() => {
        tone = resolveClaimTone(heroClaim('c1', { isAnswer: true }), 'invalid');
      });

      test('THEN the refuted state takes precedence', () => {
        expect(tone).toBe('refuted');
      });
    });
  });
});
