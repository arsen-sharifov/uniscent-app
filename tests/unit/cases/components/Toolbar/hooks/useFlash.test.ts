import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { FLASH_DURATION_MS, useFlash } from '@/components/Toolbar';

let flash: { current: ReturnType<typeof useFlash> };

afterEach(() => {
  vi.useRealTimers();
});

describe('useFlash', () => {
  describe('GIVEN an idle flash', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      flash = renderHook(() => useFlash()).result;
    });

    describe('WHEN nothing happens', () => {
      test('THEN it is off', () => {
        expect(flash.current.flash).toBe(false);
      });
    });

    describe('WHEN it is triggered', () => {
      beforeEach(() => {
        act(() => flash.current.triggerFlash());
      });

      test('THEN it is on', () => {
        expect(flash.current.flash).toBe(true);
      });
    });

    describe('WHEN it is triggered and its duration passes', () => {
      beforeEach(() => {
        act(() => flash.current.triggerFlash());
        act(() => vi.advanceTimersByTime(FLASH_DURATION_MS));
      });

      test('THEN it is off again', () => {
        expect(flash.current.flash).toBe(false);
      });
    });

    describe('WHEN it is triggered again before the first flash ends', () => {
      beforeEach(() => {
        act(() => flash.current.triggerFlash());
        act(() => vi.advanceTimersByTime(FLASH_DURATION_MS - 1));
        act(() => flash.current.triggerFlash());
        act(() => vi.advanceTimersByTime(FLASH_DURATION_MS - 1));
      });

      test('THEN the second trigger restarts the duration', () => {
        expect(flash.current.flash).toBe(true);
      });
    });
  });

  describe('GIVEN a running flash', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      flash = renderHook(() => useFlash()).result;
      act(() => flash.current.triggerFlash());
    });

    describe('WHEN the owner unmounts', () => {
      beforeEach(() => {
        cleanup();
      });

      test('THEN its pending timer is cleared', () => {
        expect(vi.getTimerCount()).toBe(0);
      });
    });
  });
});
