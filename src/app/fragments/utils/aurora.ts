'use client';

import type { IAuroraField, IAuroraRun, IAuroraStart, IAuroraUpdate, TAuroraWorkerSignal } from '@interfaces';
import { REDUCED_MOTION_QUERY } from '@constants';

import {
  AURORA_FRAME_STEP_CAP_MS,
  AURORA_IDLE_STOP_MS,
  AURORA_RENDER_SCALE,
  AURORA_STATIC_FRAME_TIME_S,
  LIGHT_SCHEME_QUERY,
} from '../consts';
import { createAuroraRenderer } from './auroraRenderer';
import { createFrameLoop } from './frameLoop';

let settleReady = () => {};
const firstFrame = new Promise<void>((resolve) => {
  settleReady = () => resolve();
});

export const auroraReady = () => firstFrame;

const newCanvas = () => {
  const canvas = document.createElement('canvas');
  canvas.className = 'landing-aurora pointer-events-none fixed inset-0 h-svh w-full';
  canvas.setAttribute('aria-hidden', 'true');

  return canvas;
};

const spawnWorker = () => {
  try {
    return new Worker(new URL('./aurora.worker.ts', import.meta.url));
  } catch {
    return null;
  }
};

const buildField = (): IAuroraField => {
  const lightScheme = window.matchMedia(LIGHT_SCHEME_QUERY);
  const motionPreference = window.matchMedia(REDUCED_MOTION_QUERY);
  const paper = () => (lightScheme.matches ? 1 : 0);

  const canvas = newCanvas();
  let live = canvas;
  let still = motionPreference.matches;
  let worker: Worker | null = null;
  let running = false;

  const width = () => live.clientWidth || window.innerWidth;
  const height = () => live.clientHeight || window.innerHeight;

  const renderer = createAuroraRenderer(canvas, AURORA_RENDER_SCALE);
  const clock = createFrameLoop(
    (elapsedSeconds) => renderer?.draw(elapsedSeconds, paper()),
    AURORA_FRAME_STEP_CAP_MS,
    still ? AURORA_STATIC_FRAME_TIME_S : 0,
  );

  const drawHere = () => {
    renderer?.resize(width(), height());
    renderer?.draw(clock.elapsed(), paper());
  };

  const update = () => {
    if (worker) {
      worker.postMessage({ kind: 'update', width: width(), height: height(), paper: paper() } satisfies IAuroraUpdate);

      return;
    }

    drawHere();
  };

  const run = (next: boolean) => {
    running = next;

    if (worker) {
      worker.postMessage({ kind: 'run', running: next && !still } satisfies IAuroraRun);

      return;
    }

    if (!next || still || !renderer) {
      clock.stop();

      return;
    }

    clock.start();
  };

  drawHere();
  settleReady();

  const boxObserver = new ResizeObserver(update);
  boxObserver.observe(live);
  lightScheme.addEventListener('change', update);
  motionPreference.addEventListener('change', () => {
    still = motionPreference.matches;
    run(running);
  });

  const swapCanvas = (next: HTMLCanvasElement) => {
    live.replaceWith(next);
    boxObserver.disconnect();
    boxObserver.observe(next);
    live = next;
  };

  const handOver = (next: HTMLCanvasElement, nextWorker: Worker) => {
    clock.stop();
    swapCanvas(next);
    worker = nextWorker;
    run(running);
  };

  const upgrade = () => {
    const candidate = newCanvas();
    if (typeof candidate.transferControlToOffscreen !== 'function') return;

    const nextWorker = spawnWorker();
    if (!nextWorker) return;

    const recover = () => {
      nextWorker.terminate();
      if (worker !== nextWorker) return;

      worker = null;
      swapCanvas(canvas);
      update();
      run(running);
    };

    nextWorker.onmessage = ({ data }: MessageEvent<TAuroraWorkerSignal>) => {
      if (data === 'ready') handOver(candidate, nextWorker);
      if (data === 'unavailable') recover();
    };
    nextWorker.onerror = recover;

    try {
      const offscreen = candidate.transferControlToOffscreen();
      nextWorker.postMessage(
        {
          kind: 'start',
          canvas: offscreen,
          width: width(),
          height: height(),
          paper: paper(),
          still,
          elapsed: clock.elapsed(),
          sentAt: Date.now(),
          frameStepCapMs: AURORA_FRAME_STEP_CAP_MS,
          renderScale: AURORA_RENDER_SCALE,
        } satisfies IAuroraStart,
        [offscreen],
      );
    } catch {
      nextWorker.terminate();
    }
  };

  run(true);
  upgrade();

  return {
    mount: (slot: HTMLElement) => slot.appendChild(live),
    unmount: () => live.remove(),
    run,
  };
};

let field: IAuroraField | null = null;
let idleStop: ReturnType<typeof setTimeout> | null = null;

export const attachAurora = (slot: HTMLElement) => {
  field ??= buildField();
  if (idleStop) {
    clearTimeout(idleStop);
    idleStop = null;
  }

  field.mount(slot);
  field.run(true);
};

export const detachAurora = () => {
  field?.unmount();
  idleStop = setTimeout(() => field?.run(false), AURORA_IDLE_STOP_MS);
};
