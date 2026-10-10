import { act, cleanup, renderHook, type RenderHookResult } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { ECanvasNodeType, type ICanvasSnapshot } from '@interfaces';
import {
  createCanvasEdge,
  createCanvasNode,
  createNodeComment,
  deleteCanvasNode,
  getCanvasContent,
  updateCanvasNodeLabel,
  updateCanvasNodePositions,
} from '@api/client';
import { THREAD_ID, canvasEdge, canvasNode } from '@mocks/canvas';
import { EDIT_ACCESS, FULL_ACCESS, READONLY_ACCESS } from '@mocks/roles';
import { useCanvasSync } from '@/components/Canvas/hooks';
import { ECanvasTool } from '@/components/tools';
import { FLUSH_DEBOUNCE_MS, MAX_RETRIES, RETRY_BASE_MS, getSaveState, resetQueue } from '@/lib/canvas';
import { event } from '@/lib/events';
import { useCanvasStore, usePermissionsStore } from '@/lib/stores';

vi.mock('@api/client', () => import('@mocks/canvasApi'));
vi.mock('@/lib/events', () => import('@mocks/events'));

const LOAD_TIMEOUT_MS = 15000;
const WORKSPACE_ID = 'ws-1';

const canvasContent = (): ICanvasSnapshot => ({
  nodes: [canvasNode('own', { createdBy: 'user-1' }), canvasNode('foreign', { createdBy: 'user-2' })],
  edges: [canvasEdge('e1', 'own', 'foreign')],
});

let sync: { current: ReturnType<typeof useCanvasSync> };
let unmountSync: () => void;

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(async () => {
  cleanup();
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
  Reflect.deleteProperty(window.navigator, 'onLine');
  window.dispatchEvent(new Event('online'));
  resetQueue();
  useCanvasStore.getState().clearCanvas();
  usePermissionsStore.getState().clearAccess();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('useCanvasSync', () => {
  describe('GIVEN an editor on a thread with persisted content', () => {
    beforeEach(async () => {
      usePermissionsStore.getState().setAccess('ws-1', 'user-1', EDIT_ACCESS);
      vi.mocked(getCanvasContent).mockResolvedValue(canvasContent());

      const view = renderHook(() => useCanvasSync(WORKSPACE_ID, THREAD_ID));

      sync = view.result;
      unmountSync = view.unmount;
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
    });

    describe('WHEN the canvas loads', () => {
      test('THEN the store hydrates with the persisted content', () => {
        expect(getCanvasContent).toHaveBeenCalledExactlyOnceWith(WORKSPACE_ID, THREAD_ID);
        expect(useCanvasStore.getState()).toMatchObject({ threadId: THREAD_ID, hydrated: true });
        expect(useCanvasStore.getState().nodes.map((node) => node.id)).toEqual(['own', 'foreign']);
        expect(useCanvasStore.getState().edges).toHaveLength(1);
      });

      test('THEN the save state starts idle without a load error', () => {
        expect(sync.current.loadFailed).toBe(false);
        expect(sync.current.saveState).toMatchObject({ status: 'idle', pendingCount: 0 });
      });
    });

    describe('WHEN a change is waiting for the debounce window', () => {
      beforeEach(() => {
        act(() => useCanvasStore.getState().addNode({ x: 10, y: 20 }, 'Idea'));
      });

      test('THEN the hook reports the pending save', () => {
        expect(sync.current.saveState).toMatchObject({ status: 'saving', pendingCount: 1 });
      });
    });

    describe('WHEN the debounce window closes after a change', () => {
      beforeEach(async () => {
        act(() => useCanvasStore.getState().addNode({ x: 10, y: 20 }, 'Idea'));
        await act(async () => {
          await vi.advanceTimersByTimeAsync(FLUSH_DEBOUNCE_MS);
        });
      });

      test('THEN the hook reports the completed save', () => {
        expect(sync.current.saveState).toMatchObject({ status: 'saved', pendingCount: 0 });
        expect(sync.current.saveState.lastSavedAt).not.toBeNull();
      });
    });

    describe('WHEN they add a node and rename it within one debounce window', () => {
      let createdId: string;

      beforeEach(async () => {
        act(() => useCanvasStore.getState().addNode({ x: 10, y: 20 }, 'Idea'));
        createdId = useCanvasStore.getState().nodes.find((node) => node.data.label === 'Idea')!.id;
        act(() => useCanvasStore.getState().updateNodeLabel(createdId, 'Refined'));
        await act(async () => {
          await vi.advanceTimersByTimeAsync(FLUSH_DEBOUNCE_MS);
        });
      });

      test('THEN the create and the rename reach the api in order', () => {
        expect(createCanvasNode).toHaveBeenCalledExactlyOnceWith({
          id: createdId,
          threadId: THREAD_ID,
          type: ECanvasNodeType.Canvas,
          x: 10,
          y: 20,
          label: 'Idea',
          sourceNodeId: null,
        });
        expect(updateCanvasNodeLabel).toHaveBeenCalledExactlyOnceWith(createdId, 'Refined');
        expect(vi.mocked(updateCanvasNodeLabel).mock.invocationCallOrder[0]).toBeGreaterThan(
          vi.mocked(createCanvasNode).mock.invocationCallOrder[0]!,
        );
      });
    });

    describe('WHEN they add a node and delete it before the flush', () => {
      beforeEach(async () => {
        act(() => useCanvasStore.getState().addNode({ x: 0, y: 0 }, 'Ephemeral'));
        const createdId = useCanvasStore.getState().nodes.find((node) => node.data.label === 'Ephemeral')!.id;
        act(() => useCanvasStore.getState().deleteNode(createdId));
        await act(async () => {
          await vi.advanceTimersByTimeAsync(FLUSH_DEBOUNCE_MS);
        });
      });

      test('THEN nothing reaches the api and the state reports saved', () => {
        expect(createCanvasNode).not.toHaveBeenCalled();
        expect(deleteCanvasNode).not.toHaveBeenCalled();
        expect(sync.current.saveState).toMatchObject({ status: 'saved', pendingCount: 0 });
      });
    });

    describe('WHEN they drag their node across several frames', () => {
      beforeEach(async () => {
        act(() =>
          useCanvasStore
            .getState()
            .onNodesChange([{ type: 'position', id: 'own', position: { x: 50, y: 60 }, dragging: true }]),
        );
        act(() =>
          useCanvasStore
            .getState()
            .onNodesChange([{ type: 'position', id: 'own', position: { x: 80, y: 100 }, dragging: true }]),
        );
        act(() =>
          useCanvasStore
            .getState()
            .onNodesChange([{ type: 'position', id: 'own', position: { x: 80, y: 100 }, dragging: false }]),
        );
        await act(async () => {
          await vi.advanceTimersByTimeAsync(FLUSH_DEBOUNCE_MS);
        });
      });

      test('THEN one batched position update with the final coordinates reaches the api', () => {
        expect(updateCanvasNodePositions).toHaveBeenCalledExactlyOnceWith([{ id: 'own', x: 80, y: 100 }]);
      });
    });

    describe('WHEN they connect the loaded nodes in the reverse direction', () => {
      beforeEach(async () => {
        act(() =>
          useCanvasStore
            .getState()
            .connectNodes({ source: 'foreign', target: 'own', sourceHandle: 'right', targetHandle: 'left' }),
        );
        await act(async () => {
          await vi.advanceTimersByTimeAsync(FLUSH_DEBOUNCE_MS);
        });
      });

      test('THEN the edge reaches the api with the thread and the handles', () => {
        expect(createCanvasEdge).toHaveBeenCalledExactlyOnceWith(
          expect.objectContaining({
            threadId: THREAD_ID,
            sourceNodeId: 'foreign',
            targetNodeId: 'own',
            sourceHandle: 'right',
            targetHandle: 'left',
          }),
        );
      });
    });

    describe('WHEN they comment on the foreign node', () => {
      beforeEach(async () => {
        act(() => useCanvasStore.getState().addComment('foreign', 'Nice catch'));
        await act(async () => {
          await vi.advanceTimersByTimeAsync(FLUSH_DEBOUNCE_MS);
        });
      });

      test('THEN the comment reaches the api', () => {
        expect(createNodeComment).toHaveBeenCalledExactlyOnceWith(
          expect.objectContaining({ nodeId: 'foreign', text: 'Nice catch' }),
        );
      });
    });

    describe('WHEN they undo an addition that already flushed', () => {
      let createdId: string;

      beforeEach(async () => {
        act(() => useCanvasStore.getState().addNode({ x: 0, y: 0 }, 'Draft'));
        createdId = useCanvasStore.getState().nodes.find((node) => node.data.label === 'Draft')!.id;
        await act(async () => {
          await vi.advanceTimersByTimeAsync(FLUSH_DEBOUNCE_MS);
        });
        act(() => useCanvasStore.getState().undo());
        await act(async () => {
          await vi.advanceTimersByTimeAsync(FLUSH_DEBOUNCE_MS);
        });
      });

      test('THEN the replayed delete reaches the api', () => {
        expect(createCanvasNode).toHaveBeenCalledTimes(1);
        expect(deleteCanvasNode).toHaveBeenCalledExactlyOnceWith(createdId);
      });
    });

    describe('WHEN they undo an addition after losing their canvas edit access', () => {
      beforeEach(async () => {
        act(() => useCanvasStore.getState().addNode({ x: 0, y: 0 }, 'Draft'));
        await act(async () => {
          await vi.advanceTimersByTimeAsync(FLUSH_DEBOUNCE_MS);
        });
        act(() => usePermissionsStore.getState().setAccess('ws-1', 'user-1', READONLY_ACCESS));
        act(() => useCanvasStore.getState().undo());
        await act(async () => {
          await vi.advanceTimersByTimeAsync(FLUSH_DEBOUNCE_MS);
        });
      });

      test('THEN the addition stays and no delete reaches the api', () => {
        expect(useCanvasStore.getState().nodes.map((node) => node.data.label)).toContain('Draft');
        expect(deleteCanvasNode).not.toHaveBeenCalled();
      });
    });

    describe('WHEN they lose their canvas edit access with the add-node tool active', () => {
      beforeEach(() => {
        act(() => useCanvasStore.getState().setActiveTool(ECanvasTool.AddNode));
        act(() => usePermissionsStore.getState().setAccess('ws-1', 'user-1', READONLY_ACCESS));
      });

      test('THEN the tool returns to select', () => {
        expect(useCanvasStore.getState().activeTool).toBe(ECanvasTool.Select);
      });
    });

    describe('WHEN they lose their canvas edit access with the pan tool active', () => {
      beforeEach(() => {
        act(() => useCanvasStore.getState().setActiveTool(ECanvasTool.Pan));
        act(() => usePermissionsStore.getState().setAccess('ws-1', 'user-1', READONLY_ACCESS));
      });

      test('THEN the pan tool stays', () => {
        expect(useCanvasStore.getState().activeTool).toBe(ECanvasTool.Pan);
      });
    });

    describe('WHEN they gain the ownership with the add-node tool active', () => {
      beforeEach(() => {
        act(() => useCanvasStore.getState().setActiveTool(ECanvasTool.AddNode));
        act(() => usePermissionsStore.getState().setAccess('ws-1', 'user-1', FULL_ACCESS));
      });

      test('THEN the add-node tool stays', () => {
        expect(useCanvasStore.getState().activeTool).toBe(ECanvasTool.AddNode);
      });
    });

    describe('WHEN the hook unmounts with a pending operation', () => {
      beforeEach(async () => {
        act(() => useCanvasStore.getState().addNode({ x: 0, y: 0 }, 'Draft'));
        unmountSync();
        await act(async () => {
          await vi.advanceTimersByTimeAsync(0);
        });
      });

      test('THEN the pending create flushes without waiting for the debounce', () => {
        expect(createCanvasNode).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ label: 'Draft' }));
      });

      test('THEN the store and the queue reset', () => {
        expect(useCanvasStore.getState()).toMatchObject({ threadId: null, hydrated: false });
        expect(useCanvasStore.getState().nodes).toHaveLength(0);
      });
    });

    describe('WHEN the page tries to unload with unsaved changes', () => {
      let unloadEvent: Event;

      beforeEach(() => {
        act(() => useCanvasStore.getState().addNode({ x: 0, y: 0 }, 'Draft'));
        unloadEvent = new Event('beforeunload', { cancelable: true });
        window.dispatchEvent(unloadEvent);
      });

      test('THEN the unload is blocked', () => {
        expect(unloadEvent.defaultPrevented).toBe(true);
      });
    });

    describe('WHEN the page unloads with a clean queue', () => {
      let unloadEvent: Event;

      beforeEach(() => {
        unloadEvent = new Event('beforeunload', { cancelable: true });
        window.dispatchEvent(unloadEvent);
      });

      test('THEN the unload proceeds', () => {
        expect(unloadEvent.defaultPrevented).toBe(false);
      });
    });
  });

  describe('GIVEN the workspace owner who renamed a node someone else created', () => {
    beforeEach(async () => {
      usePermissionsStore.getState().setAccess('ws-1', 'user-1', FULL_ACCESS);
      vi.mocked(getCanvasContent).mockResolvedValue(canvasContent());
      renderHook(() => useCanvasSync(WORKSPACE_ID, THREAD_ID));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
      act(() => useCanvasStore.getState().updateNodeLabel('foreign', 'Renamed'));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(FLUSH_DEBOUNCE_MS);
      });
    });

    describe('WHEN they undo the rename after handing the ownership over', () => {
      beforeEach(async () => {
        act(() => usePermissionsStore.getState().setAccess('ws-1', 'user-1', EDIT_ACCESS));
        act(() => useCanvasStore.getState().undo());
        await act(async () => {
          await vi.advanceTimersByTimeAsync(FLUSH_DEBOUNCE_MS);
        });
      });

      test('THEN the rename stays and only the rename itself reaches the api', () => {
        expect(useCanvasStore.getState().nodes.find((node) => node.id === 'foreign')?.data.label).toBe('Renamed');
        expect(updateCanvasNodeLabel).toHaveBeenCalledExactlyOnceWith('foreign', 'Renamed');
      });
    });
  });

  describe('GIVEN a viewer on the same thread', () => {
    beforeEach(async () => {
      usePermissionsStore.getState().setAccess('ws-1', 'user-1', READONLY_ACCESS);
      vi.mocked(getCanvasContent).mockResolvedValue(canvasContent());

      const view = renderHook(() => useCanvasSync(WORKSPACE_ID, THREAD_ID));

      sync = view.result;
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
    });

    describe('WHEN they try to edit the canvas', () => {
      beforeEach(async () => {
        act(() => useCanvasStore.getState().addNode({ x: 0, y: 0 }, 'Sneaky'));
        act(() => useCanvasStore.getState().deleteNode('own'));
        act(() => useCanvasStore.getState().updateNodeLabel('own', 'Hijacked'));
        await act(async () => {
          await vi.advanceTimersByTimeAsync(FLUSH_DEBOUNCE_MS);
        });
      });

      test('THEN the store ignores the changes', () => {
        expect(useCanvasStore.getState().nodes).toHaveLength(2);
        expect(useCanvasStore.getState().nodes.find((node) => node.id === 'own')).toMatchObject({
          data: { label: 'Node own' },
        });
      });

      test('THEN nothing reaches the api and the queue stays idle', () => {
        expect(createCanvasNode).not.toHaveBeenCalled();
        expect(deleteCanvasNode).not.toHaveBeenCalled();
        expect(updateCanvasNodeLabel).not.toHaveBeenCalled();
        expect(sync.current.saveState).toMatchObject({ status: 'idle', pendingCount: 0 });
      });
    });
  });

  describe('GIVEN a backend that never responds', () => {
    beforeEach(async () => {
      usePermissionsStore.getState().setAccess('ws-1', 'user-1', EDIT_ACCESS);
      vi.mocked(getCanvasContent).mockReturnValue(new Promise(() => {}));

      sync = renderHook(() => useCanvasSync(WORKSPACE_ID, THREAD_ID)).result;
    });

    describe('WHEN the load timeout elapses', () => {
      beforeEach(async () => {
        await act(async () => {
          await vi.advanceTimersByTimeAsync(LOAD_TIMEOUT_MS);
        });
      });

      test('THEN the load times out without hydrating the store', () => {
        expect(sync.current.loadFailed).toBe(true);
        expect(event.error).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ message: 'Request timed out' }), {
          toast: false,
          context: 'canvas.load',
        });
        expect(useCanvasStore.getState()).toMatchObject({ threadId: null, hydrated: false });
      });
    });
  });

  describe('GIVEN a thread switch while the old thread still has an unflushed operation', () => {
    let view: RenderHookResult<ReturnType<typeof useCanvasSync>, { threadId: string }>;
    let settleStaleCreate: () => void;

    beforeEach(async () => {
      usePermissionsStore.getState().setAccess('ws-1', 'user-1', EDIT_ACCESS);
      vi.mocked(getCanvasContent).mockResolvedValueOnce(canvasContent());

      view = renderHook(({ threadId }: { threadId: string }) => useCanvasSync(WORKSPACE_ID, threadId), {
        initialProps: { threadId: THREAD_ID },
      });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      act(() => useCanvasStore.getState().addNode({ x: 0, y: 0 }, 'Stale'));

      const staleCreate = Promise.withResolvers<void>();
      settleStaleCreate = staleCreate.resolve;
      vi.mocked(createCanvasNode).mockReturnValueOnce(staleCreate.promise);
      vi.mocked(getCanvasContent).mockResolvedValueOnce({ nodes: [canvasNode('b1')], edges: [] });

      view.rerender({ threadId: 'thread-2' });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
    });

    describe('WHEN the new thread finishes loading before the stale flush settles', () => {
      test('THEN the new thread hydrates while the old operation is still in flight', () => {
        expect(useCanvasStore.getState()).toMatchObject({ threadId: 'thread-2', hydrated: true });
        expect(useCanvasStore.getState().nodes.map((node) => node.id)).toEqual(['b1']);
        expect(createCanvasNode).toHaveBeenCalledExactlyOnceWith(
          expect.objectContaining({ threadId: THREAD_ID, label: 'Stale' }),
        );
      });
    });

    describe('WHEN the stale flush finally settles', () => {
      beforeEach(async () => {
        settleStaleCreate();
        await act(async () => {
          await vi.advanceTimersByTimeAsync(0);
        });
      });

      test('THEN the stale cleanup does not clear the new thread', () => {
        expect(useCanvasStore.getState()).toMatchObject({ threadId: 'thread-2', hydrated: true });
        expect(useCanvasStore.getState().nodes.map((node) => node.id)).toEqual(['b1']);
      });
    });
  });

  describe('GIVEN an editor with an unflushed operation on the old thread and a new thread still loading', () => {
    let view: RenderHookResult<ReturnType<typeof useCanvasSync>, { threadId: string }>;

    beforeEach(async () => {
      usePermissionsStore.getState().setAccess('ws-1', 'user-1', EDIT_ACCESS);
      vi.mocked(getCanvasContent).mockResolvedValueOnce(canvasContent());

      view = renderHook(({ threadId }: { threadId: string }) => useCanvasSync(WORKSPACE_ID, threadId), {
        initialProps: { threadId: THREAD_ID },
      });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      act(() => useCanvasStore.getState().addNode({ x: 0, y: 0 }, 'Stale'));
      vi.mocked(getCanvasContent).mockReturnValueOnce(new Promise(() => {}));
    });

    describe('WHEN the route switches to the new thread while the old save is in flight', () => {
      beforeEach(() => {
        vi.mocked(createCanvasNode).mockReturnValueOnce(new Promise(() => {}));
        view.rerender({ threadId: 'thread-2' });
      });

      test('THEN the old graph leaves the store at once', () => {
        expect(useCanvasStore.getState()).toMatchObject({ threadId: null, hydrated: false });
        expect(useCanvasStore.getState().nodes).toHaveLength(0);
      });
    });

    describe('WHEN the route switches and a node is added before the new thread loads', () => {
      beforeEach(async () => {
        view.rerender({ threadId: 'thread-2' });
        act(() => useCanvasStore.getState().addNode({ x: 0, y: 0 }, 'Lost'));
        await act(async () => {
          await vi.advanceTimersByTimeAsync(FLUSH_DEBOUNCE_MS);
        });
      });

      test('THEN only the old operation reaches the api, under the old thread', () => {
        expect(createCanvasNode).toHaveBeenCalledExactlyOnceWith(
          expect.objectContaining({ threadId: THREAD_ID, label: 'Stale' }),
        );
      });
    });
  });

  describe('GIVEN an editor who deleted a parked node while another save is in flight', () => {
    let settleInflight: () => void;

    beforeEach(async () => {
      usePermissionsStore.getState().setAccess('ws-1', 'user-1', EDIT_ACCESS);
      vi.mocked(getCanvasContent).mockResolvedValue(canvasContent());

      unmountSync = renderHook(() => useCanvasSync(WORKSPACE_ID, THREAD_ID)).unmount;
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      vi.mocked(createCanvasNode).mockRejectedValue(new Error('down'));
      act(() => useCanvasStore.getState().addNode({ x: 0, y: 0 }, 'Parked', 'parked'));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(FLUSH_DEBOUNCE_MS + RETRY_BASE_MS * (2 ** MAX_RETRIES - 1));
      });

      const inflightCreate = Promise.withResolvers<void>();
      settleInflight = inflightCreate.resolve;
      vi.mocked(createCanvasNode).mockReset();
      vi.mocked(createCanvasNode).mockReturnValueOnce(inflightCreate.promise);
      act(() => useCanvasStore.getState().addNode({ x: 40, y: 40 }, 'In flight'));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(FLUSH_DEBOUNCE_MS);
      });
      act(() => useCanvasStore.getState().deleteNode('parked'));
    });

    afterEach(() => {
      settleInflight();
    });

    describe('WHEN the hook unmounts before the in-flight save settles', () => {
      beforeEach(async () => {
        unmountSync();
        await act(async () => {
          await vi.advanceTimersByTimeAsync(0);
        });
      });

      test('THEN the queue is not reset under the in-flight save', () => {
        expect(useCanvasStore.getState()).toMatchObject({ threadId: null, hydrated: false });
        expect(getSaveState().status).toBe('saving');
      });
    });
  });

  describe('GIVEN an editor who changed the canvas after the connection dropped', () => {
    beforeEach(async () => {
      usePermissionsStore.getState().setAccess('ws-1', 'user-1', EDIT_ACCESS);
      vi.mocked(getCanvasContent).mockResolvedValue(canvasContent());

      unmountSync = renderHook(() => useCanvasSync(WORKSPACE_ID, THREAD_ID)).unmount;
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      act(() => useCanvasStore.getState().addNode({ x: 0, y: 0 }, 'Offline draft'));
      Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: false });
      window.dispatchEvent(new Event('offline'));
    });

    describe('WHEN the hook unmounts while still offline', () => {
      beforeEach(async () => {
        unmountSync();
        await act(async () => {
          await vi.advanceTimersByTimeAsync(0);
        });
      });

      test('THEN the store clears but the change stays queued', () => {
        expect(useCanvasStore.getState()).toMatchObject({ threadId: null, hydrated: false });
        expect(getSaveState()).toMatchObject({ status: 'offline', pendingCount: 1 });
        expect(createCanvasNode).not.toHaveBeenCalled();
      });
    });

    describe('WHEN the connection returns after the hook unmounted', () => {
      beforeEach(async () => {
        unmountSync();
        await act(async () => {
          await vi.advanceTimersByTimeAsync(0);
        });
        Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: true });
        window.dispatchEvent(new Event('online'));
        await act(async () => {
          await vi.advanceTimersByTimeAsync(FLUSH_DEBOUNCE_MS);
        });
      });

      test('THEN the queued change still reaches the api', () => {
        expect(createCanvasNode).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ label: 'Offline draft' }));
      });
    });
  });

  describe('GIVEN a backend that fails to load the thread', () => {
    beforeEach(async () => {
      usePermissionsStore.getState().setAccess('ws-1', 'user-1', EDIT_ACCESS);
      vi.mocked(getCanvasContent).mockRejectedValue(new Error('load failed'));

      sync = renderHook(() => useCanvasSync(WORKSPACE_ID, THREAD_ID)).result;
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
    });

    describe('WHEN the load settles', () => {
      test('THEN the load error surfaces without hydrating the store', () => {
        expect(sync.current.loadFailed).toBe(true);
        expect(useCanvasStore.getState()).toMatchObject({ threadId: null, hydrated: false });
      });

      test('THEN the failure is reported without a toast', () => {
        expect(event.error).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ message: 'load failed' }), {
          toast: false,
          context: 'canvas.load',
        });
      });
    });

    describe('WHEN the user retries and the backend has recovered', () => {
      beforeEach(async () => {
        vi.mocked(getCanvasContent).mockResolvedValue(canvasContent());
        act(() => sync.current.retryLoad());
        await act(async () => {
          await vi.advanceTimersByTimeAsync(0);
        });
      });

      test('THEN the load runs again and the store hydrates', () => {
        expect(getCanvasContent).toHaveBeenCalledTimes(2);
        expect(useCanvasStore.getState()).toMatchObject({ threadId: THREAD_ID, hydrated: true });
      });

      test('THEN the load error clears', () => {
        expect(sync.current.loadFailed).toBe(false);
      });
    });
  });
});
