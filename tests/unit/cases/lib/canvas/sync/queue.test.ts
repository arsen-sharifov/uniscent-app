import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { ECanvasNodeType } from '@interfaces';
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
import {
  THREAD_ID,
  createCommentOp,
  createEdgeOp,
  createNodeOp,
  createReferenceNodeOp,
  deleteCommentOp,
  deleteEdgeOp,
  deleteNodeOp,
  updateAnswerOp,
  updateLabelOp,
  updatePositionOp,
  updateStatusOp,
} from '@mocks/canvas';
import {
  FLUSH_DEBOUNCE_MS,
  MAX_RETRIES,
  OFFLINE_POLL_INTERVAL_MS,
  RETRY_BASE_MS,
  discardFailed,
  enqueueOperation,
  flushNow,
  getSaveState,
  hasUnsavedChanges,
  resetQueue,
  retryFailed,
  subscribeSaveState,
} from '@/lib/canvas';
import { event } from '@/lib/events';

vi.mock('@api/client', () => import('@mocks/canvasApi'));
vi.mock('@/lib/events', () => import('@mocks/events'));

const TOTAL_RETRY_BACKOFF_MS = RETRY_BASE_MS * (2 ** MAX_RETRIES - 1);

const unsubscribers: Array<() => void> = [];

const onSaveState = vi.fn();

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  unsubscribers.splice(0).forEach((unsubscribe) => unsubscribe());
  Reflect.deleteProperty(window.navigator, 'onLine');
  window.dispatchEvent(new Event('online'));
  resetQueue();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('queue', () => {
  describe('GIVEN a node created in the pending batch', () => {
    beforeEach(() => {
      enqueueOperation(createNodeOp('n1'));
      enqueueOperation(updateLabelOp('n1', 'renamed'));
    });

    describe('WHEN it is deleted before the flush', () => {
      beforeEach(async () => {
        enqueueOperation(deleteNodeOp('n1'));
        await vi.advanceTimersByTimeAsync(FLUSH_DEBOUNCE_MS);
      });

      test('THEN nothing is sent to the api', () => {
        expect(createCanvasNode).not.toHaveBeenCalled();
        expect(updateCanvasNodeLabel).not.toHaveBeenCalled();
        expect(deleteCanvasNode).not.toHaveBeenCalled();
      });

      test('THEN the state reports saved', () => {
        expect(getSaveState()).toMatchObject({ status: 'saved', pendingCount: 0 });
      });
    });
  });

  describe('GIVEN an edge and a comment created in the pending batch', () => {
    beforeEach(() => {
      enqueueOperation(createEdgeOp('e1'));
      enqueueOperation(createCommentOp('c1'));
    });

    describe('WHEN they are deleted before the flush', () => {
      beforeEach(async () => {
        enqueueOperation(deleteEdgeOp('e1'));
        enqueueOperation(deleteCommentOp('c1'));
        await vi.advanceTimersByTimeAsync(FLUSH_DEBOUNCE_MS);
      });

      test('THEN nothing is sent to the api', () => {
        expect(createCanvasEdge).not.toHaveBeenCalled();
        expect(deleteCanvasEdge).not.toHaveBeenCalled();
        expect(createNodeComment).not.toHaveBeenCalled();
        expect(deleteNodeComment).not.toHaveBeenCalled();
      });
    });
  });

  describe('GIVEN a node created in the pending batch with an edge and a comment attached to it', () => {
    beforeEach(() => {
      enqueueOperation(createNodeOp('node-a'));
      enqueueOperation(createEdgeOp('e1'));
      enqueueOperation(createCommentOp('c1'));
    });

    describe('WHEN the node is deleted before the flush', () => {
      beforeEach(async () => {
        enqueueOperation(deleteNodeOp('node-a'));
        await vi.advanceTimersByTimeAsync(FLUSH_DEBOUNCE_MS);
      });

      test('THEN the attachments are dropped with the node and nothing is sent to the api', () => {
        expect(createCanvasNode).not.toHaveBeenCalled();
        expect(createCanvasEdge).not.toHaveBeenCalled();
        expect(createNodeComment).not.toHaveBeenCalled();
        expect(deleteCanvasNode).not.toHaveBeenCalled();
      });

      test('THEN the state reports saved', () => {
        expect(getSaveState()).toMatchObject({ status: 'saved', pendingCount: 0, failedCount: 0 });
      });
    });
  });

  describe('GIVEN an edge created in the pending batch for a node persisted earlier', () => {
    beforeEach(() => {
      enqueueOperation(createEdgeOp('e1'));
    });

    describe('WHEN the node is deleted before the flush', () => {
      beforeEach(async () => {
        enqueueOperation(deleteNodeOp('node-a'));
        await vi.advanceTimersByTimeAsync(FLUSH_DEBOUNCE_MS);
      });

      test('THEN the edge create and the node delete are both sent', () => {
        expect(createCanvasEdge).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ id: 'e1' }));
        expect(deleteCanvasNode).toHaveBeenCalledExactlyOnceWith('node-a');
      });
    });
  });

  describe('GIVEN a reference node created in the pending batch', () => {
    beforeEach(() => {
      enqueueOperation(createReferenceNodeOp('r1'));
    });

    describe('WHEN it is deleted before the flush', () => {
      beforeEach(async () => {
        enqueueOperation(deleteNodeOp('r1'));
        await vi.advanceTimersByTimeAsync(FLUSH_DEBOUNCE_MS);
      });

      test('THEN nothing is sent to the api', () => {
        expect(createCanvasNode).not.toHaveBeenCalled();
        expect(deleteCanvasNode).not.toHaveBeenCalled();
      });
    });

    describe('WHEN the debounce window closes', () => {
      beforeEach(async () => {
        await vi.advanceTimersByTimeAsync(FLUSH_DEBOUNCE_MS);
      });

      test('THEN it is sent as a reference-typed canvas node', () => {
        expect(createCanvasNode).toHaveBeenCalledExactlyOnceWith({
          id: 'r1',
          threadId: THREAD_ID,
          type: ECanvasNodeType.Reference,
          x: 0,
          y: 0,
          label: 'Ref',
          sourceNodeId: 'origin',
        });
      });
    });
  });

  describe('GIVEN nodes persisted before the batch', () => {
    describe('WHEN a node is updated and then deleted', () => {
      beforeEach(async () => {
        enqueueOperation(updateLabelOp('n1', 'renamed'));
        enqueueOperation(deleteNodeOp('n1'));
        await vi.advanceTimersByTimeAsync(FLUSH_DEBOUNCE_MS);
      });

      test('THEN only the delete is sent', () => {
        expect(updateCanvasNodeLabel).not.toHaveBeenCalled();
        expect(deleteCanvasNode).toHaveBeenCalledExactlyOnceWith('n1');
      });
    });

    describe('WHEN a label is updated twice and a status is set', () => {
      beforeEach(async () => {
        enqueueOperation(updateLabelOp('n1', 'draft'));
        enqueueOperation(updateLabelOp('n1', 'final'));
        enqueueOperation(updateStatusOp('n1', 'valid'));
        await vi.advanceTimersByTimeAsync(FLUSH_DEBOUNCE_MS);
      });

      test('THEN only the final values are sent', () => {
        expect(updateCanvasNodeLabel).toHaveBeenCalledExactlyOnceWith('n1', 'final');
        expect(updateCanvasNodeStatus).toHaveBeenCalledExactlyOnceWith('n1', 'valid');
      });
    });

    describe('WHEN a comment saved earlier is deleted', () => {
      beforeEach(async () => {
        enqueueOperation(deleteCommentOp('c1'));
        await vi.advanceTimersByTimeAsync(FLUSH_DEBOUNCE_MS);
      });

      test('THEN the comment delete is sent', () => {
        expect(deleteNodeComment).toHaveBeenCalledExactlyOnceWith('c1');
      });
    });

    describe('WHEN the answer flag is toggled twice for the same node', () => {
      beforeEach(async () => {
        enqueueOperation(updateAnswerOp('n1', true));
        enqueueOperation(updateAnswerOp('n1', false));
        await vi.advanceTimersByTimeAsync(FLUSH_DEBOUNCE_MS);
      });

      test('THEN only the final answer value is sent', () => {
        expect(updateCanvasNodeAnswer).toHaveBeenCalledExactlyOnceWith('n1', false);
      });
    });

    describe('WHEN positions change repeatedly', () => {
      beforeEach(async () => {
        enqueueOperation(updatePositionOp('n1', 1, 1));
        enqueueOperation(updatePositionOp('n2', 2, 2));
        enqueueOperation(updatePositionOp('n1', 9, 9));
        await vi.advanceTimersByTimeAsync(FLUSH_DEBOUNCE_MS);
      });

      test('THEN one batched call keeps the last position per node', () => {
        expect(updateCanvasNodePositions).toHaveBeenCalledExactlyOnceWith([
          { id: 'n1', x: 9, y: 9 },
          { id: 'n2', x: 2, y: 2 },
        ]);
      });
    });

    describe('WHEN a position update precedes a node creation', () => {
      beforeEach(async () => {
        enqueueOperation(updatePositionOp('n1', 5, 5));
        enqueueOperation(createNodeOp('n2'));
        await vi.advanceTimersByTimeAsync(FLUSH_DEBOUNCE_MS);
      });

      test('THEN positions are sent after the create', () => {
        expect(vi.mocked(updateCanvasNodePositions).mock.invocationCallOrder[0]).toBeGreaterThan(
          vi.mocked(createCanvasNode).mock.invocationCallOrder[0]!,
        );
      });
    });
  });

  describe('GIVEN consecutive enqueues within one debounce window', () => {
    beforeEach(async () => {
      enqueueOperation(createNodeOp('n1'));
      await vi.advanceTimersByTimeAsync(FLUSH_DEBOUNCE_MS - 1);
      enqueueOperation(createNodeOp('n2'));
    });

    describe('WHEN the debounce window has not yet closed', () => {
      beforeEach(async () => {
        await vi.advanceTimersByTimeAsync(FLUSH_DEBOUNCE_MS - 1);
      });

      test('THEN nothing is sent yet', () => {
        expect(createCanvasNode).not.toHaveBeenCalled();
      });
    });

    describe('WHEN the debounce window closes', () => {
      beforeEach(async () => {
        await vi.advanceTimersByTimeAsync(FLUSH_DEBOUNCE_MS);
      });

      test('THEN both nodes flush in one batch', () => {
        expect(createCanvasNode).toHaveBeenCalledTimes(2);
      });

      test('THEN the create payload maps every field', () => {
        expect(createCanvasNode).toHaveBeenCalledWith({
          id: 'n1',
          threadId: THREAD_ID,
          type: ECanvasNodeType.Canvas,
          x: 0,
          y: 0,
          label: 'Node n1',
          sourceNodeId: null,
        });
      });
    });
  });

  describe('GIVEN an idle queue with a save state subscriber', () => {
    beforeEach(() => {
      unsubscribers.push(subscribeSaveState(onSaveState));
    });

    describe('WHEN a batch flushes successfully', () => {
      beforeEach(async () => {
        enqueueOperation(createNodeOp('n1'));
        await vi.advanceTimersByTimeAsync(FLUSH_DEBOUNCE_MS);
      });

      test('THEN it reports saving and then saved', () => {
        expect(onSaveState.mock.calls.map(([state]) => state)).toMatchObject([
          { status: 'idle', pendingCount: 0 },
          { status: 'saving', pendingCount: 1 },
          { status: 'saved', pendingCount: 0 },
        ]);
      });

      test('THEN it records the save timestamp', () => {
        expect(getSaveState().lastSavedAt).not.toBeNull();
      });
    });
  });

  describe('GIVEN a detached save state subscriber', () => {
    beforeEach(() => {
      const unsubscribe = subscribeSaveState(onSaveState);
      unsubscribe();
    });

    describe('WHEN operations are enqueued', () => {
      beforeEach(() => {
        enqueueOperation(createNodeOp('n1'));
      });

      test('THEN no further states arrive', () => {
        expect(onSaveState).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('GIVEN an in-flight flush with an operation enqueued behind it', () => {
    let settleInflight: () => void;

    beforeEach(async () => {
      const deferred = Promise.withResolvers<void>();
      settleInflight = deferred.resolve;
      vi.mocked(createCanvasNode).mockReturnValueOnce(deferred.promise);
      enqueueOperation(createNodeOp('n1'));
      await vi.advanceTimersByTimeAsync(FLUSH_DEBOUNCE_MS);
      enqueueOperation(createNodeOp('n2'));
    });

    describe('WHEN the flush window passes again', () => {
      beforeEach(async () => {
        await vi.advanceTimersByTimeAsync(FLUSH_DEBOUNCE_MS);
      });

      test('THEN the pending operation stays out of the in-flight batch', () => {
        expect(createCanvasNode).toHaveBeenCalledTimes(1);
      });
    });

    describe('WHEN the in-flight save settles before the next flush window', () => {
      beforeEach(async () => {
        settleInflight();
        await vi.advanceTimersByTimeAsync(0);
      });

      test('THEN the state keeps reporting the queued operation as saving', () => {
        expect(getSaveState()).toMatchObject({ status: 'saving', pendingCount: 1 });
        expect(getSaveState().lastSavedAt).not.toBeNull();
      });
    });

    describe('WHEN the in-flight save settles', () => {
      beforeEach(async () => {
        await vi.advanceTimersByTimeAsync(FLUSH_DEBOUNCE_MS);
        settleInflight();
        await vi.advanceTimersByTimeAsync(FLUSH_DEBOUNCE_MS);
      });

      test('THEN the pending operation flushes in a follow-up batch', () => {
        expect(createCanvasNode).toHaveBeenCalledTimes(2);
        expect(createCanvasNode).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'n2' }));
      });

      test('THEN the state reports saved', () => {
        expect(getSaveState().status).toBe('saved');
      });
    });
  });

  describe('GIVEN a flush that fails twice', () => {
    beforeEach(() => {
      vi.mocked(createCanvasNode).mockRejectedValueOnce(new Error('first')).mockRejectedValueOnce(new Error('second'));
      unsubscribers.push(subscribeSaveState(onSaveState));
      enqueueOperation(createNodeOp('n1'));
    });

    describe('WHEN the first and second backoff windows elapse', () => {
      beforeEach(async () => {
        await vi.advanceTimersByTimeAsync(FLUSH_DEBOUNCE_MS);
        await vi.advanceTimersByTimeAsync(RETRY_BASE_MS);
        await vi.advanceTimersByTimeAsync(RETRY_BASE_MS * 2 - 1);
      });

      test('THEN the third attempt has not fired yet', () => {
        expect(createCanvasNode).toHaveBeenCalledTimes(2);
      });

      test('THEN the retry attempts are reported in order', () => {
        expect(
          onSaveState.mock.calls
            .map(([state]) => state)
            .filter((state) => state.status === 'retrying')
            .map((state) => state.retryAttempt),
        ).toEqual([1, 2]);
      });
    });

    describe('WHEN the full backoff elapses', () => {
      beforeEach(async () => {
        await vi.advanceTimersByTimeAsync(FLUSH_DEBOUNCE_MS);
        await vi.advanceTimersByTimeAsync(RETRY_BASE_MS);
        await vi.advanceTimersByTimeAsync(RETRY_BASE_MS * 2);
      });

      test('THEN the third attempt saves the batch', () => {
        expect(createCanvasNode).toHaveBeenCalledTimes(3);
        expect(getSaveState().status).toBe('saved');
      });
    });
  });

  describe('GIVEN a pending operation before the debounce closes', () => {
    beforeEach(() => {
      enqueueOperation(createNodeOp('n1'));
    });

    describe('WHEN flushNow is called directly', () => {
      beforeEach(async () => {
        await flushNow();
      });

      test('THEN the operation is sent without waiting for the debounce', () => {
        expect(createCanvasNode).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ id: 'n1' }));
        expect(getSaveState()).toMatchObject({ status: 'saved', pendingCount: 0 });
      });
    });
  });

  describe('GIVEN a batch with a position change followed by a failing create', () => {
    beforeEach(() => {
      vi.mocked(createCanvasNode).mockRejectedValueOnce(new Error('create failed'));
      enqueueOperation(updatePositionOp('n1', 5, 5));
      enqueueOperation(createNodeOp('n2'));
    });

    describe('WHEN the flush fails once and then retries', () => {
      beforeEach(async () => {
        await vi.advanceTimersByTimeAsync(FLUSH_DEBOUNCE_MS);
        await vi.advanceTimersByTimeAsync(RETRY_BASE_MS);
      });

      test('THEN the position update is not lost and is sent on the retry', () => {
        expect(updateCanvasNodePositions).toHaveBeenCalledExactlyOnceWith([{ id: 'n1', x: 5, y: 5 }]);
        expect(createCanvasNode).toHaveBeenCalledTimes(2);
        expect(getSaveState().status).toBe('saved');
      });
    });
  });

  describe('GIVEN a position batch that fails to save', () => {
    beforeEach(() => {
      vi.mocked(updateCanvasNodePositions).mockRejectedValueOnce(new Error('positions failed'));
      enqueueOperation(updatePositionOp('n1', 5, 5));
      enqueueOperation(updatePositionOp('n2', 9, 9));
    });

    describe('WHEN the flush fails once and then retries', () => {
      beforeEach(async () => {
        await vi.advanceTimersByTimeAsync(FLUSH_DEBOUNCE_MS);
        await vi.advanceTimersByTimeAsync(RETRY_BASE_MS);
      });

      test('THEN both positions are retried together and saved', () => {
        expect(updateCanvasNodePositions).toHaveBeenCalledTimes(2);
        expect(updateCanvasNodePositions).toHaveBeenLastCalledWith([
          { id: 'n1', x: 5, y: 5 },
          { id: 'n2', x: 9, y: 9 },
        ]);
        expect(getSaveState().status).toBe('saved');
      });
    });
  });

  describe('GIVEN a batch whose edge create fails once', () => {
    beforeEach(() => {
      vi.mocked(createCanvasEdge).mockRejectedValueOnce(new Error('edge failed'));
      enqueueOperation(createNodeOp('n1'));
      enqueueOperation(createEdgeOp('e1'));
    });

    describe('WHEN the flush and the retry run', () => {
      beforeEach(async () => {
        await vi.advanceTimersByTimeAsync(FLUSH_DEBOUNCE_MS);
        await vi.advanceTimersByTimeAsync(RETRY_BASE_MS);
      });

      test('THEN the completed create is not re-sent', () => {
        expect(createCanvasNode).toHaveBeenCalledTimes(1);
      });

      test('THEN the failed edge is retried and saved', () => {
        expect(createCanvasEdge).toHaveBeenCalledTimes(2);
        expect(getSaveState().status).toBe('saved');
      });
    });
  });

  describe('GIVEN an api that keeps failing', () => {
    beforeEach(() => {
      vi.mocked(createCanvasNode).mockRejectedValue(new Error('down'));
    });

    describe('WHEN the retries are exhausted', () => {
      beforeEach(async () => {
        enqueueOperation(createNodeOp('n1'));
        await vi.advanceTimersByTimeAsync(FLUSH_DEBOUNCE_MS);
        await vi.advanceTimersByTimeAsync(TOTAL_RETRY_BACKOFF_MS);
      });

      test('THEN the batch parks in failed operations', () => {
        expect(getSaveState()).toMatchObject({ status: 'error', failedCount: 1, pendingCount: 0 });
      });

      test('THEN the api attempts stop at the retry limit', () => {
        expect(createCanvasNode).toHaveBeenCalledTimes(1 + MAX_RETRIES);
      });

      test('THEN the failure is reported once without a toast', () => {
        expect(event.error).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ message: 'down' }), {
          toast: false,
          context: 'canvas.flush',
        });
      });
    });
  });

  describe('GIVEN a batch parked in failed operations', () => {
    beforeEach(async () => {
      vi.mocked(createCanvasNode).mockRejectedValue(new Error('save failed'));
      enqueueOperation(createNodeOp('n1'));
      await vi.advanceTimersByTimeAsync(FLUSH_DEBOUNCE_MS);
      await vi.advanceTimersByTimeAsync(TOTAL_RETRY_BACKOFF_MS);
      vi.mocked(createCanvasNode).mockReset();
    });

    describe('WHEN retryFailed is called', () => {
      beforeEach(async () => {
        retryFailed();
        await vi.advanceTimersByTimeAsync(FLUSH_DEBOUNCE_MS);
      });

      test('THEN the operations are re-sent and saved', () => {
        expect(createCanvasNode).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ id: 'n1' }));
        expect(getSaveState()).toMatchObject({ status: 'saved', failedCount: 0, pendingCount: 0 });
      });
    });

    describe('WHEN retryFailed is called while another flush is inflight', () => {
      let settleInflight: () => void;

      beforeEach(async () => {
        const deferred = Promise.withResolvers<void>();
        settleInflight = deferred.resolve;
        vi.mocked(createCanvasNode).mockReturnValueOnce(deferred.promise);
        enqueueOperation(createNodeOp('n2'));
        await vi.advanceTimersByTimeAsync(FLUSH_DEBOUNCE_MS);
        retryFailed();
      });

      afterEach(() => {
        settleInflight();
      });

      test('THEN the failed batch stays parked until the flush settles', () => {
        expect(createCanvasNode).toHaveBeenCalledTimes(1);
        expect(getSaveState()).toMatchObject({ failedCount: 1 });
      });
    });

    describe('WHEN discardFailed is called', () => {
      beforeEach(async () => {
        discardFailed();
        await vi.advanceTimersByTimeAsync(FLUSH_DEBOUNCE_MS * 4);
      });

      test('THEN nothing is re-sent', () => {
        expect(createCanvasNode).not.toHaveBeenCalled();
        expect(getSaveState()).toMatchObject({ status: 'saved', failedCount: 0 });
      });
    });

    describe('WHEN discardFailed is called with a fresh pending operation', () => {
      beforeEach(() => {
        enqueueOperation(createNodeOp('n2'));
        discardFailed();
      });

      test('THEN the queue starts saving only the pending operation', () => {
        expect(getSaveState()).toMatchObject({ status: 'saving', failedCount: 0, pendingCount: 1 });
      });
    });

    describe('WHEN the debounce window closes after a discard with a fresh pending operation', () => {
      beforeEach(async () => {
        enqueueOperation(createNodeOp('n2'));
        discardFailed();
        await vi.advanceTimersByTimeAsync(FLUSH_DEBOUNCE_MS);
      });

      test('THEN only the pending operation is re-sent', () => {
        expect(createCanvasNode).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ id: 'n2' }));
      });
    });

    describe('WHEN the browser reports connectivity restored', () => {
      beforeEach(async () => {
        window.dispatchEvent(new Event('online'));
        await vi.advanceTimersByTimeAsync(FLUSH_DEBOUNCE_MS);
      });

      test('THEN the failed operation is requeued and saved automatically', () => {
        expect(createCanvasNode).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ id: 'n1' }));
        expect(getSaveState()).toMatchObject({ status: 'saved', failedCount: 0, pendingCount: 0 });
      });
    });

    describe('WHEN another change saves afterwards', () => {
      beforeEach(async () => {
        enqueueOperation(createNodeOp('n2'));
        await vi.advanceTimersByTimeAsync(FLUSH_DEBOUNCE_MS);
      });

      test('THEN the error and its failed count stay so Retry and Discard remain offered', () => {
        expect(createCanvasNode).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ id: 'n2' }));
        expect(getSaveState()).toMatchObject({ status: 'error', failedCount: 1, pendingCount: 0 });
      });
    });

    describe('WHEN another change needs an automatic retry before it saves', () => {
      beforeEach(async () => {
        unsubscribers.push(subscribeSaveState(onSaveState));
        onSaveState.mockClear();
        vi.mocked(createCanvasNode).mockRejectedValueOnce(new Error('blip'));
        enqueueOperation(createNodeOp('n2'));
        await vi.advanceTimersByTimeAsync(FLUSH_DEBOUNCE_MS);
        await vi.advanceTimersByTimeAsync(RETRY_BASE_MS);
      });

      test('THEN the status reads error with the parked count the whole time', () => {
        expect(createCanvasNode).toHaveBeenCalledTimes(2);
        expect(new Set(onSaveState.mock.calls.map(([state]) => state.status))).toEqual(new Set(['error']));
        expect(getSaveState()).toMatchObject({ status: 'error', failedCount: 1, pendingCount: 0 });
      });
    });

    describe('WHEN the connection drops', () => {
      beforeEach(() => {
        Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: false });
        window.dispatchEvent(new Event('offline'));
      });

      test('THEN offline is reported because reconnecting retries the parked operation', () => {
        expect(getSaveState()).toMatchObject({ status: 'offline', failedCount: 1 });
      });
    });

    describe('WHEN the connection drops and comes back', () => {
      beforeEach(async () => {
        Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: false });
        window.dispatchEvent(new Event('offline'));
        Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: true });
        window.dispatchEvent(new Event('online'));
        await vi.advanceTimersByTimeAsync(FLUSH_DEBOUNCE_MS);
      });

      test('THEN the parked operation is retried and the queue reports saved', () => {
        expect(createCanvasNode).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ id: 'n1' }));
        expect(getSaveState()).toMatchObject({ status: 'saved', failedCount: 0, pendingCount: 0 });
      });
    });
  });

  describe('GIVEN a node create parked in failed operations', () => {
    beforeEach(async () => {
      vi.mocked(createCanvasNode).mockRejectedValue(new Error('save failed'));
      enqueueOperation(createNodeOp('node-a'));
      await vi.advanceTimersByTimeAsync(FLUSH_DEBOUNCE_MS);
      await vi.advanceTimersByTimeAsync(TOTAL_RETRY_BACKOFF_MS);
      vi.mocked(createCanvasNode).mockReset();
    });

    describe('WHEN the node is deleted', () => {
      beforeEach(async () => {
        enqueueOperation(deleteNodeOp('node-a'));
        await vi.advanceTimersByTimeAsync(FLUSH_DEBOUNCE_MS);
      });

      test('THEN the parked create is cancelled and nothing is sent for the node', () => {
        expect(deleteCanvasNode).not.toHaveBeenCalled();
        expect(getSaveState()).toMatchObject({ status: 'saved', failedCount: 0, pendingCount: 0 });
      });
    });

    describe('WHEN the node is deleted while another change still waits for its flush', () => {
      beforeEach(() => {
        enqueueOperation(createNodeOp('n2'));
        enqueueOperation(deleteNodeOp('node-a'));
      });

      test('THEN the error clears into saving instead of claiming everything is saved', () => {
        expect(getSaveState()).toMatchObject({ status: 'saving', failedCount: 0, pendingCount: 1 });
      });
    });

    describe('WHEN the node is deleted and the failed operations are retried', () => {
      beforeEach(async () => {
        enqueueOperation(deleteNodeOp('node-a'));
        await vi.advanceTimersByTimeAsync(FLUSH_DEBOUNCE_MS);
        retryFailed();
        await vi.advanceTimersByTimeAsync(FLUSH_DEBOUNCE_MS);
      });

      test('THEN the deleted node is not created again', () => {
        expect(createCanvasNode).not.toHaveBeenCalled();
      });
    });

    describe('WHEN the node is moved and relabelled', () => {
      beforeEach(async () => {
        enqueueOperation(updatePositionOp('node-a', 40, 60));
        enqueueOperation(updateLabelOp('node-a', 'Renamed'));
        await vi.advanceTimersByTimeAsync(FLUSH_DEBOUNCE_MS);
      });

      test('THEN no update runs against the missing row and the edits fold into the parked create', () => {
        expect(updateCanvasNodePositions).not.toHaveBeenCalled();
        expect(updateCanvasNodeLabel).not.toHaveBeenCalled();
        expect(getSaveState()).toMatchObject({ status: 'error', failedCount: 1, pendingCount: 0 });
      });
    });

    describe('WHEN the node is moved and relabelled and the failed operations are retried', () => {
      beforeEach(async () => {
        enqueueOperation(updatePositionOp('node-a', 40, 60));
        enqueueOperation(updateLabelOp('node-a', 'Renamed'));
        retryFailed();
        await vi.advanceTimersByTimeAsync(FLUSH_DEBOUNCE_MS);
      });

      test('THEN the node is created with the latest position and label in one call', () => {
        expect(createCanvasNode).toHaveBeenCalledExactlyOnceWith(
          expect.objectContaining({ id: 'node-a', x: 40, y: 60, label: 'Renamed' }),
        );
        expect(updateCanvasNodePositions).not.toHaveBeenCalled();
        expect(updateCanvasNodeLabel).not.toHaveBeenCalled();
      });
    });

    describe('WHEN the node is marked valid', () => {
      beforeEach(async () => {
        enqueueOperation(updateStatusOp('node-a', 'valid'));
        await vi.advanceTimersByTimeAsync(FLUSH_DEBOUNCE_MS);
      });

      test('THEN the verdict waits with the parked create instead of being sent', () => {
        expect(updateCanvasNodeStatus).not.toHaveBeenCalled();
        expect(getSaveState()).toMatchObject({ status: 'error', failedCount: 2, pendingCount: 0 });
      });
    });

    describe('WHEN the node is marked valid twice and the failed operations are retried', () => {
      beforeEach(async () => {
        enqueueOperation(updateStatusOp('node-a', 'invalid'));
        enqueueOperation(updateStatusOp('node-a', 'valid'));
        retryFailed();
        await vi.advanceTimersByTimeAsync(FLUSH_DEBOUNCE_MS);
      });

      test('THEN only the latest verdict is saved, after the node is created', () => {
        expect(updateCanvasNodeStatus).toHaveBeenCalledExactlyOnceWith('node-a', 'valid');
        expect(vi.mocked(updateCanvasNodeStatus).mock.invocationCallOrder[0]).toBeGreaterThan(
          vi.mocked(createCanvasNode).mock.invocationCallOrder[0] ?? Infinity,
        );
      });
    });

    describe('WHEN an edge and a comment are attached to the node', () => {
      beforeEach(async () => {
        enqueueOperation(createEdgeOp('e1'));
        enqueueOperation(createCommentOp('c1'));
        await vi.advanceTimersByTimeAsync(FLUSH_DEBOUNCE_MS);
      });

      test('THEN they wait with the parked create instead of failing on the missing node', () => {
        expect(createCanvasEdge).not.toHaveBeenCalled();
        expect(createNodeComment).not.toHaveBeenCalled();
        expect(getSaveState()).toMatchObject({ status: 'error', failedCount: 3, pendingCount: 0 });
      });
    });

    describe('WHEN an edge and a comment are attached, the node is deleted and the failed operations are retried', () => {
      beforeEach(async () => {
        enqueueOperation(createEdgeOp('e1'));
        enqueueOperation(createCommentOp('c1'));
        enqueueOperation(deleteNodeOp('node-a'));
        await vi.advanceTimersByTimeAsync(FLUSH_DEBOUNCE_MS);
        retryFailed();
        await vi.advanceTimersByTimeAsync(FLUSH_DEBOUNCE_MS);
      });

      test('THEN nothing is sent for the node or its attachments', () => {
        expect(createCanvasNode).not.toHaveBeenCalled();
        expect(createCanvasEdge).not.toHaveBeenCalled();
        expect(createNodeComment).not.toHaveBeenCalled();
        expect(deleteCanvasNode).not.toHaveBeenCalled();
        expect(getSaveState()).toMatchObject({ status: 'saved', failedCount: 0, pendingCount: 0 });
      });
    });
  });

  describe('GIVEN a parked node create and a second node still retrying when an edge joins them', () => {
    beforeEach(async () => {
      vi.mocked(createCanvasNode).mockRejectedValue(new Error('down'));
      enqueueOperation(createNodeOp('node-a'));
      await vi.advanceTimersByTimeAsync(FLUSH_DEBOUNCE_MS);
      await vi.advanceTimersByTimeAsync(TOTAL_RETRY_BACKOFF_MS);
      enqueueOperation(createNodeOp('node-b'));
      await vi.advanceTimersByTimeAsync(FLUSH_DEBOUNCE_MS);
      enqueueOperation(createEdgeOp('e1'));
      await vi.advanceTimersByTimeAsync(TOTAL_RETRY_BACKOFF_MS);
      vi.mocked(createCanvasNode).mockReset();
    });

    describe('WHEN the failed operations are retried', () => {
      beforeEach(async () => {
        retryFailed();
        await vi.advanceTimersByTimeAsync(FLUSH_DEBOUNCE_MS);
      });

      test('THEN the edge is sent only after both of its nodes are created', () => {
        expect(vi.mocked(createCanvasNode).mock.calls.map(([input]) => input.id)).toEqual(['node-a', 'node-b']);
        expect(vi.mocked(createCanvasEdge).mock.invocationCallOrder[0]).toBeGreaterThan(
          Math.max(...vi.mocked(createCanvasNode).mock.invocationCallOrder),
        );
        expect(getSaveState()).toMatchObject({ status: 'saved', failedCount: 0, pendingCount: 0 });
      });
    });
  });

  describe('GIVEN a parked node create when the connection drops and a new node is joined to it', () => {
    beforeEach(async () => {
      vi.mocked(createCanvasNode).mockRejectedValue(new Error('down'));
      enqueueOperation(createNodeOp('node-a'));
      await vi.advanceTimersByTimeAsync(FLUSH_DEBOUNCE_MS);
      await vi.advanceTimersByTimeAsync(TOTAL_RETRY_BACKOFF_MS);
      vi.mocked(createCanvasNode).mockReset();
      Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: false });
      window.dispatchEvent(new Event('offline'));
      enqueueOperation(createNodeOp('node-b'));
      enqueueOperation(createEdgeOp('e1'));
    });

    describe('WHEN the connection comes back', () => {
      beforeEach(async () => {
        Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: true });
        window.dispatchEvent(new Event('online'));
        await vi.advanceTimersByTimeAsync(FLUSH_DEBOUNCE_MS);
      });

      test('THEN the edge is sent only after both of its nodes are created', () => {
        expect(vi.mocked(createCanvasNode).mock.calls.map(([input]) => input.id)).toEqual(['node-a', 'node-b']);
        expect(vi.mocked(createCanvasEdge).mock.invocationCallOrder[0]).toBeGreaterThan(
          Math.max(...vi.mocked(createCanvasNode).mock.invocationCallOrder),
        );
        expect(getSaveState()).toMatchObject({ status: 'saved', failedCount: 0, pendingCount: 0 });
      });
    });
  });

  describe('GIVEN an edge create parked in failed operations', () => {
    beforeEach(async () => {
      vi.mocked(createCanvasEdge).mockRejectedValue(new Error('save failed'));
      enqueueOperation(createEdgeOp('e1'));
      await vi.advanceTimersByTimeAsync(FLUSH_DEBOUNCE_MS);
      await vi.advanceTimersByTimeAsync(TOTAL_RETRY_BACKOFF_MS);
      vi.mocked(createCanvasEdge).mockReset();
    });

    describe('WHEN the edge is deleted', () => {
      beforeEach(async () => {
        enqueueOperation(deleteEdgeOp('e1'));
        await vi.advanceTimersByTimeAsync(FLUSH_DEBOUNCE_MS);
      });

      test('THEN the parked create is cancelled and nothing is sent for the edge', () => {
        expect(deleteCanvasEdge).not.toHaveBeenCalled();
        expect(getSaveState()).toMatchObject({ status: 'saved', failedCount: 0, pendingCount: 0 });
      });
    });
  });

  describe('GIVEN a comment create parked in failed operations', () => {
    beforeEach(async () => {
      vi.mocked(createNodeComment).mockRejectedValue(new Error('save failed'));
      enqueueOperation(createCommentOp('c1'));
      await vi.advanceTimersByTimeAsync(FLUSH_DEBOUNCE_MS);
      await vi.advanceTimersByTimeAsync(TOTAL_RETRY_BACKOFF_MS);
      vi.mocked(createNodeComment).mockReset();
    });

    describe('WHEN the comment is deleted', () => {
      beforeEach(async () => {
        enqueueOperation(deleteCommentOp('c1'));
        await vi.advanceTimersByTimeAsync(FLUSH_DEBOUNCE_MS);
      });

      test('THEN the parked create is cancelled and nothing is sent for the comment', () => {
        expect(deleteNodeComment).not.toHaveBeenCalled();
        expect(getSaveState()).toMatchObject({ status: 'saved', failedCount: 0, pendingCount: 0 });
      });
    });
  });

  describe('GIVEN a label update the database refuses because no row was changed', () => {
    beforeEach(() => {
      vi.mocked(updateCanvasNodeLabel).mockRejectedValue({ code: 'PGRST116', message: 'no rows returned' });
      enqueueOperation(updateLabelOp('n1', 'Renamed'));
    });

    describe('WHEN the retries are exhausted', () => {
      beforeEach(async () => {
        await vi.advanceTimersByTimeAsync(FLUSH_DEBOUNCE_MS);
        await vi.advanceTimersByTimeAsync(TOTAL_RETRY_BACKOFF_MS);
      });

      test('THEN the update parks behind Retry and Discard instead of passing as saved', () => {
        expect(updateCanvasNodeLabel).toHaveBeenCalledTimes(1 + MAX_RETRIES);
        expect(getSaveState()).toMatchObject({ status: 'error', failedCount: 1, pendingCount: 0 });
        expect(event.error).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ code: 'PGRST116' }), {
          toast: false,
          context: 'canvas.flush',
        });
      });
    });

    describe('WHEN the parked node is deleted and the failed operations are retried', () => {
      beforeEach(async () => {
        await vi.advanceTimersByTimeAsync(FLUSH_DEBOUNCE_MS);
        await vi.advanceTimersByTimeAsync(TOTAL_RETRY_BACKOFF_MS);
        vi.mocked(updateCanvasNodeLabel).mockReset();
        enqueueOperation(deleteNodeOp('n1'));
        await vi.advanceTimersByTimeAsync(FLUSH_DEBOUNCE_MS);
        retryFailed();
        await vi.advanceTimersByTimeAsync(FLUSH_DEBOUNCE_MS);
      });

      test('THEN the delete is sent and the parked update of the deleted node is dropped', () => {
        expect(deleteCanvasNode).toHaveBeenCalledExactlyOnceWith('n1');
        expect(updateCanvasNodeLabel).not.toHaveBeenCalled();
        expect(getSaveState()).toMatchObject({ status: 'saved', failedCount: 0, pendingCount: 0 });
      });
    });

    describe('WHEN the label is edited again and the failed operations are retried', () => {
      beforeEach(async () => {
        await vi.advanceTimersByTimeAsync(FLUSH_DEBOUNCE_MS);
        await vi.advanceTimersByTimeAsync(TOTAL_RETRY_BACKOFF_MS);
        vi.mocked(updateCanvasNodeLabel).mockReset();
        enqueueOperation(updateLabelOp('n1', 'Newest'));
        await vi.advanceTimersByTimeAsync(FLUSH_DEBOUNCE_MS);
        retryFailed();
        await vi.advanceTimersByTimeAsync(FLUSH_DEBOUNCE_MS);
      });

      test('THEN the newer label supersedes the parked one and is the only one written', () => {
        expect(vi.mocked(updateCanvasNodeLabel).mock.calls).toEqual([['n1', 'Newest']]);
        expect(getSaveState()).toMatchObject({ status: 'saved', failedCount: 0, pendingCount: 0 });
      });
    });
  });

  describe('GIVEN a position update parked in failed operations for a node saved earlier', () => {
    beforeEach(async () => {
      vi.mocked(updateCanvasNodePositions).mockRejectedValue(new Error('save failed'));
      enqueueOperation(updatePositionOp('n1', 10, 10));
      await vi.advanceTimersByTimeAsync(FLUSH_DEBOUNCE_MS);
      await vi.advanceTimersByTimeAsync(TOTAL_RETRY_BACKOFF_MS);
      vi.mocked(updateCanvasNodePositions).mockReset();
    });

    describe('WHEN the node is moved again and the failed operations are retried', () => {
      beforeEach(async () => {
        enqueueOperation(updatePositionOp('n1', 50, 60));
        await vi.advanceTimersByTimeAsync(FLUSH_DEBOUNCE_MS);
        retryFailed();
        await vi.advanceTimersByTimeAsync(FLUSH_DEBOUNCE_MS);
      });

      test('THEN the newer position supersedes the parked one and is the only one written', () => {
        expect(vi.mocked(updateCanvasNodePositions).mock.calls).toEqual([[[{ id: 'n1', x: 50, y: 60 }]]]);
        expect(getSaveState()).toMatchObject({ status: 'saved', failedCount: 0, pendingCount: 0 });
      });
    });
  });

  describe('GIVEN a batch parked in failed operations while another create is in flight', () => {
    let settleInflight: () => void;

    beforeEach(async () => {
      vi.mocked(createCanvasNode).mockRejectedValue(new Error('save failed'));
      enqueueOperation(createNodeOp('n1'));
      await vi.advanceTimersByTimeAsync(FLUSH_DEBOUNCE_MS);
      await vi.advanceTimersByTimeAsync(TOTAL_RETRY_BACKOFF_MS);
      vi.mocked(createCanvasNode).mockReset();
      const deferred = Promise.withResolvers<void>();
      settleInflight = deferred.resolve;
      vi.mocked(createCanvasNode).mockReturnValueOnce(deferred.promise);
      enqueueOperation(createNodeOp('n2'));
      await vi.advanceTimersByTimeAsync(FLUSH_DEBOUNCE_MS);
      unsubscribers.push(subscribeSaveState(onSaveState));
      onSaveState.mockClear();
    });

    afterEach(() => {
      settleInflight();
    });

    describe('WHEN the failed operations are discarded', () => {
      beforeEach(() => {
        discardFailed();
      });

      test('THEN the queue reports saving until the other create settles', () => {
        expect(onSaveState.mock.calls.map(([state]) => state.status)).toEqual(['saving']);
        expect(getSaveState()).toMatchObject({ status: 'saving', failedCount: 0, pendingCount: 0 });
      });

      test('THEN unsaved changes are still reported for the in-flight save although both counts read zero', () => {
        expect(hasUnsavedChanges()).toBe(true);
      });
    });

    describe('WHEN the failed operations are discarded and the other create then saves', () => {
      beforeEach(async () => {
        discardFailed();
        settleInflight();
        await vi.advanceTimersByTimeAsync(0);
      });

      test('THEN saved is reported only once the flight is done', () => {
        expect(onSaveState.mock.calls.map(([state]) => state.status)).toEqual(['saving', 'saved']);
      });
    });

    describe('WHEN Retry is pressed before the other create settles', () => {
      beforeEach(async () => {
        retryFailed();
        settleInflight();
        await vi.advanceTimersByTimeAsync(FLUSH_DEBOUNCE_MS);
      });

      test('THEN the retry runs right after the flight instead of being lost', () => {
        expect(vi.mocked(createCanvasNode).mock.calls.map(([input]) => input.id)).toEqual(['n2', 'n1']);
        expect(getSaveState()).toMatchObject({ status: 'saved', failedCount: 0, pendingCount: 0 });
      });
    });
  });

  describe('GIVEN a status update parked in failed operations for a node saved earlier', () => {
    beforeEach(async () => {
      vi.mocked(updateCanvasNodeStatus).mockRejectedValue(new Error('save failed'));
      enqueueOperation(updateStatusOp('n1', 'valid'));
      await vi.advanceTimersByTimeAsync(FLUSH_DEBOUNCE_MS);
      await vi.advanceTimersByTimeAsync(TOTAL_RETRY_BACKOFF_MS);
      unsubscribers.push(subscribeSaveState(onSaveState));
      onSaveState.mockClear();
    });

    describe('WHEN the node is deleted', () => {
      beforeEach(() => {
        enqueueOperation(deleteNodeOp('n1'));
      });

      test('THEN the queue goes straight to saving the delete without a passing saved', () => {
        expect(onSaveState.mock.calls.map(([state]) => state.status)).toEqual(['saving']);
        expect(getSaveState()).toMatchObject({ status: 'saving', failedCount: 0, pendingCount: 1 });
      });
    });
  });

  describe('GIVEN an idle queue with no failed operations', () => {
    describe('WHEN retryFailed is called', () => {
      beforeEach(() => {
        retryFailed();
      });

      test('THEN the save state does not change', () => {
        expect(getSaveState()).toMatchObject({ status: 'idle', failedCount: 0, pendingCount: 0 });
      });
    });
  });

  describe('GIVEN a saved queue with a save state subscriber', () => {
    beforeEach(async () => {
      enqueueOperation(createNodeOp('n1'));
      await vi.advanceTimersByTimeAsync(FLUSH_DEBOUNCE_MS);
      unsubscribers.push(subscribeSaveState(onSaveState));
      onSaveState.mockClear();
    });

    describe('WHEN a duplicate online event arrives with nothing pending', () => {
      beforeEach(() => {
        window.dispatchEvent(new Event('online'));
      });

      test('THEN the listener is not notified again', () => {
        expect(onSaveState).not.toHaveBeenCalled();
      });
    });
  });

  describe('GIVEN pending operations while the browser is offline', () => {
    beforeEach(() => {
      enqueueOperation(createNodeOp('n1'));
      Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: false });
      window.dispatchEvent(new Event('offline'));
      enqueueOperation(createNodeOp('n2'));
    });

    describe('WHEN the flush window passes', () => {
      beforeEach(async () => {
        await vi.advanceTimersByTimeAsync(FLUSH_DEBOUNCE_MS * 4);
      });

      test('THEN nothing is sent', () => {
        expect(createCanvasNode).not.toHaveBeenCalled();
      });

      test('THEN the queue stays offline with both operations pending', () => {
        expect(getSaveState()).toMatchObject({ status: 'offline', pendingCount: 2 });
      });
    });

    describe('WHEN the connection is restored', () => {
      beforeEach(async () => {
        Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: true });
        window.dispatchEvent(new Event('online'));
        await vi.advanceTimersByTimeAsync(FLUSH_DEBOUNCE_MS);
      });

      test('THEN the held operations flush', () => {
        expect(createCanvasNode).toHaveBeenCalledTimes(2);
      });

      test('THEN the state reports saved', () => {
        expect(getSaveState().status).toBe('saved');
      });
    });
  });

  describe('GIVEN a flush attempt while the connection drops', () => {
    beforeEach(() => {
      vi.mocked(createCanvasNode).mockRejectedValueOnce(new Error('network'));
      enqueueOperation(createNodeOp('n1'));
      Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: false });
    });

    describe('WHEN the flush window passes', () => {
      beforeEach(async () => {
        await vi.advanceTimersByTimeAsync(FLUSH_DEBOUNCE_MS);
      });

      test('THEN the queue goes offline keeping the operation pending', () => {
        expect(getSaveState()).toMatchObject({ status: 'offline', pendingCount: 1 });
      });
    });

    describe('WHEN the connection is restored after the failed attempt', () => {
      beforeEach(async () => {
        await vi.advanceTimersByTimeAsync(FLUSH_DEBOUNCE_MS);
        Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: true });
        window.dispatchEvent(new Event('online'));
        await vi.advanceTimersByTimeAsync(FLUSH_DEBOUNCE_MS);
      });

      test('THEN the operation is recovered and saved', () => {
        expect(createCanvasNode).toHaveBeenCalledTimes(2);
        expect(getSaveState().status).toBe('saved');
      });
    });
  });

  describe('GIVEN a queue that went offline without a browser online event', () => {
    beforeEach(() => {
      enqueueOperation(createNodeOp('n1'));
      Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: false });
      window.dispatchEvent(new Event('offline'));
      Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: true });
    });

    describe('WHEN the offline poll interval elapses', () => {
      beforeEach(async () => {
        await vi.advanceTimersByTimeAsync(OFFLINE_POLL_INTERVAL_MS);
        await vi.advanceTimersByTimeAsync(FLUSH_DEBOUNCE_MS);
      });

      test('THEN the queue recovers and flushes without an online event', () => {
        expect(createCanvasNode).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ id: 'n1' }));
        expect(getSaveState().status).toBe('saved');
      });
    });
  });

  describe('GIVEN a queue that already recovered from one offline period', () => {
    beforeEach(async () => {
      enqueueOperation(createNodeOp('n1'));
      Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: false });
      window.dispatchEvent(new Event('offline'));
      Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: true });
      window.dispatchEvent(new Event('online'));
      await vi.advanceTimersByTimeAsync(FLUSH_DEBOUNCE_MS);
      enqueueOperation(createNodeOp('n2'));
      Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: false });
      window.dispatchEvent(new Event('offline'));
      Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: true });
    });

    describe('WHEN the offline poll interval elapses during the second period', () => {
      beforeEach(async () => {
        await vi.advanceTimersByTimeAsync(OFFLINE_POLL_INTERVAL_MS);
        await vi.advanceTimersByTimeAsync(FLUSH_DEBOUNCE_MS);
      });

      test('THEN the poll runs again and the held operation flushes without an online event', () => {
        expect(createCanvasNode).toHaveBeenCalledTimes(2);
        expect(createCanvasNode).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'n2' }));
        expect(getSaveState().status).toBe('saved');
      });
    });
  });

  describe('GIVEN a queue reset while it believed the browser was offline', () => {
    beforeEach(() => {
      Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: false });
      enqueueOperation(createNodeOp('stale'));
      window.dispatchEvent(new Event('offline'));
      Reflect.deleteProperty(window.navigator, 'onLine');
      resetQueue();
    });

    describe('WHEN a new operation is enqueued on the online browser', () => {
      beforeEach(async () => {
        enqueueOperation(createNodeOp('fresh'));
        await vi.advanceTimersByTimeAsync(FLUSH_DEBOUNCE_MS);
      });

      test('THEN it flushes instead of waiting for an online event', () => {
        expect(createCanvasNode).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ id: 'fresh' }));
        expect(getSaveState().status).toBe('saved');
      });
    });
  });

  describe('GIVEN an in-flight flush with an operation queued behind it', () => {
    let settleInflight: () => void;

    beforeEach(async () => {
      const deferred = Promise.withResolvers<void>();
      settleInflight = deferred.resolve;
      vi.mocked(createCanvasNode).mockReturnValueOnce(deferred.promise);
      enqueueOperation(createNodeOp('n1'));
      await vi.advanceTimersByTimeAsync(FLUSH_DEBOUNCE_MS);
      enqueueOperation(createNodeOp('n2'));
    });

    describe('WHEN the connection drops before the in-flight save settles', () => {
      beforeEach(async () => {
        Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: false });
        window.dispatchEvent(new Event('offline'));
        settleInflight();
        await vi.advanceTimersByTimeAsync(FLUSH_DEBOUNCE_MS);
      });

      test('THEN the queue reports offline with the queued operation still pending', () => {
        expect(getSaveState()).toMatchObject({ status: 'offline', pendingCount: 1 });
        expect(createCanvasNode).toHaveBeenCalledTimes(1);
      });
    });
  });
});
