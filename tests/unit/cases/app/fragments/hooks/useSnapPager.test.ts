import { act, cleanup, fireEvent, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { REDUCED_MOTION_QUERY } from '@constants';
import { stubMediaQueries } from '@mocks/browser';
import { landingPager } from '@mocks/landing';
import { useSnapPager } from '@/app/fragments/hooks';

const scrollTo = vi.fn();

let pager: ReturnType<typeof landingPager>;
let media: ReturnType<typeof stubMediaQueries>;

beforeEach(() => {
  vi.useFakeTimers();
  media = stubMediaQueries();
  pager = landingPager();
  pager.container.scrollTo = scrollTo;
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('useSnapPager', () => {
  describe('GIVEN an active section transition', () => {
    beforeEach(() => {
      renderHook(() => useSnapPager(pager.ref));
      fireEvent.wheel(pager.container, { deltaY: 100 });
    });

    describe('WHEN reduced motion is enabled before scrolling settles', () => {
      beforeEach(() => {
        act(() => media.change(REDUCED_MOTION_QUERY, true));
      });

      test('THEN scroll snapping is restored and no timeout remains', () => {
        expect(scrollTo).toHaveBeenCalledOnce();
        expect(pager.container.style.scrollSnapType).toBe('');
        expect(vi.getTimerCount()).toBe(0);
      });
    });

    describe('WHEN the pager unmounts before scrolling settles', () => {
      beforeEach(() => {
        cleanup();
      });

      test('THEN scroll snapping is restored and no timeout remains', () => {
        expect(scrollTo).toHaveBeenCalledOnce();
        expect(pager.container.style.scrollSnapType).toBe('');
        expect(vi.getTimerCount()).toBe(0);
      });
    });
  });
});
