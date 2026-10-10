import type { Viewport } from '@xyflow/react';

const viewportByThread = new Map<string, Viewport>();

export const rememberViewport = (threadId: string, viewport: Viewport): void => {
  viewportByThread.set(threadId, viewport);
};

export const recallViewport = (threadId: string): Viewport | undefined => viewportByThread.get(threadId);
