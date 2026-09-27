import type { IAuroraFrameLoop } from '@interfaces';

export const createFrameLoop = (
  draw: (elapsedSeconds: number) => void,
  stepCapMs: number,
  initialElapsedSeconds: number,
): IAuroraFrameLoop => {
  let elapsedSeconds = initialElapsedSeconds;
  let frame: number | null = null;
  let lastNow: number | null = null;

  const tick = (now: number) => {
    elapsedSeconds += Math.min(now - (lastNow ?? now), stepCapMs) / 1000;
    lastNow = now;
    draw(elapsedSeconds);
    frame = requestAnimationFrame(tick);
  };

  return {
    start: () => {
      frame ??= requestAnimationFrame(tick);
    },
    stop: () => {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
      lastNow = null;
    },
    elapsed: () => elapsedSeconds,
  };
};
