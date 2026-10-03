import type { ISaveState, TCanvasOperation, TNodeUpdateOperation } from '@interfaces';

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

export const NODE_CREATE_TYPES: readonly TCanvasOperation['type'][] = ['createCanvasNode', 'createReferenceNode'];

export const CREATE_TYPES_BY_DELETE: Partial<Record<TCanvasOperation['type'], readonly TCanvasOperation['type'][]>> = {
  deleteNode: NODE_CREATE_TYPES,
  deleteEdge: ['createEdge'],
  deleteComment: ['createComment'],
};

export const NODE_UPDATE_TYPES = [
  'updateNodePosition',
  'updateNodeLabel',
  'updateNodeStatus',
  'updateNodeAnswer',
] as const satisfies readonly TNodeUpdateOperation['type'][];
