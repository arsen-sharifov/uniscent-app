import { act, renderHook } from '@testing-library/react';
import { ReactFlowProvider, useStoreApi } from '@xyflow/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import type { TCanvasNode } from '@interfaces';

import { pointerEvent } from '@mocks/browser';
import { THREAD_ID, canvasEdge, canvasNode, questionNode, referenceNode } from '@mocks/canvas';
import { TRANSLATIONS } from '@mocks/i18n';
import { router } from '@mocks/navigation';
import { EDIT_ACCESS, READONLY_ACCESS } from '@mocks/roles';
import { ZOOM_DURATION_MS, ZOOM_MAX, ZOOM_MIN, ZOOM_STEP_FACTOR } from '@/components/Canvas/consts';
import { useCanvasTools } from '@/components/Canvas/hooks';
import { ECanvasTool } from '@/components/tools';
import { useCanvasStore, usePermissionsStore } from '@/lib/stores';

vi.mock('@/i18n', () => import('@mocks/i18n'));
vi.mock('next/navigation', () => import('@mocks/navigation'));

const onSetViewport = vi.fn();

const nodeAt = (id: string, x: number, y: number): TCanvasNode => ({ ...canvasNode(id), position: { x, y } });

let harness: {
  current: { tools: ReturnType<typeof useCanvasTools>; flow: ReturnType<typeof useStoreApi> };
};

afterEach(() => {
  useCanvasStore.getState().clearCanvas();
  usePermissionsStore.getState().clearAccess();
});

describe('useCanvasTools', () => {
  describe('GIVEN an editor with the select tool on a populated canvas', () => {
    beforeEach(() => {
      usePermissionsStore.getState().setAccess('ws-1', 'user-1', EDIT_ACCESS);
      useCanvasStore.getState().loadCanvas(THREAD_ID, {
        nodes: [canvasNode('idea', { createdBy: 'user-1' }), questionNode('q'), referenceNode('ref')],
        edges: [canvasEdge('e1', 'q', 'idea')],
      });

      harness = renderHook(() => ({ tools: useCanvasTools(), flow: useStoreApi() }), {
        wrapper: ReactFlowProvider,
      }).result;
    });

    describe('WHEN they click the pane', () => {
      beforeEach(() => {
        act(() => harness.current.tools.onPaneClick(pointerEvent(150, 90)));
      });

      test('THEN the canvas stays untouched', () => {
        expect(useCanvasStore.getState().nodes).toHaveLength(3);
        expect(useCanvasStore.getState().referenceSearchPosition).toBeNull();
      });
    });

    describe('WHEN they double-click the canvas node', () => {
      beforeEach(() => {
        act(() => harness.current.tools.onNodeDoubleClick(pointerEvent(), canvasNode('idea')));
      });

      test('THEN the node enters label editing', () => {
        expect(useCanvasStore.getState().editingNodeId).toBe('idea');
      });
    });

    describe('WHEN they double-click the question node', () => {
      beforeEach(() => {
        act(() => harness.current.tools.onNodeDoubleClick(pointerEvent(), questionNode('q')));
      });

      test('THEN the question enters label editing', () => {
        expect(useCanvasStore.getState().editingNodeId).toBe('q');
      });
    });

    describe('WHEN they double-click the reference node', () => {
      beforeEach(() => {
        act(() => harness.current.tools.onNodeDoubleClick(pointerEvent(), referenceNode('ref')));
      });

      test('THEN the referenced node opens in its thread and nothing enters label editing', () => {
        expect(router.push).toHaveBeenCalledExactlyOnceWith('/platform/ws-2/th-2?focus=ref&node=origin');
        expect(useCanvasStore.getState().editingNodeId).toBeNull();
      });
    });

    describe('WHEN they click an edge', () => {
      beforeEach(() => {
        act(() => harness.current.tools.onEdgeClick(pointerEvent(), canvasEdge('e1', 'q', 'idea')));
      });

      test('THEN the edge survives', () => {
        expect(useCanvasStore.getState().edges).toHaveLength(1);
      });
    });

    describe('WHEN they complete a drag connection between the nodes', () => {
      beforeEach(() => {
        act(() =>
          harness.current.tools.onConnect({ source: 'idea', target: 'q', sourceHandle: 'top', targetHandle: 'bottom' }),
        );
      });

      test('THEN the edge appears with the dragged handles', () => {
        expect(useCanvasStore.getState().edges).toHaveLength(2);
        expect(useCanvasStore.getState().edges[1]).toMatchObject({
          source: 'idea',
          target: 'q',
          sourceHandle: 'top',
          targetHandle: 'bottom',
        });
      });
    });

    describe('WHEN a connection candidate loops back to its source', () => {
      test('THEN the candidate is rejected', () => {
        expect(
          harness.current.tools.isValidConnection({
            source: 'idea',
            target: 'idea',
            sourceHandle: null,
            targetHandle: null,
          }),
        ).toBe(false);
      });
    });

    describe('WHEN a connection candidate links two distinct nodes', () => {
      test('THEN the candidate is accepted', () => {
        expect(
          harness.current.tools.isValidConnection({
            source: 'idea',
            target: 'q',
            sourceHandle: null,
            targetHandle: null,
          }),
        ).toBe(true);
      });
    });
  });

  describe('GIVEN a viewer without edit access using the select tool', () => {
    beforeEach(() => {
      usePermissionsStore.getState().setAccess('ws-1', 'user-1', READONLY_ACCESS);
      useCanvasStore.getState().loadCanvas(THREAD_ID, { nodes: [canvasNode('idea')], edges: [] });

      harness = renderHook(() => ({ tools: useCanvasTools(), flow: useStoreApi() }), {
        wrapper: ReactFlowProvider,
      }).result;
    });

    describe('WHEN they double-click the canvas node', () => {
      beforeEach(() => {
        act(() => harness.current.tools.onNodeDoubleClick(pointerEvent(), canvasNode('idea')));
      });

      test('THEN label editing stays off', () => {
        expect(useCanvasStore.getState().editingNodeId).toBeNull();
      });
    });

    describe('WHEN they double-click a reference node', () => {
      beforeEach(() => {
        act(() => harness.current.tools.onNodeDoubleClick(pointerEvent(), referenceNode('ref')));
      });

      test('THEN the referenced node still opens in its thread', () => {
        expect(router.push).toHaveBeenCalledExactlyOnceWith('/platform/ws-2/th-2?focus=ref&node=origin');
      });
    });

    describe('WHEN they double-click a reference node without a source node id', () => {
      beforeEach(() => {
        const reference = referenceNode('ref');

        act(() =>
          harness.current.tools.onNodeDoubleClick(pointerEvent(), {
            ...reference,
            data: { ...reference.data, sourceNodeId: '' },
          }),
        );
      });

      test('THEN nothing navigates', () => {
        expect(router.push).not.toHaveBeenCalled();
      });
    });
  });

  describe('GIVEN an editor with the add-node tool', () => {
    beforeEach(() => {
      usePermissionsStore.getState().setAccess('ws-1', 'user-1', EDIT_ACCESS);
      useCanvasStore.getState().loadCanvas(THREAD_ID, { nodes: [], edges: [] });
      useCanvasStore.getState().setActiveTool(ECanvasTool.AddNode);

      harness = renderHook(() => ({ tools: useCanvasTools(), flow: useStoreApi() }), {
        wrapper: ReactFlowProvider,
      }).result;
    });

    describe('WHEN they click the pane at the cursor', () => {
      beforeEach(() => {
        act(() => harness.current.tools.onPaneClick(pointerEvent(120, 80)));
      });

      test('THEN a node appears at the flow position with the default label', () => {
        expect(useCanvasStore.getState().nodes).toHaveLength(1);
        expect(useCanvasStore.getState().nodes[0]).toMatchObject({
          position: { x: 120, y: 80 },
          data: { label: TRANSLATIONS.platform.canvas.node.defaultLabel, createdBy: 'user-1', isNew: true },
        });
      });
    });
  });

  describe('GIVEN an editor with the cross-reference tool', () => {
    beforeEach(() => {
      usePermissionsStore.getState().setAccess('ws-1', 'user-1', EDIT_ACCESS);
      useCanvasStore.getState().loadCanvas(THREAD_ID, { nodes: [canvasNode('idea')], edges: [] });
      useCanvasStore.getState().setActiveTool(ECanvasTool.CrossReference);

      harness = renderHook(() => ({ tools: useCanvasTools(), flow: useStoreApi() }), {
        wrapper: ReactFlowProvider,
      }).result;
    });

    describe('WHEN they click the pane at the cursor', () => {
      beforeEach(() => {
        act(() => harness.current.tools.onPaneClick(pointerEvent(33, 44)));
      });

      test('THEN the reference search opens at the flow position', () => {
        expect(useCanvasStore.getState().referenceSearchPosition).toEqual({ x: 33, y: 44 });
        expect(useCanvasStore.getState().nodes).toHaveLength(1);
      });
    });
  });

  describe('GIVEN an editor with the delete tool over their own connected nodes', () => {
    beforeEach(() => {
      usePermissionsStore.getState().setAccess('ws-1', 'user-1', EDIT_ACCESS);
      useCanvasStore.getState().loadCanvas(THREAD_ID, {
        nodes: [canvasNode('a', { createdBy: 'user-1' }), canvasNode('b', { createdBy: 'user-1' })],
        edges: [canvasEdge('e1', 'a', 'b')],
      });
      useCanvasStore.getState().setActiveTool(ECanvasTool.Delete);

      harness = renderHook(() => ({ tools: useCanvasTools(), flow: useStoreApi() }), {
        wrapper: ReactFlowProvider,
      }).result;
    });

    describe('WHEN they click their own node', () => {
      beforeEach(() => {
        act(() => harness.current.tools.onNodeClick(pointerEvent(), canvasNode('a')));
      });

      test('THEN the node leaves together with its edge', () => {
        expect(useCanvasStore.getState().nodes.map((node) => node.id)).toEqual(['b']);
        expect(useCanvasStore.getState().edges).toHaveLength(0);
      });
    });

    describe('WHEN they click the edge', () => {
      beforeEach(() => {
        act(() => harness.current.tools.onEdgeClick(pointerEvent(), canvasEdge('e1', 'a', 'b')));
      });

      test('THEN only the edge leaves', () => {
        expect(useCanvasStore.getState().edges).toHaveLength(0);
        expect(useCanvasStore.getState().nodes).toHaveLength(2);
      });
    });
  });

  describe('GIVEN an editor with the valid-path tool under a question parent', () => {
    beforeEach(() => {
      usePermissionsStore.getState().setAccess('ws-1', 'user-1', EDIT_ACCESS);
      useCanvasStore.getState().loadCanvas(THREAD_ID, {
        nodes: [questionNode('q'), canvasNode('idea')],
        edges: [canvasEdge('e1', 'q', 'idea')],
      });
      useCanvasStore.getState().setActiveTool(ECanvasTool.ValidPath);

      harness = renderHook(() => ({ tools: useCanvasTools(), flow: useStoreApi() }), {
        wrapper: ReactFlowProvider,
      }).result;
    });

    describe('WHEN they click the child node', () => {
      beforeEach(() => {
        act(() => harness.current.tools.onNodeClick(pointerEvent(), canvasNode('idea')));
      });

      test('THEN the node is marked valid', () => {
        expect(useCanvasStore.getState().nodes.find((node) => node.id === 'idea')?.data.status).toBe('valid');
      });
    });
  });

  describe('GIVEN an editor with the invalid-path tool over clean nodes', () => {
    beforeEach(() => {
      usePermissionsStore.getState().setAccess('ws-1', 'user-1', EDIT_ACCESS);
      useCanvasStore.getState().loadCanvas(THREAD_ID, {
        nodes: [canvasNode('a'), canvasNode('b')],
        edges: [],
      });
      useCanvasStore.getState().setActiveTool(ECanvasTool.InvalidPath);

      harness = renderHook(() => ({ tools: useCanvasTools(), flow: useStoreApi() }), {
        wrapper: ReactFlowProvider,
      }).result;
    });

    describe('WHEN they click one node', () => {
      beforeEach(() => {
        act(() => harness.current.tools.onNodeClick(pointerEvent(), canvasNode('a')));
      });

      test('THEN only that node turns invalid', () => {
        expect(useCanvasStore.getState().nodes.find((node) => node.id === 'a')?.data.status).toBe('invalid');
        expect(useCanvasStore.getState().nodes.find((node) => node.id === 'b')?.data.status).toBeNull();
      });
    });
  });

  describe('GIVEN an editor with the answer tool on a validated branch', () => {
    beforeEach(() => {
      usePermissionsStore.getState().setAccess('ws-1', 'user-1', EDIT_ACCESS);
      useCanvasStore.getState().loadCanvas(THREAD_ID, {
        nodes: [questionNode('q'), canvasNode('idea'), referenceNode('ref')],
        edges: [canvasEdge('e1', 'q', 'idea')],
      });
      useCanvasStore.getState().setActiveTool(ECanvasTool.Answer);

      harness = renderHook(() => ({ tools: useCanvasTools(), flow: useStoreApi() }), {
        wrapper: ReactFlowProvider,
      }).result;
    });

    describe('WHEN they click the canvas node', () => {
      beforeEach(() => {
        act(() => harness.current.tools.onNodeClick(pointerEvent(), canvasNode('idea')));
      });

      test('THEN the node becomes the answer', () => {
        expect(useCanvasStore.getState().nodes.find((node) => node.id === 'idea')?.data.isAnswer).toBe(true);
      });
    });

    describe('WHEN they click the reference node', () => {
      beforeEach(() => {
        act(() => harness.current.tools.onNodeClick(pointerEvent(), referenceNode('ref')));
      });

      test('THEN no answer appears', () => {
        expect(useCanvasStore.getState().nodes.some((node) => node.data.isAnswer === true)).toBe(false);
      });
    });
  });

  describe('GIVEN an editor with the connect tool over two distant nodes', () => {
    beforeEach(() => {
      usePermissionsStore.getState().setAccess('ws-1', 'user-1', EDIT_ACCESS);
      useCanvasStore.getState().loadCanvas(THREAD_ID, {
        nodes: [nodeAt('a', 0, 0), nodeAt('b', 0, 300), referenceNode('ref')],
        edges: [],
      });
      useCanvasStore.getState().setActiveTool(ECanvasTool.Connect);

      harness = renderHook(() => ({ tools: useCanvasTools(), flow: useStoreApi() }), {
        wrapper: ReactFlowProvider,
      }).result;
    });

    describe('WHEN they click the first node', () => {
      beforeEach(() => {
        act(() => harness.current.tools.onNodeClick(pointerEvent(), nodeAt('a', 0, 0)));
      });

      test('THEN the node becomes the pending source', () => {
        expect(useCanvasStore.getState().pendingConnection).toBe('a');
        expect(useCanvasStore.getState().edges).toHaveLength(0);
      });
    });

    describe('WHEN they click the first and then the second node', () => {
      beforeEach(() => {
        act(() => harness.current.tools.onNodeClick(pointerEvent(), nodeAt('a', 0, 0)));
        act(() => harness.current.tools.onNodeClick(pointerEvent(), nodeAt('b', 0, 300)));
      });

      test('THEN an edge appears on the nearest handle pair', () => {
        expect(useCanvasStore.getState().edges).toHaveLength(1);
        expect(useCanvasStore.getState().edges[0]).toMatchObject({
          source: 'a',
          target: 'b',
          sourceHandle: 'bottom',
          targetHandle: 'top',
        });
      });

      test('THEN the handshake resets', () => {
        expect(useCanvasStore.getState().pendingConnection).toBeNull();
      });
    });

    describe('WHEN they click the reference node', () => {
      beforeEach(() => {
        act(() => harness.current.tools.onNodeClick(pointerEvent(), referenceNode('ref')));
      });

      test('THEN the reference node becomes the pending source', () => {
        expect(useCanvasStore.getState().pendingConnection).toBe('ref');
      });
    });

    describe('WHEN they click the first node and then the reference node', () => {
      beforeEach(() => {
        act(() => harness.current.tools.onNodeClick(pointerEvent(), nodeAt('a', 0, 0)));
        act(() => harness.current.tools.onNodeClick(pointerEvent(), referenceNode('ref')));
      });

      test('THEN an edge into the reference node appears', () => {
        expect(useCanvasStore.getState().edges).toHaveLength(1);
        expect(useCanvasStore.getState().edges[0]).toMatchObject({ source: 'a', target: 'ref' });
      });
    });
  });

  describe('GIVEN an editor with the connect tool and a reference pending source', () => {
    beforeEach(() => {
      usePermissionsStore.getState().setAccess('ws-1', 'user-1', EDIT_ACCESS);
      useCanvasStore.getState().loadCanvas(THREAD_ID, {
        nodes: [canvasNode('idea'), referenceNode('ref')],
        edges: [],
      });
      useCanvasStore.getState().setActiveTool(ECanvasTool.Connect);
      useCanvasStore.getState().setPendingConnection('ref');

      harness = renderHook(() => ({ tools: useCanvasTools(), flow: useStoreApi() }), {
        wrapper: ReactFlowProvider,
      }).result;
    });

    describe('WHEN they click a canvas node', () => {
      beforeEach(() => {
        act(() => harness.current.tools.onNodeClick(pointerEvent(), canvasNode('idea')));
      });

      test('THEN an edge out of the reference node appears and the handshake resets', () => {
        expect(useCanvasStore.getState().edges).toHaveLength(1);
        expect(useCanvasStore.getState().edges[0]).toMatchObject({ source: 'ref', target: 'idea' });
        expect(useCanvasStore.getState().pendingConnection).toBeNull();
      });
    });
  });

  describe('GIVEN an editor with the connect tool and a vanished pending source', () => {
    beforeEach(() => {
      usePermissionsStore.getState().setAccess('ws-1', 'user-1', EDIT_ACCESS);
      useCanvasStore.getState().loadCanvas(THREAD_ID, { nodes: [canvasNode('idea')], edges: [] });
      useCanvasStore.getState().setActiveTool(ECanvasTool.Connect);
      useCanvasStore.getState().setPendingConnection('ghost');

      harness = renderHook(() => ({ tools: useCanvasTools(), flow: useStoreApi() }), {
        wrapper: ReactFlowProvider,
      }).result;
    });

    describe('WHEN they click a canvas node', () => {
      beforeEach(() => {
        act(() => harness.current.tools.onNodeClick(pointerEvent(), canvasNode('idea')));
      });

      test('THEN no edge is created', () => {
        expect(useCanvasStore.getState().edges).toHaveLength(0);
        expect(useCanvasStore.getState().pendingConnection).toBe('ghost');
      });
    });
  });

  describe('GIVEN an editor with the zoom-in tool over an offset viewport', () => {
    beforeEach(() => {
      usePermissionsStore.getState().setAccess('ws-1', 'user-1', EDIT_ACCESS);
      useCanvasStore.getState().loadCanvas(THREAD_ID, {
        nodes: [canvasNode('a'), canvasNode('b')],
        edges: [canvasEdge('e1', 'a', 'b')],
      });
      useCanvasStore.getState().setActiveTool(ECanvasTool.ZoomIn);

      harness = renderHook(() => ({ tools: useCanvasTools(), flow: useStoreApi() }), {
        wrapper: ReactFlowProvider,
      }).result;
      harness.current.flow.setState({ transform: [100, 40, 1], panZoom: { setViewport: onSetViewport } as never });
    });

    describe('WHEN they click the pane at the cursor', () => {
      beforeEach(() => {
        act(() => harness.current.tools.onPaneClick(pointerEvent(200, 120)));
      });

      test('THEN the viewport zooms in anchored to the cursor', () => {
        expect(onSetViewport).toHaveBeenCalledExactlyOnceWith(
          { x: 50, y: 10, zoom: ZOOM_STEP_FACTOR },
          { duration: ZOOM_DURATION_MS },
        );
      });
    });

    describe('WHEN they shift-click the pane at the viewport origin', () => {
      beforeEach(() => {
        act(() => harness.current.tools.onPaneClick(pointerEvent(0, 0, true)));
      });

      test('THEN the zoom inverts to zoom out', () => {
        expect(onSetViewport).toHaveBeenCalledExactlyOnceWith(
          { x: 100, y: 40, zoom: 1 / ZOOM_STEP_FACTOR },
          { duration: ZOOM_DURATION_MS },
        );
      });
    });

    describe('WHEN they click a node', () => {
      beforeEach(() => {
        act(() => harness.current.tools.onNodeClick(pointerEvent(200, 120), canvasNode('a')));
      });

      test('THEN the zoom fires instead of a node action', () => {
        expect(onSetViewport).toHaveBeenCalledExactlyOnceWith(
          { x: 50, y: 10, zoom: ZOOM_STEP_FACTOR },
          { duration: ZOOM_DURATION_MS },
        );
        expect(useCanvasStore.getState().nodes).toHaveLength(2);
      });
    });

    describe('WHEN they click an edge', () => {
      beforeEach(() => {
        act(() => harness.current.tools.onEdgeClick(pointerEvent(200, 120), canvasEdge('e1', 'a', 'b')));
      });

      test('THEN the zoom fires and the edge survives', () => {
        expect(onSetViewport).toHaveBeenCalledTimes(1);
        expect(useCanvasStore.getState().edges).toHaveLength(1);
      });
    });
  });

  describe('GIVEN an editor with the zoom-out tool over an offset viewport', () => {
    beforeEach(() => {
      usePermissionsStore.getState().setAccess('ws-1', 'user-1', EDIT_ACCESS);
      useCanvasStore.getState().loadCanvas(THREAD_ID, { nodes: [], edges: [] });
      useCanvasStore.getState().setActiveTool(ECanvasTool.ZoomOut);

      harness = renderHook(() => ({ tools: useCanvasTools(), flow: useStoreApi() }), {
        wrapper: ReactFlowProvider,
      }).result;
      harness.current.flow.setState({ transform: [100, 40, 1], panZoom: { setViewport: onSetViewport } as never });
    });

    describe('WHEN they click the pane at the viewport origin', () => {
      beforeEach(() => {
        act(() => harness.current.tools.onPaneClick(pointerEvent(0, 0)));
      });

      test('THEN the viewport zooms out in place', () => {
        expect(onSetViewport).toHaveBeenCalledExactlyOnceWith(
          { x: 100, y: 40, zoom: 1 / ZOOM_STEP_FACTOR },
          { duration: ZOOM_DURATION_MS },
        );
      });
    });
  });

  describe('GIVEN an editor with the zoom-in tool near the zoom ceiling', () => {
    beforeEach(() => {
      usePermissionsStore.getState().setAccess('ws-1', 'user-1', EDIT_ACCESS);
      useCanvasStore.getState().loadCanvas(THREAD_ID, { nodes: [], edges: [] });
      useCanvasStore.getState().setActiveTool(ECanvasTool.ZoomIn);

      harness = renderHook(() => ({ tools: useCanvasTools(), flow: useStoreApi() }), {
        wrapper: ReactFlowProvider,
      }).result;
      harness.current.flow.setState({ transform: [0, 0, 3.5], panZoom: { setViewport: onSetViewport } as never });
    });

    describe('WHEN they click the pane at the viewport origin', () => {
      beforeEach(() => {
        act(() => harness.current.tools.onPaneClick(pointerEvent(0, 0)));
      });

      test('THEN the zoom clamps to the ceiling', () => {
        expect(onSetViewport).toHaveBeenCalledExactlyOnceWith(
          { x: 0, y: 0, zoom: ZOOM_MAX },
          { duration: ZOOM_DURATION_MS },
        );
      });
    });
  });

  describe('GIVEN an editor with the zoom-in tool at the zoom ceiling', () => {
    beforeEach(() => {
      usePermissionsStore.getState().setAccess('ws-1', 'user-1', EDIT_ACCESS);
      useCanvasStore.getState().loadCanvas(THREAD_ID, { nodes: [], edges: [] });
      useCanvasStore.getState().setActiveTool(ECanvasTool.ZoomIn);

      harness = renderHook(() => ({ tools: useCanvasTools(), flow: useStoreApi() }), {
        wrapper: ReactFlowProvider,
      }).result;
      harness.current.flow.setState({ transform: [0, 0, ZOOM_MAX], panZoom: { setViewport: onSetViewport } as never });
    });

    describe('WHEN they click the pane', () => {
      beforeEach(() => {
        act(() => harness.current.tools.onPaneClick(pointerEvent(200, 120)));
      });

      test('THEN the viewport stays put', () => {
        expect(onSetViewport).not.toHaveBeenCalled();
      });
    });
  });

  describe('GIVEN an editor with the zoom-out tool at the zoom floor', () => {
    beforeEach(() => {
      usePermissionsStore.getState().setAccess('ws-1', 'user-1', EDIT_ACCESS);
      useCanvasStore.getState().loadCanvas(THREAD_ID, { nodes: [], edges: [] });
      useCanvasStore.getState().setActiveTool(ECanvasTool.ZoomOut);

      harness = renderHook(() => ({ tools: useCanvasTools(), flow: useStoreApi() }), {
        wrapper: ReactFlowProvider,
      }).result;
      harness.current.flow.setState({ transform: [0, 0, ZOOM_MIN], panZoom: { setViewport: onSetViewport } as never });
    });

    describe('WHEN they click the pane', () => {
      beforeEach(() => {
        act(() => harness.current.tools.onPaneClick(pointerEvent(200, 120)));
      });

      test('THEN the viewport stays put', () => {
        expect(onSetViewport).not.toHaveBeenCalled();
      });
    });
  });
});
