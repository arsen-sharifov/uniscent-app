import { act, renderHook } from '@testing-library/react';
import { ReactFlowProvider, useStoreApi } from '@xyflow/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import type { TCanvasNode } from '@interfaces';

import { stubAnimationFrame } from '@mocks/browser';
import { canvasNode } from '@mocks/canvas';
import { FRESH_FIT_PADDING } from '@/components/Canvas/consts';
import { useCanvasViewport } from '@/components/Canvas/hooks';
import { recallViewport, rememberViewport } from '@/lib/canvas';
import { useCanvasStore } from '@/lib/stores';

vi.mock('next/navigation', () => import('@mocks/navigation'));

const VIEW = { width: 800, height: 600 };
const DEFAULT_VIEWPORT = { x: 0, y: 0, zoom: 1 };
const REMEMBERED_VIEWPORT = { x: 120, y: -40, zoom: 1.5 };
const MOVED_VIEWPORT = { x: 10, y: 20, zoom: 0.8 };

const onSetViewport = vi.fn();

const nodeAt = (id: string, x: number, y: number): TCanvasNode => ({
  ...canvasNode(id),
  position: { x, y },
  measured: { width: 200, height: 80 },
});

let frames: ReturnType<typeof stubAnimationFrame>;
let harness: {
  current: { viewport: ReturnType<typeof useCanvasViewport>; flow: ReturnType<typeof useStoreApi> };
};

beforeEach(() => {
  frames = stubAnimationFrame();
});

afterEach(() => {
  useCanvasStore.getState().clearCanvas();
  vi.unstubAllGlobals();
});

describe('useCanvasViewport', () => {
  describe('GIVEN a thread whose viewport was remembered earlier in the session', () => {
    beforeEach(() => {
      rememberViewport('thread-remembered', REMEMBERED_VIEWPORT);
      harness = renderHook(
        () => ({
          viewport: useCanvasViewport({ threadId: 'thread-remembered', defaultZoom: 100 }),
          flow: useStoreApi(),
        }),
        { wrapper: ReactFlowProvider },
      ).result;
      harness.current.flow.setState({ ...VIEW, panZoom: { setViewport: onSetViewport } as never });
    });

    describe('WHEN the canvas mounts', () => {
      test('THEN the remembered viewport is the starting viewport', () => {
        expect(harness.current.viewport.defaultViewport).toEqual(REMEMBERED_VIEWPORT);
      });
    });

    describe('WHEN its canvas loads with a node far outside the view', () => {
      beforeEach(() => {
        act(() =>
          useCanvasStore.getState().loadCanvas('thread-remembered', { nodes: [nodeAt('far', 5000, 5000)], edges: [] }),
        );
        act(() => frames.flush());
      });

      test('THEN the remembered viewport is restored instead of fitting', () => {
        expect(onSetViewport).toHaveBeenCalledExactlyOnceWith(REMEMBERED_VIEWPORT, undefined);
        expect(harness.current.flow.getState().fitViewQueued).toBe(false);
      });
    });
  });

  describe('GIVEN a first open while the store still holds the previous thread', () => {
    beforeEach(() => {
      harness = renderHook(
        () => ({ viewport: useCanvasViewport({ threadId: 'thread-first', defaultZoom: 100 }), flow: useStoreApi() }),
        { wrapper: ReactFlowProvider },
      ).result;
      harness.current.flow.setState({ ...VIEW, panZoom: { setViewport: onSetViewport } as never });
      act(() =>
        useCanvasStore.getState().loadCanvas('thread-previous', { nodes: [nodeAt('old', 5000, 5000)], edges: [] }),
      );
    });

    describe('WHEN a frame passes before its own canvas loads', () => {
      beforeEach(() => {
        act(() => frames.flush());
      });

      test('THEN the viewport is left alone', () => {
        expect(onSetViewport).not.toHaveBeenCalled();
        expect(harness.current.flow.getState().fitViewQueued).toBe(false);
      });
    });

    describe('WHEN its own canvas loads with every node inside the view', () => {
      beforeEach(() => {
        act(() =>
          useCanvasStore.getState().loadCanvas('thread-first', { nodes: [nodeAt('inside', 100, 100)], edges: [] }),
        );
        act(() => frames.flush());
      });

      test('THEN the default viewport is applied once and nothing is fitted', () => {
        expect(onSetViewport).toHaveBeenCalledExactlyOnceWith(DEFAULT_VIEWPORT, undefined);
        expect(harness.current.flow.getState().fitViewQueued).toBe(false);
      });
    });
  });

  describe('GIVEN a first open of a thread with a node fully outside the view', () => {
    beforeEach(() => {
      harness = renderHook(
        () => ({ viewport: useCanvasViewport({ threadId: 'thread-wide', defaultZoom: 100 }), flow: useStoreApi() }),
        { wrapper: ReactFlowProvider },
      ).result;
      harness.current.flow.setState({ ...VIEW, panZoom: { setViewport: onSetViewport } as never });
    });

    describe('WHEN its canvas loads and the first frame runs', () => {
      beforeEach(() => {
        act(() =>
          useCanvasStore
            .getState()
            .loadCanvas('thread-wide', { nodes: [nodeAt('inside', 100, 100), nodeAt('far', 2000, 100)], edges: [] }),
        );
        act(() => frames.flush());
      });

      test('THEN a fit with the fresh padding is queued', () => {
        expect(harness.current.flow.getState()).toMatchObject({
          fitViewQueued: true,
          fitViewOptions: { duration: 0, padding: FRESH_FIT_PADDING, maxZoom: 1 },
        });
      });
    });
  });

  describe('GIVEN an open thread', () => {
    beforeEach(() => {
      harness = renderHook(
        () => ({ viewport: useCanvasViewport({ threadId: 'thread-moved', defaultZoom: 100 }), flow: useStoreApi() }),
        { wrapper: ReactFlowProvider },
      ).result;
    });

    describe('WHEN the viewport stops moving', () => {
      beforeEach(() => {
        act(() => harness.current.viewport.onMoveEnd(null, MOVED_VIEWPORT));
      });

      test('THEN the viewport is remembered for that thread', () => {
        expect(recallViewport('thread-moved')).toEqual(MOVED_VIEWPORT);
      });
    });
  });
});
