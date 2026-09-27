'use client';

import { ECanvasNodeType, type INodePositionUpdate, type ISaveState, type TCanvasOperation } from '@interfaces';
import {
  createCanvasEdge,
  createCanvasNode,
  createNodeComment,
  deleteCanvasEdge,
  deleteCanvasNode,
  deleteNodeComment,
  updateCanvasNodeAnswer,
  updateCanvasNodeLabel,
  updateCanvasNodePositions,
  updateCanvasNodeStatus,
} from '@api/client';
import { event } from '@/lib/events';

import {
  CREATE_TYPES_BY_DELETE,
  FLUSH_DEBOUNCE_MS,
  INITIAL_SAVE_STATE,
  MAX_RETRIES,
  OFFLINE_POLL_INTERVAL_MS,
  RETRY_BASE_MS,
} from './consts';

type TSaveStatusListener = (state: ISaveState) => void;

type TFailedOperationsListener<TOperation> = (failed: TOperation[]) => void;

interface ICanvasQueueState {
  pending: TCanvasOperation[];
  failed: TCanvasOperation[];
  flushTimer: number | null;
  retryTimer: number | null;
  pollTimer: number | null;
  retries: number;
  inflight: boolean;
  online: boolean;
  saveState: ISaveState;
  listeners: Set<TSaveStatusListener>;
  failedListeners: Set<TFailedOperationsListener<TCanvasOperation>>;
  windowListenersBound: boolean;
}

const createQueueState = (): ICanvasQueueState => ({
  pending: [],
  failed: [],
  flushTimer: null,
  retryTimer: null,
  pollTimer: null,
  retries: 0,
  inflight: false,
  online: typeof navigator === 'undefined' ? true : navigator.onLine,
  saveState: INITIAL_SAVE_STATE,
  listeners: new Set(),
  failedListeners: new Set(),
  windowListenersBound: false,
});

const state: ICanvasQueueState = createQueueState();

const setSaveState = (next: Partial<ISaveState>) => {
  const candidate: ISaveState = {
    ...state.saveState,
    ...next,
    pendingCount: state.pending.length,
    failedCount: state.failed.length,
  };
  const current = state.saveState;
  if (
    candidate.status === current.status &&
    candidate.lastSavedAt === current.lastSavedAt &&
    candidate.retryAttempt === current.retryAttempt &&
    candidate.pendingCount === current.pendingCount &&
    candidate.failedCount === current.failedCount
  ) {
    return;
  }
  state.saveState = candidate;
  state.listeners.forEach((listener) => listener(state.saveState));
};

const notifyFailed = () => {
  state.failedListeners.forEach((listener) => listener([...state.failed]));
};

export const subscribeSaveState = (listener: TSaveStatusListener) => {
  state.listeners.add(listener);
  listener(state.saveState);

  return () => {
    state.listeners.delete(listener);
  };
};

export const subscribeFailedOperations = (listener: TFailedOperationsListener<TCanvasOperation>) => {
  state.failedListeners.add(listener);
  listener([...state.failed]);

  return () => {
    state.failedListeners.delete(listener);
  };
};

export const getSaveState = () => state.saveState;

const clearTimer = (handle: number | null) => {
  if (handle !== null) window.clearTimeout(handle);
};

const NODE_UPDATE_TYPES = [
  'updateNodePosition',
  'updateNodeLabel',
  'updateNodeStatus',
  'updateNodeAnswer',
] as const satisfies readonly TCanvasOperation['type'][];

const isNodeUpdate = (
  operation: TCanvasOperation,
): operation is TCanvasOperation & {
  type: (typeof NODE_UPDATE_TYPES)[number];
} => NODE_UPDATE_TYPES.includes(operation.type as (typeof NODE_UPDATE_TYPES)[number]);

const rebuildLastIndex = (operations: TCanvasOperation[], lastIndex: Map<string, number>) => {
  lastIndex.clear();
  operations.forEach((operation, index) => {
    if (isNodeUpdate(operation)) {
      lastIndex.set(`${operation.type}:${operation.id}`, index);
    }
  });
};

const dropDependentOperations = (result: TCanvasOperation[], nodeId: string) => {
  const remaining = result.filter((operation) => !(isNodeUpdate(operation) && operation.id === nodeId));
  result.length = 0;
  result.push(...remaining);
};

const cancelCreate = (result: TCanvasOperation[], lastIndex: Map<string, number>, operation: TCanvasOperation) => {
  const createTypes = CREATE_TYPES_BY_DELETE[operation.type];
  if (!createTypes) return false;

  const createIndex = result.findIndex(
    (existing) => createTypes.includes(existing.type) && existing.id === operation.id,
  );
  if (createIndex === -1) return false;

  result.splice(createIndex, 1);
  rebuildLastIndex(result, lastIndex);

  return true;
};

const overrideUpdate = (result: TCanvasOperation[], lastIndex: Map<string, number>, operation: TCanvasOperation) => {
  if (!isNodeUpdate(operation)) return false;

  const key = `${operation.type}:${operation.id}`;
  const existingIndex = lastIndex.get(key);
  if (existingIndex === undefined) {
    lastIndex.set(key, result.length);

    return false;
  }

  result[existingIndex] = operation;

  return true;
};

const coalesce = (operations: TCanvasOperation[]): TCanvasOperation[] => {
  const result: TCanvasOperation[] = [];
  const lastIndex = new Map<string, number>();

  operations.forEach((operation) => {
    if (operation.type === 'deleteNode') dropDependentOperations(result, operation.id);
    if (cancelCreate(result, lastIndex, operation)) return;
    if (operation.type === 'deleteNode') rebuildLastIndex(result, lastIndex);
    if (overrideUpdate(result, lastIndex, operation)) return;

    result.push(operation);
  });

  return result;
};

const runOperation = async (operation: TCanvasOperation): Promise<void> => {
  switch (operation.type) {
    case 'createCanvasNode':
      await createCanvasNode({
        id: operation.id,
        threadId: operation.threadId,
        type: ECanvasNodeType.Canvas,
        x: operation.x,
        y: operation.y,
        label: operation.label,
        sourceNodeId: null,
      });

      return;
    case 'createReferenceNode':
      await createCanvasNode({
        id: operation.id,
        threadId: operation.threadId,
        type: ECanvasNodeType.Reference,
        x: operation.x,
        y: operation.y,
        label: operation.data.label,
        sourceNodeId: operation.data.sourceNodeId,
      });

      return;
    case 'deleteNode':
      await deleteCanvasNode(operation.id);

      return;
    case 'updateNodeLabel':
      await updateCanvasNodeLabel(operation.id, operation.label);

      return;
    case 'updateNodeStatus':
      await updateCanvasNodeStatus(operation.id, operation.status);

      return;
    case 'updateNodeAnswer':
      await updateCanvasNodeAnswer(operation.id, operation.isAnswer);

      return;
    case 'createEdge':
      await createCanvasEdge({
        id: operation.id,
        threadId: operation.threadId,
        sourceNodeId: operation.source,
        targetNodeId: operation.target,
        sourceHandle: operation.sourceHandle,
        targetHandle: operation.targetHandle,
      });

      return;
    case 'deleteEdge':
      await deleteCanvasEdge(operation.id);

      return;
    case 'createComment':
      await createNodeComment({
        id: operation.id,
        nodeId: operation.nodeId,
        text: operation.text,
      });

      return;
    case 'deleteComment':
      await deleteNodeComment(operation.id);

      return;
    case 'updateNodePosition':
      throw new Error('updateNodePosition must be batched via runOperations, not runOperation');
  }
};

const collectUnflushedPositions = (operations: TCanvasOperation[], upToIndex: number): TCanvasOperation[] =>
  operations.slice(0, upToIndex).filter((operation) => operation.type === 'updateNodePosition');

const withRemaining = (error: unknown, remaining: TCanvasOperation[]): object => {
  const target = typeof error === 'object' && error !== null ? error : new Error(String(error));

  return Object.assign(target, { remaining });
};

const runOperations = async (operations: TCanvasOperation[]): Promise<TCanvasOperation[]> => {
  const positions: INodePositionUpdate[] = [];

  for (let index = 0; index < operations.length; index++) {
    const operation = operations[index]!;

    if (operation.type === 'updateNodePosition') {
      positions.push({ id: operation.id, x: operation.x, y: operation.y });
      continue;
    }

    try {
      await runOperation(operation);
    } catch (error) {
      const remaining: TCanvasOperation[] = [
        ...collectUnflushedPositions(operations, index),
        ...operations.slice(index),
      ];
      throw withRemaining(error, remaining);
    }
  }

  if (positions.length === 0) return [];

  try {
    await updateCanvasNodePositions(positions);

    return [];
  } catch (error) {
    const remaining: TCanvasOperation[] = operations.filter((operation) => operation.type === 'updateNodePosition');
    throw withRemaining(error, remaining);
  }
};

const scheduleFlush = () => {
  clearTimer(state.flushTimer);
  if (!state.online) return;
  state.flushTimer = window.setTimeout(() => {
    state.flushTimer = null;
    void flushNow();
  }, FLUSH_DEBOUNCE_MS);
};

const handleOnline = () => {
  state.online = true;

  if (state.pollTimer !== null) {
    window.clearInterval(state.pollTimer);
    state.pollTimer = null;
  }

  if (state.inflight) return;
  if (state.failed.length > 0) {
    state.pending = [...state.failed, ...state.pending];
    state.failed = [];
    state.retries = 0;
    notifyFailed();
  }
  if (state.pending.length > 0) {
    setSaveState({ status: 'saving', retryAttempt: 0 });
    scheduleFlush();
  } else {
    setSaveState({ status: 'saved' });
  }
};

const handleOffline = () => {
  state.online = false;
  clearTimer(state.flushTimer);
  state.flushTimer = null;
  clearTimer(state.retryTimer);
  state.retryTimer = null;
  setSaveState({ status: 'offline' });
};

const ensureWindowListeners = () => {
  if (state.windowListenersBound) return;
  if (typeof window === 'undefined') return;
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  state.pollTimer = window.setInterval(() => {
    if (state.saveState.status !== 'offline') return;
    if (typeof navigator === 'undefined' || !navigator.onLine) return;
    if (state.inflight) return;
    handleOnline();
  }, OFFLINE_POLL_INTERVAL_MS);
  state.windowListenersBound = true;
};

export const enqueueOperation = (operation: TCanvasOperation) => {
  ensureWindowListeners();
  state.pending.push(operation);

  if (!state.online) {
    setSaveState({ status: 'offline' });

    return;
  }

  setSaveState({ status: 'saving' });
  scheduleFlush();
};

export const flushNow = async (): Promise<void> => {
  if (state.inflight) return;

  if (!state.online) {
    setSaveState({ status: 'offline' });

    return;
  }

  if (state.pending.length === 0) {
    if (state.saveState.status === 'saving') setSaveState({ status: 'saved' });

    return;
  }

  clearTimer(state.flushTimer);
  state.flushTimer = null;

  const batch = coalesce(state.pending);
  state.pending = [];
  state.inflight = true;

  try {
    await runOperations(batch);

    state.retries = 0;
    state.inflight = false;

    setSaveState({
      status: 'saved',
      lastSavedAt: Date.now(),
      retryAttempt: 0,
    });

    if (state.pending.length > 0) scheduleFlush();
  } catch (error) {
    state.inflight = false;
    const remaining = (error as { remaining?: TCanvasOperation[] }).remaining ?? batch;
    state.pending = [...remaining, ...state.pending];

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      handleOffline();

      return;
    }

    if (state.retries < MAX_RETRIES) {
      state.retries += 1;
      const delay = RETRY_BASE_MS * 2 ** (state.retries - 1);
      setSaveState({ status: 'retrying', retryAttempt: state.retries });
      clearTimer(state.retryTimer);
      state.retryTimer = window.setTimeout(() => {
        state.retryTimer = null;
        void flushNow();
      }, delay);
    } else {
      const failedBatch = state.pending;
      state.pending = [];
      state.failed = [...state.failed, ...failedBatch];
      state.retries = 0;
      setSaveState({ status: 'error', retryAttempt: 0 });
      notifyFailed();
      event.error(error, { toast: false, context: 'canvas.flush' });
    }
  }
};

export const retryFailed = () => {
  if (state.inflight) return;
  if (state.failed.length === 0) return;

  state.pending = [...state.failed, ...state.pending];
  state.failed = [];
  state.retries = 0;

  notifyFailed();
  setSaveState({ status: 'saving', retryAttempt: 0 });

  if (state.online) scheduleFlush();
};

export const discardFailed = () => {
  if (state.failed.length === 0) return;

  state.failed = [];
  notifyFailed();

  if (state.pending.length === 0) {
    setSaveState({ status: 'saved' });
  } else if (state.online) {
    setSaveState({ status: 'saving' });
    scheduleFlush();
  }
};

export const resetQueue = () => {
  clearTimer(state.flushTimer);
  clearTimer(state.retryTimer);

  if (state.pollTimer !== null) {
    window.clearInterval(state.pollTimer);
    state.pollTimer = null;
  }

  if (state.windowListenersBound) {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
    state.windowListenersBound = false;
  }

  const hadFailed = state.failed.length > 0;
  state.pending = [];
  state.failed = [];
  state.flushTimer = null;
  state.retryTimer = null;
  state.retries = 0;
  state.inflight = false;

  if (hadFailed) notifyFailed();

  setSaveState({
    status: 'idle',
    lastSavedAt: null,
    retryAttempt: 0,
  });
};
