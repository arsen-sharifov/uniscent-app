import { act, type RenderHookResult, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { SUCCESS_RESET_DELAY_MS } from '@constants';
import { useAsyncAction } from '@hooks';
import { event } from '@/lib/events';

vi.mock('@/lib/events', () => import('@mocks/events'));

const FAILURE = new Error('boom');

let hook: RenderHookResult<ReturnType<typeof useAsyncAction>, unknown>;
let pending: Promise<void>;
let release: () => void;

beforeEach(() => {
  vi.useFakeTimers();
  hook = renderHook(() => useAsyncAction());
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useAsyncAction', () => {
  describe('GIVEN an action that has not settled yet', () => {
    beforeEach(() => {
      const gate = Promise.withResolvers<void>();
      release = gate.resolve;
      act(() => {
        pending = hook.result.current.run(() => gate.promise, 'Save failed');
      });
    });

    afterEach(async () => {
      release();
      await act(async () => pending);
    });

    describe('WHEN it is still running', () => {
      test('THEN loading is on and nothing is reported yet', () => {
        expect(hook.result.current).toMatchObject({ loading: true, success: false, error: null });
      });
    });
  });

  describe('GIVEN a succeeding action', () => {
    describe('WHEN it runs', () => {
      beforeEach(async () => {
        await act(async () => hook.result.current.run(async () => {}, 'Save failed'));
      });

      test('THEN success turns on, loading settles and nothing is toasted', () => {
        expect(hook.result.current).toMatchObject({ loading: false, success: true, error: null });
        expect(event.error).not.toHaveBeenCalled();
      });
    });

    describe('WHEN the success reset delay elapses', () => {
      beforeEach(async () => {
        await act(async () => hook.result.current.run(async () => {}, 'Save failed'));
        act(() => vi.advanceTimersByTime(SUCCESS_RESET_DELAY_MS));
      });

      test('THEN success turns off', () => {
        expect(hook.result.current.success).toBe(false);
      });
    });

    describe('WHEN it runs again just before the success reset elapses', () => {
      beforeEach(async () => {
        await act(async () => hook.result.current.run(async () => {}, 'Save failed'));
        act(() => vi.advanceTimersByTime(SUCCESS_RESET_DELAY_MS - 1));
        await act(async () => hook.result.current.run(async () => {}, 'Save failed'));
        act(() => vi.advanceTimersByTime(SUCCESS_RESET_DELAY_MS - 1));
      });

      test('THEN the reset timer restarts', () => {
        expect(hook.result.current.success).toBe(true);
      });
    });

    describe('WHEN it runs again just before the success reset elapses and the restarted reset elapses', () => {
      beforeEach(async () => {
        await act(async () => hook.result.current.run(async () => {}, 'Save failed'));
        act(() => vi.advanceTimersByTime(SUCCESS_RESET_DELAY_MS - 1));
        await act(async () => hook.result.current.run(async () => {}, 'Save failed'));
        act(() => vi.advanceTimersByTime(SUCCESS_RESET_DELAY_MS));
      });

      test('THEN success turns off', () => {
        expect(hook.result.current.success).toBe(false);
      });
    });

    describe('WHEN the hook unmounts after the success', () => {
      beforeEach(async () => {
        await act(async () => hook.result.current.run(async () => {}, 'Save failed'));
        hook.unmount();
      });

      test('THEN the reset timer is cleared', () => {
        expect(vi.getTimerCount()).toBe(0);
      });
    });
  });

  describe('GIVEN an action that the backend rejects', () => {
    describe('WHEN it runs', () => {
      beforeEach(async () => {
        await act(async () =>
          hook.result.current.run(async () => {
            throw FAILURE;
          }, 'Save failed'),
        );
      });

      test('THEN the failure is toasted under the given title instead of shown inline', () => {
        expect(event.error).toHaveBeenCalledExactlyOnceWith(FAILURE, { title: 'Save failed', context: 'asyncAction' });
        expect(hook.result.current).toMatchObject({ loading: false, success: false, error: null });
      });
    });
  });

  describe('GIVEN an action that handles its own outcome inline', () => {
    describe('WHEN it reports that it did not succeed', () => {
      beforeEach(async () => {
        await act(async () =>
          hook.result.current.run(async () => {
            hook.result.current.setError('Current password is incorrect');

            return false;
          }, 'Update failed'),
        );
      });

      test('THEN the inline message stays, nothing is toasted and success stays off', () => {
        expect(hook.result.current).toMatchObject({
          loading: false,
          success: false,
          error: 'Current password is incorrect',
        });
        expect(event.error).not.toHaveBeenCalled();
      });
    });
  });

  describe('GIVEN a client-side validation message', () => {
    beforeEach(() => {
      act(() => hook.result.current.setError('Passwords do not match'));
    });

    describe('WHEN the action runs afterwards', () => {
      beforeEach(async () => {
        await act(async () => hook.result.current.run(async () => {}, 'Update failed'));
      });

      test('THEN the stale message is cleared', () => {
        expect(hook.result.current.error).toBeNull();
      });
    });
  });
});
