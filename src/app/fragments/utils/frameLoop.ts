import type { IAuroraFrameLoop } from '@interfaces';

export const createFrameLoop = (
  draw: (elapsedSeconds: number) => void,
  stepCapMs: number,
  initialElapsedSeconds: number,
): IAuroraFrameLoop => {
  let elapsedSeconds = initialElapsedSeconds;
  let animationFrameId: number | null = null;
  let lastNow: number | null = null;

  const tick = (now: number) => {
    elapsedSeconds += Math.min(now - (lastNow ?? now), stepCapMs) / 1000;
    lastNow = now;
    draw(elapsedSeconds);
    animationFrameId = requestAnimationFrame(tick);
  };

  return {
    start: () => {
      animationFrameId ??= requestAnimationFrame(tick);
    },
    stop: () => {
      if (animationFrameId !== null) cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
      lastNow = null;
    },
    elapsed: () => elapsedSeconds,
  };
};
