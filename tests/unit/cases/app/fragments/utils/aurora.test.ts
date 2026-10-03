import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { REDUCED_MOTION_QUERY } from '@constants';
import { createAuroraRenderer, draw, renderer } from '@mocks/auroraRenderer';
import {
  stubAnimationFrame,
  stubMediaQueries,
  stubOffscreenCanvas,
  stubResizeObserver,
  stubWorker,
} from '@mocks/browser';
import { AURORA_IDLE_STOP_MS, LIGHT_SCHEME_QUERY } from '@/app/fragments/consts';
import type { attachAurora, auroraReady, detachAurora } from '@/app/fragments/utils';

vi.mock('@/app/fragments/utils/auroraRenderer', () => ({ createAuroraRenderer }));

let aurora: { attachAurora: typeof attachAurora; auroraReady: typeof auroraReady; detachAurora: typeof detachAurora };
let slot: HTMLDivElement;
let frames: ReturnType<typeof stubAnimationFrame>;
let media: ReturnType<typeof stubMediaQueries>;
let worker: ReturnType<typeof stubWorker>;
let offscreen: ReturnType<typeof stubOffscreenCanvas>;

beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers();
  frames = stubAnimationFrame();
  media = stubMediaQueries();
  worker = stubWorker();
  offscreen = stubOffscreenCanvas();
  stubResizeObserver();
  createAuroraRenderer.mockReturnValue(renderer);
  slot = document.createElement('div');
  aurora = await import('@/app/fragments/utils');
});

afterEach(() => {
  aurora.detachAurora();
  vi.advanceTimersByTime(AURORA_IDLE_STOP_MS);
  offscreen.restore();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('aurora', () => {
  describe('GIVEN a worker that cannot start', () => {
    beforeEach(() => {
      worker.construct.mockImplementation(() => {
        throw new Error('worker blocked');
      });
    });

    describe('WHEN the background mounts', () => {
      beforeEach(() => {
        aurora.attachAurora(slot);
        frames.flush(16);
      });

      test('THEN the main canvas remains available and continues drawing', () => {
        expect(slot.querySelector('canvas')).not.toBeNull();
        expect(draw).toHaveBeenCalledTimes(2);
        expect(frames.pending()).toBe(1);
      });

      test('THEN content readiness is released', async () => {
        await expect(aurora.auroraReady()).resolves.toBeUndefined();
      });
    });
  });

  describe('GIVEN an offscreen transfer that fails', () => {
    beforeEach(() => {
      offscreen.transfer.mockImplementation(() => {
        throw new Error('offscreen unavailable');
      });
    });

    describe('WHEN the background mounts', () => {
      beforeEach(() => {
        aurora.attachAurora(slot);
      });

      test('THEN the spawned worker is released and the visible canvas is retained', () => {
        expect(worker.terminate).toHaveBeenCalledOnce();
        expect(slot.querySelector('canvas')).not.toBeNull();
        expect(frames.pending()).toBe(1);
      });
    });
  });

  describe('GIVEN a worker that cannot receive its canvas', () => {
    beforeEach(() => {
      worker.postMessage.mockImplementation(() => {
        throw new Error('transfer failed');
      });
    });

    describe('WHEN the background mounts', () => {
      beforeEach(() => {
        aurora.attachAurora(slot);
      });

      test('THEN the failed worker is terminated and the fallback stays mounted', () => {
        expect(worker.terminate).toHaveBeenCalledOnce();
        expect(slot.querySelector('canvas')).not.toBeNull();
        expect(frames.pending()).toBe(1);
      });
    });
  });

  describe('GIVEN a running background with worker support', () => {
    beforeEach(() => {
      aurora.attachAurora(slot);
    });

    describe('WHEN the worker renders its first frame', () => {
      beforeEach(() => {
        worker.message('ready');
      });

      test('THEN rendering transfers to one canvas without a duplicate animation loop', () => {
        expect(slot.querySelectorAll('canvas')).toHaveLength(1);
        expect(frames.pending()).toBe(0);
        expect(worker.postMessage).toHaveBeenLastCalledWith({ kind: 'run', running: true });
      });
    });

    describe('WHEN the worker has no graphics context', () => {
      beforeEach(() => {
        worker.message('unavailable');
      });

      test('THEN the worker is released and the main loop keeps running', () => {
        expect(worker.terminate).toHaveBeenCalledOnce();
        expect(frames.pending()).toBe(1);
        expect(slot.querySelectorAll('canvas')).toHaveLength(1);
      });
    });

    describe('WHEN the worker fails after taking over', () => {
      beforeEach(() => {
        worker.message('ready');
        worker.fail();
        frames.flush(16);
      });

      test('THEN the original renderer resumes on a visible canvas', () => {
        expect(worker.terminate).toHaveBeenCalledOnce();
        expect(slot.querySelectorAll('canvas')).toHaveLength(1);
        expect(draw).toHaveBeenCalledTimes(3);
        expect(frames.pending()).toBe(1);
      });
    });

    describe('WHEN reduced motion is enabled after the worker starts', () => {
      beforeEach(() => {
        worker.message('ready');
        media.change(REDUCED_MOTION_QUERY, true);
      });

      test('THEN the worker stops animating', () => {
        expect(worker.postMessage).toHaveBeenLastCalledWith({ kind: 'run', running: false });
      });
    });

    describe('WHEN the system switches to its light palette', () => {
      beforeEach(() => {
        worker.message('ready');
        media.change(LIGHT_SCHEME_QUERY, true);
      });

      test('THEN the worker receives the new palette', () => {
        expect(worker.postMessage).toHaveBeenLastCalledWith(expect.objectContaining({ kind: 'update', paper: 1 }));
      });
    });

    describe('WHEN the background is detached', () => {
      beforeEach(() => {
        worker.message('ready');
        aurora.detachAurora();
        vi.advanceTimersByTime(AURORA_IDLE_STOP_MS);
      });

      test('THEN its canvas leaves the page and the worker becomes idle', () => {
        expect(slot.childElementCount).toBe(0);
        expect(worker.postMessage).toHaveBeenLastCalledWith({ kind: 'run', running: false });
      });
    });
  });

  describe('GIVEN a device with no graphics context', () => {
    beforeEach(() => {
      createAuroraRenderer.mockReturnValue(null);
    });

    describe('WHEN the background mounts without graphics', () => {
      beforeEach(() => {
        aurora.attachAurora(slot);
        worker.message('unavailable');
      });

      test('THEN no empty animation loop consumes frames', () => {
        expect(frames.pending()).toBe(0);
        expect(draw).not.toHaveBeenCalled();
      });
    });
  });
});
