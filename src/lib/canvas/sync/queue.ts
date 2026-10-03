'use client';

import {
  ECanvasNodeType,
  type ICanvasQueueState,
  type INodePositionUpdate,
  type ISaveState,
  type TCanvasOperation,
  type TNodeUpdateOperation,
  type TSaveStatusListener,
} from '@interfaces';
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
  NODE_CREATE_TYPES,
  NODE_UPDATE_TYPES,
  OFFLINE_POLL_INTERVAL_MS,
  RETRY_BASE_MS,
} from './consts';

const isBrowserOnline = (): boolean => typeof navigator === 'undefined' || navigator.onLine;

const state: ICanvasQueueState = {
  pending: [],
  failed: [],
  flushTimer: null,
  retryTimer: null,
  pollTimer: null,
  retries: 0,
  inflight: null,
  retryRequested: false,
  online: isBrowserOnline(),
  saveState: INITIAL_SAVE_STATE,
  listeners: new Set(),
  windowListenersBound: false,
};

const setSaveState = (next: Partial<ISaveState>) => {
  const status = next.status ?? state.saveState.status;
  const candidate: ISaveState = {
    ...state.saveState,
    ...next,
    status: state.failed.length > 0 && status !== 'offline' ? 'error' : status,
    pendingCount: state.pending.length,
    failedCount: state.failed.length,
  };
  const unchanged = (Object.keys(candidate) as (keyof ISaveState)[]).every(
    (key) => candidate[key] === state.saveState[key],
  );
  if (unchanged) return;

  state.saveState = candidate;
  state.listeners.forEach((listener) => listener(state.saveState));
};

const requeueFailed = () => {
  state.pending = [...state.failed, ...state.pending];
  state.failed = [];
  state.retries = 0;
};

export const subscribeSaveState = (listener: TSaveStatusListener) => {
  state.listeners.add(listener);
  listener(state.saveState);

  return () => {
    state.listeners.delete(listener);
  };
};

export const getSaveState = () => state.saveState;

export const hasUnsavedChanges = (): boolean =>
  state.inflight !== null || state.pending.length > 0 || state.failed.length > 0;

const clearTimer = (handle: number | null) => {
  if (handle !== null) window.clearTimeout(handle);
};

const isNodeUpdate = (operation: TCanvasOperation): operation is TNodeUpdateOperation =>
  NODE_UPDATE_TYPES.includes(operation.type as TNodeUpdateOperation['type']);

const updateKey = (operation: TNodeUpdateOperation) => `${operation.type}:${operation.id}`;

const isNodeAttachment = (operation: TCanvasOperation, nodeId: string): boolean => {
  if (operation.type === 'createEdge') return operation.source === nodeId || operation.target === nodeId;

  return operation.type === 'createComment' && operation.nodeId === nodeId;
};

const removeWhere = (operations: TCanvasOperation[], predicate: (operation: TCanvasOperation) => boolean) => {
  operations.splice(0, operations.length, ...operations.filter((operation) => !predicate(operation)));
};

const rebuildLastIndex = (operations: TCanvasOperation[], lastIndex: Map<string, number>) => {
  lastIndex.clear();
  operations.forEach((operation, index) => {
    if (isNodeUpdate(operation)) lastIndex.set(updateKey(operation), index);
  });
};

const cancelCreate = (result: TCanvasOperation[], operation: TCanvasOperation): boolean => {
  const createTypes = CREATE_TYPES_BY_DELETE[operation.type];
  if (!createTypes) return false;

  const createIndex = result.findIndex(
    (existing) => createTypes.includes(existing.type) && existing.id === operation.id,
  );
  if (createIndex === -1) return false;

  result.splice(createIndex, 1);

  return true;
};

const upsertUpdate = (result: TCanvasOperation[], lastIndex: Map<string, number>, operation: TNodeUpdateOperation) => {
  const key = updateKey(operation);
  const existingIndex = lastIndex.get(key);
  if (existingIndex !== undefined) {
    result[existingIndex] = operation;

    return;
  }

  lastIndex.set(key, result.length);
  result.push(operation);
};

const coalesce = (operations: TCanvasOperation[]): TCanvasOperation[] => {
  const result: TCanvasOperation[] = [];
  const lastIndex = new Map<string, number>();

  operations.forEach((operation) => {
    const deletedNodeId = operation.type === 'deleteNode' ? operation.id : null;
    if (deletedNodeId) removeWhere(result, (existing) => isNodeUpdate(existing) && existing.id === deletedNodeId);

    if (cancelCreate(result, operation)) {
      if (deletedNodeId) removeWhere(result, (existing) => isNodeAttachment(existing, deletedNodeId));
      rebuildLastIndex(result, lastIndex);

      return;
    }

    if (deletedNodeId) rebuildLastIndex(result, lastIndex);

    if (isNodeUpdate(operation)) {
      upsertUpdate(result, lastIndex, operation);

      return;
    }

    result.push(operation);
  });

  return result;
};

const isNodeCreate = (operation: TCanvasOperation, nodeId: string): boolean =>
  NODE_CREATE_TYPES.includes(operation.type) && operation.id === nodeId;

const referencedNodeIds = (operation: TCanvasOperation): string[] => {
  if (operation.type === 'createEdge') return [operation.source, operation.target];
  if (operation.type === 'createComment') return [operation.nodeId];

  return isNodeUpdate(operation) ? [operation.id] : [];
};

const isParkedNode = (nodeId: string): boolean => state.failed.some((parked) => isNodeCreate(parked, nodeId));

const hasQueuedCreate = (nodeId: string): boolean =>
  [...state.pending, ...(state.inflight ?? [])].some((queued) => isNodeCreate(queued, nodeId));

const targetsParkedNode = (operation: TCanvasOperation): boolean => {
  const nodeIds = referencedNodeIds(operation);

  return nodeIds.some(isParkedNode) && !nodeIds.some(hasQueuedCreate);
};

const foldIntoCreate = (create: TCanvasOperation, update: TNodeUpdateOperation): TCanvasOperation | null => {
  if (update.type === 'updateNodeLabel' && create.type === 'createCanvasNode') {
    return { ...create, label: update.label };
  }
  if (update.type !== 'updateNodePosition') return null;
  if (create.type !== 'createCanvasNode' && create.type !== 'createReferenceNode') return null;

  return { ...create, x: update.x, y: update.y };
};

const parkWithCreate = (operation: TCanvasOperation) => {
  if (!isNodeUpdate(operation)) {
    state.failed.push(operation);

    return;
  }

  const createIndex = state.failed.findIndex((parked) => isNodeCreate(parked, operation.id));
  const create = state.failed[createIndex];
  const folded = create ? foldIntoCreate(create, operation) : null;
  if (!folded) {
    state.failed.push(operation);

    return;
  }

  state.failed[createIndex] = folded;
};

const dropParkedFor = (operation: TCanvasOperation): boolean => {
  if (operation.type === 'deleteNode') {
    removeWhere(
      state.failed,
      (parked) => (isNodeUpdate(parked) && parked.id === operation.id) || isNodeAttachment(parked, operation.id),
    );
  }

  return cancelCreate(state.failed, operation);
};

const settleSaveState = (next: Partial<ISaveState> = {}) => {
  if (!state.online) {
    setSaveState(next);

    return;
  }

  setSaveState({ ...next, status: state.inflight !== null || state.pending.length > 0 ? 'saving' : 'saved' });
};

const absorbIntoFailed = (operation: TCanvasOperation): boolean => {
  if (CREATE_TYPES_BY_DELETE[operation.type]) return dropParkedFor(operation);
  if (isNodeUpdate(operation)) {
    removeWhere(state.failed, (parked) => isNodeUpdate(parked) && updateKey(parked) === updateKey(operation));
  }
  if (!targetsParkedNode(operation)) return false;

  parkWithCreate(operation);

  return true;
};

const runOperation = async (operation: Exclude<TCanvasOperation, { type: 'updateNodePosition' }>): Promise<void> => {
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
  }
};

const collectUnflushedPositions = (operations: TCanvasOperation[], upToIndex: number): TCanvasOperation[] =>
  operations.slice(0, upToIndex).filter((operation) => operation.type === 'updateNodePosition');

const withRemaining = (error: unknown, remaining: TCanvasOperation[]): object => {
  const target = typeof error === 'object' && error !== null ? error : new Error(String(error));

  return Object.assign(target, { remaining });
};

const runOperations = async (operations: TCanvasOperation[]): Promise<void> => {
  await operations.reduce<Promise<void>>(async (previous, operation, index) => {
    await previous;
    if (operation.type === 'updateNodePosition') return;

    try {
      await runOperation(operation);
    } catch (error) {
      throw withRemaining(error, [...collectUnflushedPositions(operations, index), ...operations.slice(index)]);
    }
  }, Promise.resolve());

  const positions: INodePositionUpdate[] = operations.flatMap((operation) =>
    operation.type === 'updateNodePosition' ? [{ id: operation.id, x: operation.x, y: operation.y }] : [],
  );
  if (positions.length === 0) return;

  try {
    await updateCanvasNodePositions(positions);
  } catch (error) {
    throw withRemaining(
      error,
      operations.filter((operation) => operation.type === 'updateNodePosition'),
    );
  }
};

const scheduleFlush = () => {
  clearTimer(state.flushTimer);
  if (!state.online) return;
  state.flushTimer = window.setTimeout(() => {
    state.flushTimer = null;
    flushNow();
  }, FLUSH_DEBOUNCE_MS);
};

const stopOfflinePoll = () => {
  if (state.pollTimer === null) return;

  window.clearInterval(state.pollTimer);
  state.pollTimer = null;
};

const handleOnline = () => {
  state.online = true;
  stopOfflinePoll();

  if (state.inflight) return;
  if (state.failed.length > 0) requeueFailed();
  if (state.pending.length > 0) {
    setSaveState({ status: 'saving', retryAttempt: 0 });
    scheduleFlush();
  } else {
    setSaveState({ status: 'saved' });
  }
};

const reportOffline = () => {
  setSaveState({ status: 'offline' });
  if (state.pollTimer !== null) return;

  state.pollTimer = window.setInterval(() => {
    if (!isBrowserOnline() || state.inflight) return;

    handleOnline();
  }, OFFLINE_POLL_INTERVAL_MS);
};

const handleOffline = () => {
  state.online = false;
  clearTimer(state.flushTimer);
  state.flushTimer = null;
  clearTimer(state.retryTimer);
  state.retryTimer = null;
  reportOffline();
};

const ensureWindowListeners = () => {
  if (state.windowListenersBound) return;
  if (typeof window === 'undefined') return;
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  state.windowListenersBound = true;
};

export const enqueueOperation = (operation: TCanvasOperation) => {
  ensureWindowListeners();
  if (state.failed.length > 0 && absorbIntoFailed(operation)) {
    settleSaveState();

    return;
  }

  state.pending.push(operation);

  if (!state.online) {
    reportOffline();

    return;
  }

  setSaveState({ status: 'saving' });
  scheduleFlush();
};

const scheduleRetry = () => {
  state.retries += 1;
  setSaveState({ status: 'retrying', retryAttempt: state.retries });
  clearTimer(state.retryTimer);
  state.retryTimer = window.setTimeout(
    () => {
      state.retryTimer = null;
      flushNow();
    },
    RETRY_BASE_MS * 2 ** (state.retries - 1),
  );
};

const parkFailed = (error: unknown) => {
  state.failed = [...state.failed, ...state.pending];
  state.pending = [];
  state.retries = 0;
  setSaveState({ status: 'error', retryAttempt: 0 });
  event.error(error, { toast: false, context: 'canvas.flush' });
};

const handleFlushFailure = (error: unknown) => {
  if (!isBrowserOnline()) {
    handleOffline();

    return;
  }

  if (state.retries < MAX_RETRIES) {
    scheduleRetry();

    return;
  }

  parkFailed(error);
};

export const flushNow = async (): Promise<void> => {
  if (state.inflight) return;

  if (!state.online) {
    reportOffline();

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
  state.inflight = batch;

  try {
    await runOperations(batch);

    state.retries = 0;
    state.inflight = null;
    settleSaveState({ lastSavedAt: Date.now(), retryAttempt: 0 });

    if (state.pending.length > 0) scheduleFlush();
  } catch (error) {
    state.inflight = null;
    const remaining = (error as { remaining?: TCanvasOperation[] }).remaining ?? batch;
    state.pending = [...remaining, ...state.pending];
    handleFlushFailure(error);
  }

  runRequestedRetry();
};

export const retryFailed = () => {
  if (state.failed.length === 0) return;
  if (state.inflight) {
    state.retryRequested = true;

    return;
  }

  requeueFailed();
  setSaveState({ status: 'saving', retryAttempt: 0 });

  if (state.online) scheduleFlush();
};

const runRequestedRetry = () => {
  if (!state.retryRequested) return;

  state.retryRequested = false;
  if (state.online) retryFailed();
};

export const discardFailed = () => {
  if (state.failed.length === 0) return;

  state.failed = [];
  state.retryRequested = false;
  settleSaveState();

  if (state.online && state.pending.length > 0) scheduleFlush();
};

export const resetQueue = () => {
  clearTimer(state.flushTimer);
  clearTimer(state.retryTimer);
  stopOfflinePoll();

  if (state.windowListenersBound) {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
    state.windowListenersBound = false;
  }

  state.pending = [];
  state.failed = [];
  state.flushTimer = null;
  state.retryTimer = null;
  state.retries = 0;
  state.inflight = null;
  state.retryRequested = false;
  state.online = isBrowserOnline();

  setSaveState({
    status: 'idle',
    lastSavedAt: null,
    retryAttempt: 0,
  });
};
