import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import type { IAnchorRect, TTourAnchor } from '@interfaces';
import { REDUCED_MOTION_QUERY } from '@constants';
import { elementAt, stubMediaQueries } from '@mocks/browser';
import { useAnchorInView } from '@/components/Tour/hooks';
import { useCanvasStore } from '@/lib/stores';

const scrollIntoView = vi.fn();

const CANVAS_RECT: IAnchorRect = { top: 0, left: 300, width: 1100, height: 760 };

const boxAt = (anchor: TTourAnchor, rect: IAnchorRect): HTMLElement => {
  const element = elementAt({ 'data-tour': anchor }, rect);
  element.scrollIntoView = scrollIntoView;

  return element;
};

let fitsBefore: number;
let media: ReturnType<typeof stubMediaQueries>;

beforeEach(() => {
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: 900 });
  media = stubMediaQueries();
});

afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
  useCanvasStore.getState().clearCanvas();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('useAnchorInView', () => {
  describe('GIVEN a canvas node below the visible part of the canvas', () => {
    beforeEach(() => {
      const canvas = boxAt('canvas', CANVAS_RECT);
      canvas.append(boxAt('canvasNode', { top: 700, left: 600, width: 180, height: 90 }));
      document.body.append(canvas);
      fitsBefore = useCanvasStore.getState().fitRequest;
    });

    describe('WHEN a step points at it', () => {
      beforeEach(() => {
        renderHook(() => useAnchorInView('canvasNode'));
      });

      test('THEN the canvas is asked to fit its content and the page does not scroll', () => {
        expect(useCanvasStore.getState().fitRequest).toBe(fitsBefore + 1);
        expect(scrollIntoView).not.toHaveBeenCalled();
      });
    });
  });

  describe('GIVEN a canvas node inside the visible part of the canvas', () => {
    beforeEach(() => {
      const canvas = boxAt('canvas', CANVAS_RECT);
      canvas.append(boxAt('canvasNode', { top: 200, left: 600, width: 180, height: 90 }));
      document.body.append(canvas);
      fitsBefore = useCanvasStore.getState().fitRequest;
    });

    describe('WHEN a step points at it', () => {
      beforeEach(() => {
        renderHook(() => useAnchorInView('canvasNode'));
      });

      test('THEN the canvas keeps its viewport and the page does not scroll', () => {
        expect(useCanvasStore.getState().fitRequest).toBe(fitsBefore);
        expect(scrollIntoView).not.toHaveBeenCalled();
      });
    });
  });

  describe('GIVEN a sidebar anchor below the bottom of the window', () => {
    beforeEach(() => {
      document.body.append(boxAt('sidebarThreadResolved', { top: 910, left: 24, width: 20, height: 20 }));
      fitsBefore = useCanvasStore.getState().fitRequest;
    });

    describe('WHEN a step points at it', () => {
      beforeEach(() => {
        renderHook(() => useAnchorInView('sidebarThreadResolved'));
      });

      test('THEN it is scrolled smoothly into view by the nearest edge and the canvas is left alone', () => {
        expect(scrollIntoView).toHaveBeenCalledExactlyOnceWith({ block: 'nearest', behavior: 'smooth' });
        expect(useCanvasStore.getState().fitRequest).toBe(fitsBefore);
      });
    });
  });

  describe('GIVEN a sidebar anchor below the bottom of the window and a user who prefers reduced motion', () => {
    beforeEach(() => {
      media.change(REDUCED_MOTION_QUERY, true);
      document.body.append(boxAt('sidebarThreadResolved', { top: 910, left: 24, width: 20, height: 20 }));
    });

    describe('WHEN a step points at it', () => {
      beforeEach(() => {
        renderHook(() => useAnchorInView('sidebarThreadResolved'));
      });

      test('THEN it jumps into view without the smooth scroll animation', () => {
        expect(scrollIntoView).toHaveBeenCalledExactlyOnceWith({ block: 'nearest', behavior: 'instant' });
      });
    });
  });

  describe('GIVEN a sidebar anchor inside the window', () => {
    beforeEach(() => {
      document.body.append(boxAt('sidebarThreadResolved', { top: 300, left: 24, width: 20, height: 20 }));
    });

    describe('WHEN a step points at it', () => {
      beforeEach(() => {
        renderHook(() => useAnchorInView('sidebarThreadResolved'));
      });

      test('THEN nothing scrolls', () => {
        expect(scrollIntoView).not.toHaveBeenCalled();
      });
    });
  });

  describe('GIVEN an anchor that is not on screen', () => {
    beforeEach(() => {
      fitsBefore = useCanvasStore.getState().fitRequest;
    });

    describe('WHEN a step points at it', () => {
      beforeEach(() => {
        renderHook(() => useAnchorInView('canvasNode'));
      });

      test('THEN the canvas is not asked to fit', () => {
        expect(useCanvasStore.getState().fitRequest).toBe(fitsBefore);
      });
    });
  });
});
