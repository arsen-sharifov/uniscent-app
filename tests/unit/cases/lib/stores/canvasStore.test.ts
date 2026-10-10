import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { THREAD_ID, canvasEdge, canvasNode, comment, questionNode, referenceNode } from '@mocks/canvas';
import { COMMENT_ACCESS, EDIT_ACCESS, FULL_ACCESS, READONLY_ACCESS } from '@mocks/roles';
import { ECanvasTool } from '@/components/tools';
import { subscribeCanvasOperations } from '@/lib/canvas';
import { useCanvasStore, usePermissionsStore } from '@/lib/stores';

const onOperation = vi.fn();

const unsubscribers: Array<() => void> = [];

afterEach(() => {
  unsubscribers.splice(0).forEach((unsubscribe) => unsubscribe());
  useCanvasStore.getState().clearCanvas();
  usePermissionsStore.getState().clearAccess();
  vi.restoreAllMocks();
});

describe('canvasStore', () => {
  describe('GIVEN an editor in a canvas with their own and a foreign node', () => {
    beforeEach(() => {
      usePermissionsStore.getState().setAccess('ws-1', 'user-1', EDIT_ACCESS);
      useCanvasStore.getState().loadCanvas(THREAD_ID, {
        nodes: [canvasNode('own', { createdBy: 'user-1' }), canvasNode('foreign', { createdBy: 'user-2' })],
        edges: [canvasEdge('e1', 'own', 'foreign')],
      });
      unsubscribers.push(subscribeCanvasOperations(onOperation));
    });

    describe('WHEN they add a node', () => {
      beforeEach(() => {
        useCanvasStore.getState().addNode({ x: 10, y: 20 }, 'Idea');
      });

      test('THEN the node appears with the author and isNew flag', () => {
        const added = useCanvasStore.getState().nodes.find((node) => node.data.label === 'Idea');

        expect(added).toMatchObject({
          data: { label: 'Idea', status: null, isAnswer: false, comments: [], createdBy: 'user-1', isNew: true },
        });
      });

      test('THEN a create operation is emitted', () => {
        expect(onOperation).toHaveBeenCalledExactlyOnceWith(
          expect.objectContaining({ type: 'createCanvasNode', threadId: THREAD_ID, x: 10, y: 20, label: 'Idea' }),
        );
      });
    });

    describe('WHEN they add a node under an id chosen up front', () => {
      beforeEach(() => {
        useCanvasStore.getState().addNode({ x: 0, y: 0 }, 'Scripted', 'preset-id');
      });

      test('THEN the node keeps that id', () => {
        expect(useCanvasStore.getState().nodes.find((node) => node.id === 'preset-id')?.data.label).toBe('Scripted');
      });
    });

    describe('WHEN a fit is asked for with room kept free and then without', () => {
      let requestsBefore: number;
      let padded: unknown;

      beforeEach(() => {
        requestsBefore = useCanvasStore.getState().fitRequest;
        useCanvasStore.getState().requestFit({ bottom: '300px' });
        padded = useCanvasStore.getState().fitPadding;
        useCanvasStore.getState().requestFit();
      });

      test('THEN each request carries its own padding', () => {
        expect(padded).toEqual({ bottom: '300px' });
        expect(useCanvasStore.getState()).toMatchObject({ fitRequest: requestsBefore + 2, fitPadding: null });
      });
    });

    describe('WHEN a fit was asked for and then another canvas is loaded', () => {
      let requested: number;

      beforeEach(() => {
        useCanvasStore.getState().requestFit();
        requested = useCanvasStore.getState().fitRequest;
        useCanvasStore.getState().loadCanvas('another-thread', { nodes: [], edges: [] });
      });

      test('THEN the request counter is not rewound, so the switch does not fire a fit of its own', () => {
        expect(useCanvasStore.getState().fitRequest).toBe(requested);
      });
    });

    describe('WHEN they connect the two nodes in the reverse direction', () => {
      beforeEach(() => {
        useCanvasStore.getState().setPendingConnection('foreign');
        useCanvasStore
          .getState()
          .connectNodes({ source: 'foreign', target: 'own', sourceHandle: 'right', targetHandle: 'left' });
      });

      test('THEN the edge appears in state and the pending connection resets', () => {
        expect(useCanvasStore.getState().edges).toHaveLength(2);
        expect(useCanvasStore.getState().pendingConnection).toBeNull();
      });

      test('THEN a create edge operation is emitted', () => {
        expect(onOperation).toHaveBeenCalledExactlyOnceWith(
          expect.objectContaining({ type: 'createEdge', source: 'foreign', target: 'own' }),
        );
      });
    });

    describe('WHEN they connect the same nodes twice', () => {
      beforeEach(() => {
        useCanvasStore
          .getState()
          .connectNodes({ source: 'foreign', target: 'own', sourceHandle: 'right', targetHandle: 'left' });
        useCanvasStore
          .getState()
          .connectNodes({ source: 'foreign', target: 'own', sourceHandle: 'right', targetHandle: 'left' });
      });

      test('THEN only one extra edge exists', () => {
        expect(useCanvasStore.getState().edges).toHaveLength(2);
      });

      test('THEN the create edge operation is emitted once', () => {
        expect(onOperation).toHaveBeenCalledTimes(1);
      });
    });

    describe('WHEN they delete their own node', () => {
      beforeEach(() => {
        useCanvasStore.getState().deleteNode('own');
      });

      test('THEN the node and its edges are removed from state', () => {
        expect(useCanvasStore.getState().nodes.map((node) => node.id)).toEqual(['foreign']);
        expect(useCanvasStore.getState().edges).toHaveLength(0);
      });

      test('THEN a delete operation is emitted', () => {
        expect(onOperation).toHaveBeenCalledExactlyOnceWith({ type: 'deleteNode', id: 'own' });
      });
    });

    describe('WHEN they delete the foreign node', () => {
      beforeEach(() => {
        useCanvasStore.getState().deleteNode('foreign');
      });

      test('THEN the node stays in state', () => {
        expect(useCanvasStore.getState().nodes).toHaveLength(2);
      });

      test('THEN nothing is emitted', () => {
        expect(onOperation).not.toHaveBeenCalled();
      });
    });

    describe('WHEN they delete the foreign node with the delete key', () => {
      beforeEach(() => {
        useCanvasStore.getState().deleteElements(['foreign'], []);
      });

      test('THEN the node and its edge stay and nothing is emitted', () => {
        expect(useCanvasStore.getState().nodes).toHaveLength(2);
        expect(useCanvasStore.getState().edges).toHaveLength(1);
        expect(onOperation).not.toHaveBeenCalled();
      });
    });

    describe('WHEN React Flow reports node and edge removals as changes', () => {
      beforeEach(() => {
        useCanvasStore.getState().onEdgesChange([{ type: 'remove', id: 'e1' }]);
        useCanvasStore.getState().onNodesChange([{ type: 'remove', id: 'own' }]);
      });

      test('THEN the changes are ignored because deletions go through deleteElements', () => {
        expect(useCanvasStore.getState().nodes).toHaveLength(2);
        expect(useCanvasStore.getState().edges).toHaveLength(1);
        expect(onOperation).not.toHaveBeenCalled();
      });
    });

    describe('WHEN they rename their own node', () => {
      beforeEach(() => {
        useCanvasStore.getState().updateNodeLabel('own', 'Renamed');
      });

      test('THEN the label updates', () => {
        expect(useCanvasStore.getState().nodes.find((node) => node.id === 'own')).toMatchObject({
          data: { label: 'Renamed' },
        });
      });

      test('THEN a label operation is emitted', () => {
        expect(onOperation).toHaveBeenCalledExactlyOnceWith({ type: 'updateNodeLabel', id: 'own', label: 'Renamed' });
      });
    });

    describe('WHEN they rename the foreign node', () => {
      beforeEach(() => {
        useCanvasStore.getState().updateNodeLabel('foreign', 'Hijacked');
      });

      test('THEN the label stays', () => {
        expect(useCanvasStore.getState().nodes.find((node) => node.id === 'foreign')).toMatchObject({
          data: { label: 'Node foreign' },
        });
      });

      test('THEN nothing is emitted', () => {
        expect(onOperation).not.toHaveBeenCalled();
      });
    });

    describe('WHEN they delete the existing edge', () => {
      beforeEach(() => {
        useCanvasStore.getState().deleteEdge('e1');
      });

      test('THEN the edge is removed from state', () => {
        expect(useCanvasStore.getState().edges).toHaveLength(0);
      });

      test('THEN a delete edge operation is emitted', () => {
        expect(onOperation).toHaveBeenCalledExactlyOnceWith({ type: 'deleteEdge', id: 'e1' });
      });
    });

    describe('WHEN they delete the selected edge with the delete key', () => {
      beforeEach(() => {
        useCanvasStore.getState().deleteElements([], ['e1']);
      });

      test('THEN the edge is removed and a delete operation is emitted', () => {
        expect(useCanvasStore.getState().edges).toHaveLength(0);
        expect(onOperation).toHaveBeenCalledExactlyOnceWith({ type: 'deleteEdge', id: 'e1' });
      });
    });

    describe('WHEN they delete their own node with the delete key', () => {
      beforeEach(() => {
        useCanvasStore.getState().deleteElements(['own'], []);
      });

      test('THEN the node and its edge are removed', () => {
        expect(useCanvasStore.getState().nodes.map((node) => node.id)).toEqual(['foreign']);
        expect(useCanvasStore.getState().edges).toHaveLength(0);
      });

      test('THEN only the node delete is emitted because the database removes its edges', () => {
        expect(onOperation).toHaveBeenCalledExactlyOnceWith({ type: 'deleteNode', id: 'own' });
      });
    });

    describe('WHEN a delete key deletion of their own node is undone once', () => {
      beforeEach(() => {
        useCanvasStore.getState().deleteElements(['own'], []);
        onOperation.mockClear();
        useCanvasStore.getState().undo();
      });

      test('THEN the node and its edge come back in one step', () => {
        expect(useCanvasStore.getState().nodes.map((node) => node.id)).toEqual(['own', 'foreign']);
        expect(useCanvasStore.getState().edges.map((edge) => edge.id)).toEqual(['e1']);
      });

      test('THEN the node and the edge are created again', () => {
        expect(onOperation.mock.calls.map(([operation]) => operation)).toEqual([
          expect.objectContaining({ type: 'createCanvasNode', id: 'own' }),
          expect.objectContaining({ type: 'createEdge', id: 'e1', source: 'own', target: 'foreign' }),
        ]);
      });
    });

    describe('WHEN they add a reference node from an open search', () => {
      beforeEach(() => {
        useCanvasStore.getState().setReferenceSearchPosition({ x: 5, y: 5 });
        useCanvasStore.getState().addReferenceNode({ x: 10, y: 20 }, referenceNode('ref').data);
      });

      test('THEN the node appears with the author and the search closes', () => {
        const added = useCanvasStore.getState().nodes.find((node) => node.data.label === 'Ref');

        expect(added).toMatchObject({ position: { x: 10, y: 20 }, data: { createdBy: 'user-1' } });
        expect(useCanvasStore.getState().referenceSearchPosition).toBeNull();
      });

      test('THEN a create reference operation with the raw data is emitted', () => {
        expect(onOperation).toHaveBeenCalledExactlyOnceWith(
          expect.objectContaining({
            type: 'createReferenceNode',
            threadId: THREAD_ID,
            x: 10,
            y: 20,
            data: referenceNode('ref').data,
          }),
        );
      });
    });

    describe('WHEN they connect a node to itself', () => {
      beforeEach(() => {
        useCanvasStore.getState().setPendingConnection('own');
        useCanvasStore
          .getState()
          .connectNodes({ source: 'own', target: 'own', sourceHandle: 'right', targetHandle: 'left' });
      });

      test('THEN nothing is emitted and the pending connection resets', () => {
        expect(useCanvasStore.getState().edges).toHaveLength(1);
        expect(useCanvasStore.getState().pendingConnection).toBeNull();
        expect(onOperation).not.toHaveBeenCalled();
      });
    });

    describe('WHEN they connect with an unknown handle id', () => {
      beforeEach(() => {
        useCanvasStore.getState().setPendingConnection('own');
        useCanvasStore
          .getState()
          .connectNodes({ source: 'own', target: 'foreign', sourceHandle: 'center', targetHandle: 'left' });
      });

      test('THEN nothing is emitted and the pending connection resets', () => {
        expect(useCanvasStore.getState().edges).toHaveLength(1);
        expect(useCanvasStore.getState().pendingConnection).toBeNull();
        expect(onOperation).not.toHaveBeenCalled();
      });
    });

    describe('WHEN they duplicate their own node', () => {
      beforeEach(() => {
        useCanvasStore.getState().duplicateNode('own');
      });

      test('THEN a shifted copy with reset comments and answer appears', () => {
        const copies = useCanvasStore.getState().nodes.filter((node) => node.data.label === 'Node own');
        const copy = copies.find((node) => node.id !== 'own');

        expect(copies).toHaveLength(2);
        expect(copy).toMatchObject({
          position: { x: 24, y: 24 },
          data: { isAnswer: false, comments: [], createdBy: 'user-1', isNew: true },
        });
      });

      test('THEN a single create operation is emitted', () => {
        expect(onOperation).toHaveBeenCalledExactlyOnceWith(
          expect.objectContaining({ type: 'createCanvasNode', label: 'Node own' }),
        );
      });
    });
  });

  describe('GIVEN the workspace owner in a canvas with a foreign node', () => {
    beforeEach(() => {
      usePermissionsStore.getState().setAccess('ws-1', 'user-1', FULL_ACCESS);
      useCanvasStore.getState().loadCanvas(THREAD_ID, {
        nodes: [canvasNode('foreign', { createdBy: 'user-2' })],
        edges: [],
      });
      unsubscribers.push(subscribeCanvasOperations(onOperation));
    });

    describe('WHEN they delete the foreign node', () => {
      beforeEach(() => {
        useCanvasStore.getState().deleteNode('foreign');
      });

      test('THEN the node is removed from state', () => {
        expect(useCanvasStore.getState().nodes).toHaveLength(0);
      });

      test('THEN a delete operation is emitted', () => {
        expect(onOperation).toHaveBeenCalledExactlyOnceWith({ type: 'deleteNode', id: 'foreign' });
      });
    });

    describe('WHEN they rename the foreign node', () => {
      beforeEach(() => {
        useCanvasStore.getState().updateNodeLabel('foreign', 'Curated');
      });

      test('THEN the label updates', () => {
        expect(useCanvasStore.getState().nodes.find((node) => node.id === 'foreign')).toMatchObject({
          data: { label: 'Curated' },
        });
      });

      test('THEN a label operation is emitted', () => {
        expect(onOperation).toHaveBeenCalledExactlyOnceWith({
          type: 'updateNodeLabel',
          id: 'foreign',
          label: 'Curated',
        });
      });
    });
  });

  describe('GIVEN an editor without a loaded thread', () => {
    beforeEach(() => {
      usePermissionsStore.getState().setAccess('ws-1', 'user-1', EDIT_ACCESS);
      unsubscribers.push(subscribeCanvasOperations(onOperation));
    });

    describe('WHEN they try to add or connect nodes', () => {
      beforeEach(() => {
        useCanvasStore.getState().addNode({ x: 0, y: 0 }, 'Orphan');
        useCanvasStore.getState().addReferenceNode({ x: 0, y: 0 }, referenceNode('ref').data);
        useCanvasStore
          .getState()
          .connectNodes({ source: 'a', target: 'b', sourceHandle: 'right', targetHandle: 'left' });
      });

      test('THEN the state stays empty and nothing is emitted', () => {
        expect(useCanvasStore.getState().nodes).toHaveLength(0);
        expect(useCanvasStore.getState().edges).toHaveLength(0);
        expect(onOperation).not.toHaveBeenCalled();
      });
    });
  });

  describe('GIVEN a member without canvas edit access', () => {
    beforeEach(() => {
      usePermissionsStore.getState().setAccess('ws-1', 'user-1', READONLY_ACCESS);
      useCanvasStore.getState().loadCanvas(THREAD_ID, {
        nodes: [canvasNode('n1', { createdBy: 'user-1' }), canvasNode('n2', { createdBy: 'user-2' })],
        edges: [canvasEdge('e1', 'n1', 'n2')],
      });
      unsubscribers.push(subscribeCanvasOperations(onOperation));
    });

    describe('WHEN they try to add a node', () => {
      beforeEach(() => {
        useCanvasStore.getState().addNode({ x: 0, y: 0 }, 'Sneaky');
      });

      test('THEN the state stays unchanged and nothing is emitted', () => {
        expect(useCanvasStore.getState().nodes).toHaveLength(2);
        expect(onOperation).not.toHaveBeenCalled();
      });
    });

    describe('WHEN they try to delete their own node with the delete key', () => {
      beforeEach(() => {
        useCanvasStore.getState().deleteElements(['n1'], []);
      });

      test('THEN the node stays in state and nothing is emitted', () => {
        expect(useCanvasStore.getState().nodes).toHaveLength(2);
        expect(onOperation).not.toHaveBeenCalled();
      });
    });

    describe('WHEN they try to drag a node', () => {
      beforeEach(() => {
        useCanvasStore
          .getState()
          .onNodesChange([{ type: 'position', id: 'n1', position: { x: 99, y: 99 }, dragging: true }]);
      });

      test('THEN the position stays unchanged', () => {
        expect(useCanvasStore.getState().nodes.find((node) => node.id === 'n1')).toMatchObject({
          position: { x: 0, y: 0 },
        });
      });
    });

    describe('WHEN they try to delete the edge with the delete key', () => {
      beforeEach(() => {
        useCanvasStore.getState().deleteElements([], ['e1']);
      });

      test('THEN the edge stays in state and nothing is emitted', () => {
        expect(useCanvasStore.getState().edges).toHaveLength(1);
        expect(onOperation).not.toHaveBeenCalled();
      });
    });

    describe('WHEN they try to comment', () => {
      beforeEach(() => {
        useCanvasStore.getState().addComment('n1', 'Sneaky comment');
      });

      test('THEN no comment appears and nothing is emitted', () => {
        expect(useCanvasStore.getState().nodes.find((node) => node.id === 'n1')).toMatchObject({
          data: { comments: [] },
        });
        expect(onOperation).not.toHaveBeenCalled();
      });
    });

    describe('WHEN they try to delete the edge directly', () => {
      beforeEach(() => {
        useCanvasStore.getState().deleteEdge('e1');
      });

      test('THEN the edge stays and nothing is emitted', () => {
        expect(useCanvasStore.getState().edges).toHaveLength(1);
        expect(onOperation).not.toHaveBeenCalled();
      });
    });

    describe('WHEN they try to connect the nodes', () => {
      beforeEach(() => {
        useCanvasStore.getState().setPendingConnection('n1');
        useCanvasStore
          .getState()
          .connectNodes({ source: 'n1', target: 'n2', sourceHandle: 'right', targetHandle: 'left' });
      });

      test('THEN nothing is emitted and the pending connection resets', () => {
        expect(useCanvasStore.getState().edges).toHaveLength(1);
        expect(useCanvasStore.getState().pendingConnection).toBeNull();
        expect(onOperation).not.toHaveBeenCalled();
      });
    });

    describe('WHEN they try to change a status or the answer', () => {
      beforeEach(() => {
        useCanvasStore.getState().setNodeStatus('n1', 'valid');
        useCanvasStore.getState().setNodeAnswer('n1');
      });

      test('THEN the node stays untouched and nothing is emitted', () => {
        expect(useCanvasStore.getState().nodes.find((node) => node.id === 'n1')).toMatchObject({
          data: { status: null, isAnswer: false },
        });
        expect(onOperation).not.toHaveBeenCalled();
      });
    });

    describe('WHEN they try to duplicate their own node', () => {
      beforeEach(() => {
        useCanvasStore.getState().duplicateNode('n1');
      });

      test('THEN no copy appears and nothing is emitted', () => {
        expect(useCanvasStore.getState().nodes).toHaveLength(2);
        expect(onOperation).not.toHaveBeenCalled();
      });
    });
  });

  describe('GIVEN a viewer looking at an existing comment', () => {
    beforeEach(() => {
      usePermissionsStore.getState().setAccess('ws-1', 'user-1', READONLY_ACCESS);
      useCanvasStore.getState().loadCanvas(THREAD_ID, {
        nodes: [canvasNode('n1', { comments: [comment('c-own')] })],
        edges: [],
      });
      unsubscribers.push(subscribeCanvasOperations(onOperation));
    });

    describe('WHEN they try to delete their own comment', () => {
      beforeEach(() => {
        useCanvasStore.getState().deleteComment('n1', 'c-own');
      });

      test('THEN the comment stays and nothing is emitted', () => {
        expect(useCanvasStore.getState().nodes.find((node) => node.id === 'n1')).toMatchObject({
          data: { comments: [comment('c-own')] },
        });
        expect(onOperation).not.toHaveBeenCalled();
      });
    });
  });

  describe('GIVEN a commenter without edit access', () => {
    beforeEach(() => {
      usePermissionsStore.getState().setAccess('ws-1', 'user-1', COMMENT_ACCESS);
      useCanvasStore.getState().loadCanvas(THREAD_ID, {
        nodes: [
          canvasNode('n1', {
            comments: [
              comment('c-own', { text: 'mine' }),
              comment('c-foreign', { text: 'theirs', authorId: 'user-2' }),
            ],
          }),
        ],
        edges: [],
      });
      unsubscribers.push(subscribeCanvasOperations(onOperation));
    });

    describe('WHEN they add a comment', () => {
      beforeEach(() => {
        useCanvasStore.getState().addComment('n1', 'Nice catch');
      });

      test('THEN the comment appears with their authorship', () => {
        const node = useCanvasStore.getState().nodes.find((candidate) => candidate.id === 'n1');

        expect(node).toMatchObject({
          data: {
            comments: [
              comment('c-own', { text: 'mine' }),
              comment('c-foreign', { text: 'theirs', authorId: 'user-2' }),
              expect.objectContaining({ text: 'Nice catch', authorId: 'user-1' }),
            ],
          },
        });
      });

      test('THEN a create comment operation is emitted', () => {
        expect(onOperation).toHaveBeenCalledExactlyOnceWith(
          expect.objectContaining({ type: 'createComment', nodeId: 'n1', text: 'Nice catch' }),
        );
      });
    });

    describe('WHEN they delete their own comment', () => {
      beforeEach(() => {
        useCanvasStore.getState().deleteComment('n1', 'c-own');
      });

      test('THEN the comment is removed', () => {
        expect(useCanvasStore.getState().nodes.find((node) => node.id === 'n1')).toMatchObject({
          data: { comments: [comment('c-foreign', { text: 'theirs', authorId: 'user-2' })] },
        });
      });

      test('THEN a delete comment operation is emitted', () => {
        expect(onOperation).toHaveBeenCalledExactlyOnceWith({ type: 'deleteComment', id: 'c-own' });
      });
    });

    describe("WHEN they delete someone else's comment", () => {
      beforeEach(() => {
        useCanvasStore.getState().deleteComment('n1', 'c-foreign');
      });

      test('THEN the comment stays and nothing is emitted', () => {
        const node = useCanvasStore.getState().nodes.find((candidate) => candidate.id === 'n1');

        expect(node).toMatchObject({
          data: {
            comments: [
              comment('c-own', { text: 'mine' }),
              comment('c-foreign', { text: 'theirs', authorId: 'user-2' }),
            ],
          },
        });
        expect(onOperation).not.toHaveBeenCalled();
      });
    });
  });

  describe('GIVEN a canvas with a question node and a validated chain', () => {
    beforeEach(() => {
      usePermissionsStore.getState().setAccess('ws-1', 'user-1', EDIT_ACCESS);
      useCanvasStore.getState().loadCanvas(THREAD_ID, {
        nodes: [questionNode('q'), canvasNode('n1', { status: 'valid' }), canvasNode('n2'), canvasNode('n3')],
        edges: [canvasEdge('e-q1', 'q', 'n1'), canvasEdge('e-12', 'n1', 'n2')],
      });
      unsubscribers.push(subscribeCanvasOperations(onOperation));
    });

    describe('WHEN the child of a valid node is marked valid', () => {
      beforeEach(() => {
        useCanvasStore.getState().setNodeStatus('n2', 'valid');
      });

      test('THEN its status updates', () => {
        expect(useCanvasStore.getState().nodes.find((node) => node.id === 'n2')).toMatchObject({
          data: { status: 'valid' },
        });
      });

      test('THEN a status operation is emitted', () => {
        expect(onOperation).toHaveBeenCalledExactlyOnceWith({ type: 'updateNodeStatus', id: 'n2', status: 'valid' });
      });
    });

    describe('WHEN an orphan node is marked valid', () => {
      beforeEach(() => {
        useCanvasStore.getState().setNodeStatus('n3', 'valid');
      });

      test('THEN nothing changes and nothing is emitted', () => {
        expect(useCanvasStore.getState().nodes.find((node) => node.id === 'n3')).toMatchObject({
          data: { status: null },
        });
        expect(onOperation).not.toHaveBeenCalled();
      });
    });

    describe('WHEN an already valid node is marked valid again', () => {
      beforeEach(() => {
        useCanvasStore.getState().setNodeStatus('n1', 'valid');
      });

      test('THEN the status toggles off', () => {
        expect(useCanvasStore.getState().nodes.find((node) => node.id === 'n1')).toMatchObject({
          data: { status: null },
        });
      });

      test('THEN a status reset operation is emitted', () => {
        expect(onOperation).toHaveBeenCalledExactlyOnceWith({ type: 'updateNodeStatus', id: 'n1', status: null });
      });
    });

    describe('WHEN an orphan node is marked invalid', () => {
      beforeEach(() => {
        useCanvasStore.getState().setNodeStatus('n3', 'invalid');
      });

      test('THEN the status applies without a validated parent', () => {
        expect(useCanvasStore.getState().nodes.find((node) => node.id === 'n3')).toMatchObject({
          data: { status: 'invalid' },
        });
        expect(onOperation).toHaveBeenCalledExactlyOnceWith({ type: 'updateNodeStatus', id: 'n3', status: 'invalid' });
      });
    });

    describe('WHEN an eligible node is marked as the answer', () => {
      beforeEach(() => {
        useCanvasStore.getState().setNodeAnswer('n2');
      });

      test('THEN it becomes the answer', () => {
        expect(useCanvasStore.getState().nodes.find((node) => node.id === 'n2')).toMatchObject({
          data: { isAnswer: true },
        });
      });

      test('THEN an answer operation is emitted', () => {
        expect(onOperation).toHaveBeenCalledExactlyOnceWith({ type: 'updateNodeAnswer', id: 'n2', isAnswer: true });
      });
    });

    describe('WHEN the answer moves to another eligible node', () => {
      beforeEach(() => {
        useCanvasStore.getState().setNodeAnswer('n2');
        useCanvasStore.getState().setNodeAnswer('n1');
      });

      test('THEN the previous answer clears', () => {
        expect(useCanvasStore.getState().nodes.find((node) => node.id === 'n1')).toMatchObject({
          data: { isAnswer: true },
        });
        expect(useCanvasStore.getState().nodes.find((node) => node.id === 'n2')).toMatchObject({
          data: { isAnswer: false },
        });
      });

      test('THEN answer updates are emitted for both nodes', () => {
        const answerOps = onOperation.mock.calls
          .map(([operation]) => operation)
          .filter((operation) => operation.type === 'updateNodeAnswer');

        expect(answerOps).toContainEqual({ type: 'updateNodeAnswer', id: 'n1', isAnswer: true });
        expect(answerOps).toContainEqual({ type: 'updateNodeAnswer', id: 'n2', isAnswer: false });
      });
    });

    describe('WHEN an orphan node is marked as the answer', () => {
      beforeEach(() => {
        useCanvasStore.getState().setNodeAnswer('n3');
      });

      test('THEN nothing changes and nothing is emitted', () => {
        expect(useCanvasStore.getState().nodes.find((node) => node.id === 'n3')).toMatchObject({
          data: { isAnswer: false },
        });
        expect(onOperation).not.toHaveBeenCalled();
      });
    });

    describe('WHEN the answer is toggled off after its parent lost validation', () => {
      beforeEach(() => {
        useCanvasStore.getState().setNodeAnswer('n2');
        useCanvasStore.getState().setNodeStatus('n1', 'valid');
        onOperation.mockClear();
        useCanvasStore.getState().setNodeAnswer('n2');
      });

      test('THEN the answer clears despite the missing validated parent', () => {
        expect(useCanvasStore.getState().nodes.find((node) => node.id === 'n2')).toMatchObject({
          data: { isAnswer: false },
        });
        expect(onOperation).toHaveBeenCalledExactlyOnceWith({ type: 'updateNodeAnswer', id: 'n2', isAnswer: false });
      });
    });

    describe('WHEN the question node is marked valid', () => {
      beforeEach(() => {
        useCanvasStore.getState().setNodeStatus('q', 'valid');
      });

      test('THEN nothing changes and nothing is emitted', () => {
        expect(useCanvasStore.getState().nodes.find((node) => node.id === 'q')).toMatchObject({
          data: { status: null },
        });
        expect(onOperation).not.toHaveBeenCalled();
      });
    });

    describe('WHEN the question node is deleted', () => {
      beforeEach(() => {
        useCanvasStore.getState().deleteNode('q');
      });

      test('THEN it stays and nothing is emitted', () => {
        expect(useCanvasStore.getState().nodes.find((node) => node.id === 'q')).toBeDefined();
        expect(onOperation).not.toHaveBeenCalled();
      });
    });
  });

  describe('GIVEN an editor with a validated node, the question node and a reference node', () => {
    beforeEach(() => {
      usePermissionsStore.getState().setAccess('ws-1', 'user-1', EDIT_ACCESS);
      useCanvasStore.getState().loadCanvas(THREAD_ID, {
        nodes: [questionNode('q'), canvasNode('n1', { createdBy: 'user-1', status: 'valid' }), referenceNode('ref')],
        edges: [],
      });
      unsubscribers.push(subscribeCanvasOperations(onOperation));
    });

    describe('WHEN they duplicate the validated node', () => {
      beforeEach(() => {
        useCanvasStore.getState().duplicateNode('n1');
      });

      test('THEN the copy carries the status over', () => {
        const copy = useCanvasStore.getState().nodes.find((node) => node.data.label === 'Node n1' && node.id !== 'n1');

        expect(copy).toMatchObject({ data: { status: 'valid', isAnswer: false, comments: [] } });
      });

      test('THEN a create and a status operation are emitted', () => {
        expect(onOperation).toHaveBeenCalledTimes(2);
        expect(onOperation).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'createCanvasNode', label: 'Node n1' }),
        );
        expect(onOperation).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'updateNodeStatus', status: 'valid' }),
        );
      });
    });

    describe('WHEN they duplicate the question node', () => {
      beforeEach(() => {
        useCanvasStore.getState().duplicateNode('q');
      });

      test('THEN nothing changes and nothing is emitted', () => {
        expect(useCanvasStore.getState().nodes).toHaveLength(3);
        expect(onOperation).not.toHaveBeenCalled();
      });
    });

    describe('WHEN they duplicate the reference node', () => {
      beforeEach(() => {
        useCanvasStore.getState().duplicateNode('ref');
      });

      test('THEN nothing changes and nothing is emitted', () => {
        expect(useCanvasStore.getState().nodes).toHaveLength(3);
        expect(onOperation).not.toHaveBeenCalled();
      });
    });
  });

  describe('GIVEN an editor about to delete the node behind the open overlays', () => {
    beforeEach(() => {
      usePermissionsStore.getState().setAccess('ws-1', 'user-1', EDIT_ACCESS);
      useCanvasStore.getState().loadCanvas(THREAD_ID, {
        nodes: [canvasNode('n1', { createdBy: 'user-1' })],
        edges: [],
      });
    });

    describe('WHEN the edited node is deleted', () => {
      beforeEach(() => {
        useCanvasStore.getState().setEditingNodeId('n1');
        useCanvasStore.getState().setPendingConnection('n1');
        useCanvasStore.getState().deleteNode('n1');
      });

      test('THEN the editor overlay and the pending connection clear', () => {
        expect(useCanvasStore.getState()).toMatchObject({ editingNodeId: null, pendingConnection: null });
      });
    });

    describe('WHEN the commented node is deleted', () => {
      beforeEach(() => {
        useCanvasStore.getState().setOpenCommentsNodeId('n1');
        useCanvasStore.getState().deleteNode('n1');
      });

      test('THEN the comments overlay clears', () => {
        expect(useCanvasStore.getState().openCommentsNodeId).toBeNull();
      });
    });
  });

  describe('GIVEN an editor dragging a node', () => {
    beforeEach(() => {
      usePermissionsStore.getState().setAccess('ws-1', 'user-1', EDIT_ACCESS);
      useCanvasStore.getState().loadCanvas(THREAD_ID, {
        nodes: [canvasNode('n1', { createdBy: 'user-1' })],
        edges: [],
      });
      unsubscribers.push(subscribeCanvasOperations(onOperation));
      useCanvasStore
        .getState()
        .onNodesChange([{ type: 'position', id: 'n1', position: { x: 50, y: 60 }, dragging: true }]);
      useCanvasStore
        .getState()
        .onNodesChange([{ type: 'position', id: 'n1', position: { x: 100, y: 120 }, dragging: true }]);
    });

    describe('WHEN the drag completes', () => {
      beforeEach(() => {
        useCanvasStore
          .getState()
          .onNodesChange([{ type: 'position', id: 'n1', position: { x: 100, y: 120 }, dragging: false }]);
      });

      test('THEN the node rests at the final position', () => {
        expect(useCanvasStore.getState().nodes.find((node) => node.id === 'n1')).toMatchObject({
          position: { x: 100, y: 120 },
        });
      });

      test('THEN a single position operation with the final coordinates is emitted', () => {
        expect(onOperation).toHaveBeenCalledExactlyOnceWith({ type: 'updateNodePosition', id: 'n1', x: 100, y: 120 });
      });
    });

    describe('WHEN the completed drag is undone', () => {
      beforeEach(() => {
        useCanvasStore
          .getState()
          .onNodesChange([{ type: 'position', id: 'n1', position: { x: 100, y: 120 }, dragging: false }]);
        onOperation.mockClear();
        useCanvasStore.getState().undo();
      });

      test('THEN the node returns to the origin', () => {
        expect(useCanvasStore.getState().nodes.find((node) => node.id === 'n1')).toMatchObject({
          position: { x: 0, y: 0 },
        });
      });

      test('THEN a position rollback operation is emitted', () => {
        expect(onOperation).toHaveBeenCalledExactlyOnceWith({ type: 'updateNodePosition', id: 'n1', x: 0, y: 0 });
      });
    });
  });

  describe('GIVEN an editor who just added a node', () => {
    beforeEach(() => {
      usePermissionsStore.getState().setAccess('ws-1', 'user-1', EDIT_ACCESS);
      useCanvasStore.getState().loadCanvas(THREAD_ID, { nodes: [], edges: [] });
      unsubscribers.push(subscribeCanvasOperations(onOperation));
      useCanvasStore.getState().addNode({ x: 0, y: 0 }, 'Draft');
    });

    describe('WHEN the addition is undone', () => {
      beforeEach(() => {
        onOperation.mockClear();
        useCanvasStore.getState().undo();
      });

      test('THEN the canvas empties', () => {
        expect(useCanvasStore.getState().nodes).toHaveLength(0);
      });

      test('THEN a delete operation is emitted through the replay', () => {
        expect(onOperation).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ type: 'deleteNode' }));
      });
    });

    describe('WHEN the undone addition is redone', () => {
      beforeEach(() => {
        useCanvasStore.getState().undo();
        onOperation.mockClear();
        useCanvasStore.getState().redo();
      });

      test('THEN the node returns', () => {
        expect(useCanvasStore.getState().nodes).toHaveLength(1);
        expect(useCanvasStore.getState().nodes[0]).toMatchObject({ data: { label: 'Draft' } });
      });

      test('THEN a create operation is emitted through the replay', () => {
        expect(onOperation).toHaveBeenCalledExactlyOnceWith(
          expect.objectContaining({ type: 'createCanvasNode', label: 'Draft' }),
        );
      });
    });

    describe('WHEN the new flag is cleared', () => {
      beforeEach(() => {
        useCanvasStore.getState().clearNewFlag(useCanvasStore.getState().nodes[0]!.id);
      });

      test('THEN the flag disappears without a new history entry', () => {
        expect(useCanvasStore.getState().nodes[0]!.data).not.toHaveProperty('isNew');
        expect(useCanvasStore.temporal.getState().pastStates).toHaveLength(1);
      });
    });
  });

  describe('GIVEN a freshly loaded canvas with persisted nodes', () => {
    beforeEach(() => {
      usePermissionsStore.getState().setAccess('ws-1', 'user-1', EDIT_ACCESS);
      useCanvasStore.getState().loadCanvas(THREAD_ID, { nodes: [canvasNode('n1')], edges: [] });
      unsubscribers.push(subscribeCanvasOperations(onOperation));
    });

    describe('WHEN undo is called immediately', () => {
      beforeEach(() => {
        useCanvasStore.getState().undo();
      });

      test('THEN the nodes remain and nothing is emitted', () => {
        expect(useCanvasStore.getState().nodes).toHaveLength(1);
        expect(onOperation).not.toHaveBeenCalled();
      });
    });

    describe('WHEN redo is called immediately', () => {
      beforeEach(() => {
        useCanvasStore.getState().redo();
      });

      test('THEN the nodes remain and nothing is emitted', () => {
        expect(useCanvasStore.getState().nodes).toHaveLength(1);
        expect(onOperation).not.toHaveBeenCalled();
      });
    });

    describe('WHEN a fresh canvas loads over pending edits', () => {
      beforeEach(() => {
        useCanvasStore.getState().setEditingNodeId('n1');
        useCanvasStore.getState().addNode({ x: 1, y: 1 }, 'Temp');
        useCanvasStore.getState().loadCanvas('thread-2', { nodes: [canvasNode('n2')], edges: [] });
      });

      test('THEN the overlays, history and content reset to the new thread', () => {
        expect(useCanvasStore.getState()).toMatchObject({ threadId: 'thread-2', hydrated: true, editingNodeId: null });
        expect(useCanvasStore.getState().nodes.map((node) => node.id)).toEqual(['n2']);
        expect(useCanvasStore.temporal.getState().pastStates).toHaveLength(0);
      });
    });

    describe('WHEN the canvas is cleared', () => {
      beforeEach(() => {
        useCanvasStore.getState().clearCanvas();
      });

      test('THEN the store returns to its empty unhydrated shape', () => {
        expect(useCanvasStore.getState()).toMatchObject({ threadId: null, hydrated: false, nodes: [], edges: [] });
        expect(useCanvasStore.temporal.getState().pastStates).toHaveLength(0);
      });
    });
  });

  describe('GIVEN an editor with a selected node and an open editor overlay', () => {
    beforeEach(() => {
      usePermissionsStore.getState().setAccess('ws-1', 'user-1', EDIT_ACCESS);
      useCanvasStore.getState().loadCanvas(THREAD_ID, {
        nodes: [{ ...canvasNode('n1'), selected: true }],
        edges: [],
      });
      useCanvasStore.getState().setEditingNodeId('n1');
    });

    describe('WHEN the editor overlay opens', () => {
      test('THEN it tracks the node', () => {
        expect(useCanvasStore.getState().editingNodeId).toBe('n1');
      });
    });

    describe('WHEN the comments overlay opens', () => {
      beforeEach(() => {
        useCanvasStore.getState().setOpenCommentsNodeId('n1');
      });

      test('THEN the editor overlay closes', () => {
        expect(useCanvasStore.getState()).toMatchObject({ editingNodeId: null, openCommentsNodeId: 'n1' });
      });
    });

    describe('WHEN all overlays are closed', () => {
      beforeEach(() => {
        useCanvasStore.getState().closeAllOverlays();
      });

      test('THEN every overlay field resets', () => {
        expect(useCanvasStore.getState()).toMatchObject({
          pendingConnection: null,
          referenceSearchPosition: null,
          editingNodeId: null,
          openCommentsNodeId: null,
        });
      });
    });

    describe('WHEN another tool is selected', () => {
      beforeEach(() => {
        useCanvasStore.getState().setActiveTool(ECanvasTool.Pan);
      });

      test('THEN the node selection is cleared', () => {
        expect(useCanvasStore.getState().nodes[0]).toMatchObject({ selected: false });
      });

      test('THEN the overlays close and the tool switches', () => {
        expect(useCanvasStore.getState()).toMatchObject({ editingNodeId: null, activeTool: ECanvasTool.Pan });
      });
    });

    describe('WHEN the already active tool is selected again', () => {
      beforeEach(() => {
        useCanvasStore.getState().setActiveTool(ECanvasTool.Select);
      });

      test('THEN the selection and the overlay survive the early return', () => {
        expect(useCanvasStore.getState().nodes[0]).toMatchObject({ selected: true });
        expect(useCanvasStore.getState().editingNodeId).toBe('n1');
      });
    });
  });

  describe('GIVEN an editor with a selected edge', () => {
    beforeEach(() => {
      usePermissionsStore.getState().setAccess('ws-1', 'user-1', EDIT_ACCESS);
      useCanvasStore.getState().loadCanvas(THREAD_ID, {
        nodes: [canvasNode('n1'), canvasNode('n2')],
        edges: [{ ...canvasEdge('e1', 'n1', 'n2'), selected: true }],
      });
    });

    describe('WHEN another tool is selected', () => {
      beforeEach(() => {
        useCanvasStore.getState().setActiveTool(ECanvasTool.Pan);
      });

      test('THEN the edge selection is cleared', () => {
        expect(useCanvasStore.getState().edges[0]).toMatchObject({ selected: false });
      });
    });
  });

  describe('GIVEN an editor watching the undo history', () => {
    beforeEach(() => {
      usePermissionsStore.getState().setAccess('ws-1', 'user-1', EDIT_ACCESS);
      useCanvasStore.getState().loadCanvas(THREAD_ID, {
        nodes: [canvasNode('n1', { createdBy: 'user-1' }), canvasNode('n2', { createdBy: 'user-1' })],
        edges: [canvasEdge('e1', 'n1', 'n2')],
      });
    });

    describe('WHEN a node is merely selected', () => {
      beforeEach(() => {
        useCanvasStore.getState().onNodesChange([{ type: 'select', id: 'n1', selected: true }]);
      });

      test('THEN no history entry is recorded', () => {
        expect(useCanvasStore.temporal.getState().pastStates).toHaveLength(0);
      });
    });

    describe('WHEN an edge is merely selected', () => {
      beforeEach(() => {
        useCanvasStore.getState().onEdgesChange([{ type: 'select', id: 'e1', selected: true }]);
      });

      test('THEN no history entry is recorded', () => {
        expect(useCanvasStore.temporal.getState().pastStates).toHaveLength(0);
      });
    });

    describe('WHEN a node label changes', () => {
      beforeEach(() => {
        useCanvasStore.getState().updateNodeLabel('n1', 'Changed');
      });

      test('THEN one history entry is recorded', () => {
        expect(useCanvasStore.temporal.getState().pastStates).toHaveLength(1);
      });
    });
  });

  describe('GIVEN an editor watching the undo history over a commented and a reference node', () => {
    beforeEach(() => {
      usePermissionsStore.getState().setAccess('ws-1', 'user-1', EDIT_ACCESS);
      useCanvasStore.getState().loadCanvas(THREAD_ID, {
        nodes: [canvasNode('n1', { createdBy: 'user-1', comments: [comment('c1')] }), referenceNode('ref1')],
        edges: [],
      });
    });

    describe('WHEN the commented node is merely selected', () => {
      beforeEach(() => {
        useCanvasStore.getState().onNodesChange([{ type: 'select', id: 'n1', selected: true }]);
      });

      test('THEN no history entry is recorded', () => {
        expect(useCanvasStore.temporal.getState().pastStates).toHaveLength(0);
      });
    });

    describe('WHEN the reference node is merely selected', () => {
      beforeEach(() => {
        useCanvasStore.getState().onNodesChange([{ type: 'select', id: 'ref1', selected: true }]);
      });

      test('THEN no history entry is recorded', () => {
        expect(useCanvasStore.temporal.getState().pastStates).toHaveLength(0);
      });
    });

    describe('WHEN a comment is added to the commented node', () => {
      beforeEach(() => {
        useCanvasStore.getState().addComment('n1', 'Another take');
      });

      test('THEN one history entry is recorded', () => {
        expect(useCanvasStore.temporal.getState().pastStates).toHaveLength(1);
      });
    });
  });

  describe('GIVEN an editor who renamed a node past the hundred-entry history capacity', () => {
    beforeEach(() => {
      usePermissionsStore.getState().setAccess('ws-1', 'user-1', EDIT_ACCESS);
      useCanvasStore.getState().loadCanvas(THREAD_ID, {
        nodes: [canvasNode('n1', { createdBy: 'user-1' })],
        edges: [],
      });
      Array.from({ length: 105 }, (_, index) => `Rename ${index + 1}`).forEach((label) =>
        useCanvasStore.getState().updateNodeLabel('n1', label),
      );
    });

    describe('WHEN the recorded history is inspected', () => {
      test('THEN the history caps at one hundred entries', () => {
        expect(useCanvasStore.temporal.getState().pastStates).toHaveLength(100);
      });

      test('THEN the oldest entries are dropped in favor of the newest', () => {
        expect(useCanvasStore.temporal.getState().pastStates[0]).toMatchObject({
          nodes: [{ data: { label: 'Rename 5' } }],
        });
      });
    });

    describe('WHEN undo is applied past the capped history', () => {
      beforeEach(() => {
        Array.from({ length: 105 }).forEach(() => useCanvasStore.getState().undo());
      });

      test('THEN the state rewinds only to the oldest retained entry', () => {
        expect(useCanvasStore.getState().nodes[0]).toMatchObject({ data: { label: 'Rename 5' } });
      });

      test('THEN the exhausted history moves into the redo stack', () => {
        expect(useCanvasStore.temporal.getState().pastStates).toHaveLength(0);
        expect(useCanvasStore.temporal.getState().futureStates).toHaveLength(100);
      });
    });
  });

  describe('GIVEN a loaded canvas', () => {
    beforeEach(() => {
      useCanvasStore.getState().loadCanvas(THREAD_ID, { nodes: [canvasNode('n1')], edges: [] });
    });

    describe('WHEN the middle pan engages', () => {
      beforeEach(() => {
        useCanvasStore.getState().setMiddlePan(true);
      });

      test('THEN the flag raises without a history entry', () => {
        expect(useCanvasStore.getState().middlePan).toBe(true);
        expect(useCanvasStore.temporal.getState().pastStates).toHaveLength(0);
      });
    });

    describe('WHEN the middle pan engages and releases', () => {
      beforeEach(() => {
        useCanvasStore.getState().setMiddlePan(true);
        useCanvasStore.getState().setMiddlePan(false);
      });

      test('THEN the flag clears', () => {
        expect(useCanvasStore.getState().middlePan).toBe(false);
      });
    });

    describe('WHEN the reference search opens at a canvas position', () => {
      beforeEach(() => {
        useCanvasStore.getState().setReferenceSearchPosition({ x: 12, y: 34 });
      });

      test('THEN the position is stored without a history entry', () => {
        expect(useCanvasStore.getState().referenceSearchPosition).toEqual({ x: 12, y: 34 });
        expect(useCanvasStore.temporal.getState().pastStates).toHaveLength(0);
      });
    });

    describe('WHEN the open reference search closes', () => {
      beforeEach(() => {
        useCanvasStore.getState().setReferenceSearchPosition({ x: 12, y: 34 });
        useCanvasStore.getState().setReferenceSearchPosition(null);
      });

      test('THEN the position clears', () => {
        expect(useCanvasStore.getState().referenceSearchPosition).toBeNull();
      });
    });
  });

  describe('GIVEN an editor with a bidirectional pair and a one-way edge', () => {
    beforeEach(() => {
      usePermissionsStore.getState().setAccess('ws-1', 'user-1', EDIT_ACCESS);
      useCanvasStore.getState().loadCanvas(THREAD_ID, {
        nodes: [canvasNode('a'), canvasNode('b', { createdBy: 'user-1' }), canvasNode('c')],
        edges: [canvasEdge('ab', 'a', 'b'), canvasEdge('ba', 'b', 'a'), canvasEdge('bc', 'b', 'c')],
      });
      unsubscribers.push(subscribeCanvasOperations(onOperation));
    });

    describe('WHEN they delete one direction of the pair', () => {
      beforeEach(() => {
        useCanvasStore.getState().deleteEdge('ab');
      });

      test('THEN both directions disappear and the one-way edge stays', () => {
        expect(useCanvasStore.getState().edges.map((edge) => edge.id)).toEqual(['bc']);
      });

      test('THEN a delete operation is emitted for each direction', () => {
        expect(onOperation.mock.calls.map(([operation]) => operation)).toEqual([
          { type: 'deleteEdge', id: 'ab' },
          { type: 'deleteEdge', id: 'ba' },
        ]);
      });
    });

    describe('WHEN they delete the rendered direction of the pair with the delete key', () => {
      beforeEach(() => {
        useCanvasStore.getState().deleteElements([], ['ab']);
      });

      test('THEN both directions disappear and the one-way edge stays', () => {
        expect(useCanvasStore.getState().edges.map((edge) => edge.id)).toEqual(['bc']);
      });

      test('THEN a delete operation is emitted for each direction', () => {
        expect(onOperation.mock.calls.map(([operation]) => operation)).toEqual([
          { type: 'deleteEdge', id: 'ab' },
          { type: 'deleteEdge', id: 'ba' },
        ]);
      });
    });

    describe('WHEN they delete the shared node together with one direction of the pair', () => {
      beforeEach(() => {
        useCanvasStore.getState().deleteElements(['b'], ['ab']);
      });

      test('THEN the node and every edge touching it disappear', () => {
        expect(useCanvasStore.getState().nodes.map((node) => node.id)).toEqual(['a', 'c']);
        expect(useCanvasStore.getState().edges).toEqual([]);
      });

      test('THEN only the node delete is emitted because the database removes its edges', () => {
        expect(onOperation).toHaveBeenCalledExactlyOnceWith({ type: 'deleteNode', id: 'b' });
      });
    });

    describe('WHEN they delete the one-way edge', () => {
      beforeEach(() => {
        useCanvasStore.getState().deleteEdge('bc');
      });

      test('THEN only that edge disappears', () => {
        expect(useCanvasStore.getState().edges.map((edge) => edge.id)).toEqual(['ab', 'ba']);
        expect(onOperation).toHaveBeenCalledExactlyOnceWith({ type: 'deleteEdge', id: 'bc' });
      });
    });

    describe('WHEN the deletion of the pair is undone', () => {
      beforeEach(() => {
        useCanvasStore.getState().deleteEdge('ab');
        onOperation.mockClear();
        useCanvasStore.getState().undo();
      });

      test('THEN both directions come back in one step', () => {
        expect(useCanvasStore.getState().edges.map((edge) => edge.id)).toEqual(['ab', 'ba', 'bc']);
      });

      test('THEN a create operation is replayed for each direction', () => {
        expect(onOperation.mock.calls.map(([operation]) => operation)).toEqual([
          expect.objectContaining({ type: 'createEdge', id: 'ab', source: 'a', target: 'b' }),
          expect.objectContaining({ type: 'createEdge', id: 'ba', source: 'b', target: 'a' }),
        ]);
      });
    });
  });
});
