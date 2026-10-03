import { type RenderHookResult, act, renderHook } from '@testing-library/react';
import { type MockInstance, afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import type { TCanvasPattern } from '@interfaces';
import { DEFAULT_PREFERENCES } from '@constants';
import { useCanvasPattern } from '@/components/Canvas/hooks';

let view: RenderHookResult<TCanvasPattern, unknown>;
let secondView: RenderHookResult<TCanvasPattern, unknown>;
let disconnect: MockInstance<MutationObserver['disconnect']>;

afterEach(() => {
  document.documentElement.removeAttribute('data-canvas-pattern');
  vi.restoreAllMocks();
});

describe('useCanvasPattern', () => {
  describe('GIVEN a pattern attribute on the root element', () => {
    beforeEach(() => {
      document.documentElement.setAttribute('data-canvas-pattern', 'cross');
    });

    describe('WHEN the hook renders', () => {
      beforeEach(() => {
        view = renderHook(() => useCanvasPattern());
      });

      test('THEN the pattern mirrors the attribute', () => {
        expect(view.result.current).toBe('cross');
      });
    });
  });

  describe('GIVEN an unknown pattern attribute', () => {
    beforeEach(() => {
      document.documentElement.setAttribute('data-canvas-pattern', 'zebra');
    });

    describe('WHEN the hook renders', () => {
      beforeEach(() => {
        view = renderHook(() => useCanvasPattern());
      });

      test('THEN the pattern falls back to the default', () => {
        expect(view.result.current).toBe(DEFAULT_PREFERENCES.canvasPattern);
      });
    });
  });

  describe('GIVEN no pattern attribute', () => {
    describe('WHEN the hook renders', () => {
      beforeEach(() => {
        view = renderHook(() => useCanvasPattern());
      });

      test('THEN the default applies', () => {
        expect(view.result.current).toBe(DEFAULT_PREFERENCES.canvasPattern);
      });
    });
  });

  describe('GIVEN a rendered hook', () => {
    beforeEach(() => {
      view = renderHook(() => useCanvasPattern());
    });

    describe('WHEN the attribute changes afterwards', () => {
      beforeEach(async () => {
        await act(async () => {
          document.documentElement.setAttribute('data-canvas-pattern', 'lines');
        });
      });

      test('THEN the pattern updates through the mutation observer', () => {
        expect(view.result.current).toBe('lines');
      });
    });
  });

  describe('GIVEN two mounted hooks', () => {
    beforeEach(() => {
      disconnect = vi.spyOn(MutationObserver.prototype, 'disconnect');
      view = renderHook(() => useCanvasPattern());
      secondView = renderHook(() => useCanvasPattern());
    });

    describe('WHEN only the first unmounts', () => {
      beforeEach(() => {
        view.unmount();
      });

      test('THEN the observer stays connected for the remaining subscriber', () => {
        expect(disconnect).not.toHaveBeenCalled();
      });
    });

    describe('WHEN both unmount', () => {
      beforeEach(() => {
        view.unmount();
        secondView.unmount();
      });

      test('THEN the observer disconnects once the last subscriber leaves', () => {
        expect(disconnect).toHaveBeenCalledTimes(1);
      });
    });
  });
});
