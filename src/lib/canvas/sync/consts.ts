import type { ISaveState, TCanvasOperation } from '@interfaces';

export const FLUSH_DEBOUNCE_MS = 500;
export const MAX_RETRIES = 3;
export const RETRY_BASE_MS = 800;
export const OFFLINE_POLL_INTERVAL_MS = 5000;

export const INITIAL_SAVE_STATE: ISaveState = {
  status: 'idle',
  lastSavedAt: null,
  retryAttempt: 0,
  pendingCount: 0,
  failedCount: 0,
};

export const CREATE_TYPES_BY_DELETE: Partial<Record<TCanvasOperation['type'], TCanvasOperation['type'][]>> = {
  deleteNode: ['createCanvasNode', 'createReferenceNode'],
  deleteEdge: ['createEdge'],
  deleteComment: ['createComment'],
};
