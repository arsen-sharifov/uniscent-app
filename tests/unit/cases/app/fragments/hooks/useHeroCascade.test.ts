import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { REDUCED_MOTION_QUERY } from '@constants';
import { stubMediaQueries } from '@mocks/browser';
import { HERO_PHASE_DURATION_MS } from '@/app/fragments/consts';
import { useHeroCascade } from '@/app/fragments/hooks';

let cascade: { current: ReturnType<typeof useHeroCascade> };
let media: ReturnType<typeof stubMediaQueries>;

beforeEach(() => {
  vi.useFakeTimers();
  media = stubMediaQueries();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('useHeroCascade', () => {
  describe('GIVEN the animated reasoning demo', () => {
    beforeEach(() => {
      cascade = renderHook(() => useHeroCascade()).result;
    });

    describe('WHEN the healthy phase is on screen', () => {
      test('THEN the paths from the question to the answer read answer and the loose support stays valid', () => {
        expect(cascade.current.phase).toBe('healthy');
        expect(cascade.current.edgeTones.get('q-p1')).toBe('answer');
        expect(cascade.current.edgeTones.get('q-p2')).toBe('answer');
        expect(cascade.current.edgeTones.get('p1-c1')).toBe('answer');
        expect(cascade.current.edgeTones.get('p2-c1')).toBe('answer');
        expect(cascade.current.edgeTones.get('c1-c2')).toBe('answer');
        expect(cascade.current.edgeTones.get('p3-c1')).toBe('valid');
      });
    });

    describe('WHEN the refutation phase starts', () => {
      beforeEach(() => {
        act(() => vi.advanceTimersByTime(HERO_PHASE_DURATION_MS.healthy));
      });

      test('THEN the premise and its descendants show the consequences', () => {
        expect(cascade.current.phase).toBe('refuted');
        expect(cascade.current.statuses.get('p2')).toBe('invalid');
        expect(cascade.current.statuses.get('c1')).toBe('tainted-valid');
        expect(cascade.current.statuses.get('c2')).toBe('tainted-valid');
        expect(cascade.current.edgeTones.get('q-p2')).toBe('invalid');
        expect(cascade.current.edgeTones.get('p2-c1')).toBe('tainted');
        expect(cascade.current.edgeTones.get('p1-c1')).toBe('valid');
        expect(cascade.current.edgeTones.get('c1-c2')).toBe('invalid');
      });
    });

    describe('WHEN the repair phase follows the refutation', () => {
      beforeEach(() => {
        act(() => vi.advanceTimersByTime(HERO_PHASE_DURATION_MS.healthy));
        act(() => vi.advanceTimersByTime(HERO_PHASE_DURATION_MS.refuted));
      });

      test('THEN the broken dependency is replaced and the answer recovers', () => {
        expect(cascade.current.phase).toBe('repaired');
        expect(cascade.current.statuses.get('p2')).toBe('invalid');
        expect(cascade.current.statuses.get('c2')).toBe('valid');
        expect(cascade.current.edges).not.toContainEqual(expect.objectContaining({ source: 'p2', target: 'c1' }));
        expect(cascade.current.edges).toContainEqual(expect.objectContaining({ source: 'p5', target: 'c1' }));
        expect(cascade.current.edgeTones.get('q-p1')).toBe('answer');
        expect(cascade.current.edgeTones.get('p1-c1')).toBe('answer');
        expect(cascade.current.edgeTones.get('c1-c2')).toBe('answer');
        expect(cascade.current.edgeTones.get('p5-c1')).toBe('valid');
        expect(cascade.current.edgeTones.get('q-p2')).toBe('invalid');
      });
    });

    describe('WHEN reduced motion is enabled during playback', () => {
      beforeEach(() => {
        act(() => media.change(REDUCED_MOTION_QUERY, true));
      });

      test('THEN the stable repaired graph replaces the animation and its timer stops', () => {
        expect(cascade.current.phase).toBe('repaired');
        expect(vi.getTimerCount()).toBe(0);
      });
    });
  });

  describe('GIVEN reduced motion before the demo mounts', () => {
    beforeEach(() => {
      media.change(REDUCED_MOTION_QUERY, true);
      cascade = renderHook(() => useHeroCascade()).result;
    });

    describe('WHEN the viewer restores motion', () => {
      beforeEach(() => {
        act(() => media.change(REDUCED_MOTION_QUERY, false));
        act(() => vi.advanceTimersByTime(HERO_PHASE_DURATION_MS.healthy));
      });

      test('THEN the demo resumes its normal phase sequence', () => {
        expect(cascade.current.phase).toBe('refuted');
      });
    });
  });
});
