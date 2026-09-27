import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { THREAD_ID, canvasEdge, canvasNode, questionNode, referenceNode } from '@mocks/canvas';
import { TRANSLATIONS } from '@mocks/i18n';
import { router } from '@mocks/navigation';
import { COMMENT_ACCESS, EDIT_ACCESS, FULL_ACCESS, READONLY_ACCESS } from '@mocks/roles';
import { ContextMenu } from '@/components/Canvas/fragments';
import { useCanvasStore, usePermissionsStore } from '@/lib/stores';

vi.mock('@/i18n', () => import('@mocks/i18n'));
vi.mock('next/navigation', () => import('@mocks/navigation'));

const copy = TRANSLATIONS.platform.canvas.context;

const onClose = vi.fn();

const menuItem = (label: string) => screen.getByRole('menuitem', { name: new RegExp(label) });
const menuLayout = () =>
  Array.from(screen.getByRole('menu').children, (child) => child.getAttribute('role') ?? 'divider');
const storedNode = (id: string) => useCanvasStore.getState().nodes.find((node) => node.id === id);

afterEach(() => {
  useCanvasStore.getState().clearCanvas();
  usePermissionsStore.getState().clearAccess();
});

describe('ContextMenu', () => {
  describe('GIVEN an editor opening the menu on the empty pane', () => {
    beforeEach(() => {
      usePermissionsStore.getState().setAccess('ws-1', 'user-1', FULL_ACCESS);
      useCanvasStore.getState().loadCanvas(THREAD_ID, { nodes: [], edges: [] });
      render(<ContextMenu menu={{ type: 'pane', x: 40, y: 60, flowX: 120, flowY: 80 }} onClose={onClose} />);
    });

    describe('WHEN the menu appears', () => {
      test('THEN it offers both pane actions at the cursor and focuses the first one', () => {
        expect(screen.getAllByRole('menuitem')).toHaveLength(2);
        expect(menuItem(copy.addNode)).toHaveFocus();
        expect(screen.getByRole('menu', { name: copy.ariaLabel })).toHaveStyle({ left: '40px', top: '60px' });
        expect(screen.getByRole('menu')).toHaveAttribute('tabindex', '-1');
      });
    });

    describe('WHEN a node is added from the menu', () => {
      beforeEach(() => {
        fireEvent.click(menuItem(copy.addNode));
      });

      test('THEN a default node lands at the flow position and the menu closes', () => {
        expect(useCanvasStore.getState().nodes).toHaveLength(1);
        expect(useCanvasStore.getState().nodes[0]).toMatchObject({
          position: { x: 120, y: 80 },
          data: { label: TRANSLATIONS.platform.canvas.node.defaultLabel },
        });
        expect(onClose).toHaveBeenCalledOnce();
      });
    });

    describe('WHEN a reference is started from the menu', () => {
      beforeEach(() => {
        fireEvent.click(menuItem(copy.addReference));
      });

      test('THEN the reference search opens at the flow position and the menu closes', () => {
        expect(useCanvasStore.getState().referenceSearchPosition).toEqual({ x: 120, y: 80 });
        expect(onClose).toHaveBeenCalledOnce();
      });
    });

    describe('WHEN the arrow key moves down the menu', () => {
      beforeEach(() => {
        fireEvent.keyDown(menuItem(copy.addNode), { key: 'ArrowDown' });
      });

      test('THEN the next action takes focus', () => {
        expect(menuItem(copy.addReference)).toHaveFocus();
      });
    });

    describe('WHEN Escape is pressed', () => {
      beforeEach(() => {
        fireEvent.keyDown(window, { key: 'Escape' });
      });

      test('THEN the menu closes', () => {
        expect(onClose).toHaveBeenCalledOnce();
      });
    });

    describe('WHEN the pointer goes down outside the menu', () => {
      beforeEach(() => {
        fireEvent.mouseDown(document.body);
      });

      test('THEN the menu closes', () => {
        expect(onClose).toHaveBeenCalledOnce();
      });
    });
  });

  describe('GIVEN an editor opening the menu on an edge', () => {
    beforeEach(() => {
      usePermissionsStore.getState().setAccess('ws-1', 'user-1', FULL_ACCESS);
      useCanvasStore.getState().loadCanvas(THREAD_ID, {
        nodes: [canvasNode('a'), canvasNode('b')],
        edges: [canvasEdge('e1', 'a', 'b')],
      });
      render(<ContextMenu menu={{ type: 'edge', x: 0, y: 0, edgeId: 'e1' }} onClose={onClose} />);
    });

    describe('WHEN the edge is deleted from the menu', () => {
      beforeEach(() => {
        fireEvent.click(menuItem(copy.deleteEdge));
      });

      test('THEN the edge is gone and the menu closes', () => {
        expect(useCanvasStore.getState().edges).toEqual([]);
        expect(onClose).toHaveBeenCalled();
      });
    });
  });

  describe('GIVEN a menu for an edge that no longer exists', () => {
    beforeEach(() => {
      usePermissionsStore.getState().setAccess('ws-1', 'user-1', FULL_ACCESS);
      useCanvasStore.getState().loadCanvas(THREAD_ID, { nodes: [], edges: [] });
    });

    describe('WHEN the menu mounts', () => {
      beforeEach(() => {
        render(<ContextMenu menu={{ type: 'edge', x: 0, y: 0, edgeId: 'gone' }} onClose={onClose} />);
      });

      test('THEN it closes itself', () => {
        expect(onClose).toHaveBeenCalled();
      });
    });
  });

  describe('GIVEN an owner opening the menu on a node without a validated parent', () => {
    beforeEach(() => {
      usePermissionsStore.getState().setAccess('ws-1', 'user-1', FULL_ACCESS);
      useCanvasStore.getState().loadCanvas(THREAD_ID, { nodes: [canvasNode('n1')], edges: [] });
      render(<ContextMenu menu={{ type: 'node', x: 0, y: 0, nodeId: 'n1' }} onClose={onClose} />);
    });

    describe('WHEN the menu appears', () => {
      test('THEN verdicts and comment come first, then duplicate, then delete, each group split by a divider', () => {
        expect(menuLayout()).toEqual([
          'menuitem',
          'menuitem',
          'menuitem',
          'menuitem',
          'divider',
          'menuitem',
          'divider',
          'menuitem',
        ]);
        expect(screen.getAllByRole('menuitem').map((item) => item.textContent)).toEqual([
          `${copy.markValid}${copy.needsValidParent}`,
          `${copy.markInvalid}X`,
          `${copy.markAnswer}${copy.needsValidParent}`,
          `${copy.comment}M`,
          copy.duplicate,
          `${copy.delete}⌫`,
        ]);
      });

      test('THEN the verdicts that need a validated parent are disabled with their hint', () => {
        expect(menuItem(copy.markValid)).toBeDisabled();
        expect(menuItem(copy.markValid)).toHaveAttribute('title', copy.needsValidParent);
        expect(menuItem(copy.markAnswer)).toBeDisabled();
        expect(menuItem(copy.markInvalid)).toBeEnabled();
      });
    });

    describe('WHEN the node is marked invalid', () => {
      beforeEach(() => {
        fireEvent.click(menuItem(copy.markInvalid));
      });

      test('THEN the node carries the invalid verdict and the menu closes', () => {
        expect(storedNode('n1')?.data.status).toBe('invalid');
        expect(onClose).toHaveBeenCalledOnce();
      });
    });

    describe('WHEN the comments are opened from the menu', () => {
      beforeEach(() => {
        fireEvent.click(menuItem(copy.comment));
      });

      test('THEN the node comments open and the menu closes', () => {
        expect(useCanvasStore.getState().openCommentsNodeId).toBe('n1');
        expect(onClose).toHaveBeenCalledOnce();
      });
    });

    describe('WHEN the node is duplicated', () => {
      beforeEach(() => {
        fireEvent.click(menuItem(copy.duplicate));
      });

      test('THEN a copy joins the canvas and the menu closes', () => {
        expect(useCanvasStore.getState().nodes).toHaveLength(2);
        expect(onClose).toHaveBeenCalledOnce();
      });
    });

    describe('WHEN the node is deleted', () => {
      beforeEach(() => {
        fireEvent.click(menuItem(copy.delete));
      });

      test('THEN the node is gone and the menu closes', () => {
        expect(storedNode('n1')).toBeUndefined();
        expect(onClose).toHaveBeenCalled();
      });
    });
  });

  describe('GIVEN an owner opening the menu on a valid answer under the question', () => {
    beforeEach(() => {
      usePermissionsStore.getState().setAccess('ws-1', 'user-1', FULL_ACCESS);
      useCanvasStore.getState().loadCanvas(THREAD_ID, {
        nodes: [questionNode('q'), canvasNode('n1', { status: 'valid', isAnswer: true })],
        edges: [canvasEdge('e1', 'q', 'n1')],
      });
      render(<ContextMenu menu={{ type: 'node', x: 0, y: 0, nodeId: 'n1' }} onClose={onClose} />);
    });

    describe('WHEN the menu appears', () => {
      test('THEN the verdicts offer to be undone and are all enabled', () => {
        expect(menuItem(copy.unmarkValid)).toBeEnabled();
        expect(menuItem(copy.markInvalid)).toBeEnabled();
        expect(menuItem(copy.unmarkAnswer)).toBeEnabled();
      });
    });

    describe('WHEN the answer mark is removed', () => {
      beforeEach(() => {
        fireEvent.click(menuItem(copy.unmarkAnswer));
      });

      test('THEN the node is no longer the answer', () => {
        expect(storedNode('n1')?.data.isAnswer).toBe(false);
      });
    });

    describe('WHEN the valid verdict is removed', () => {
      beforeEach(() => {
        fireEvent.click(menuItem(copy.unmarkValid));
      });

      test('THEN the node loses its verdict', () => {
        expect(storedNode('n1')?.data.status).toBeNull();
      });
    });
  });

  describe('GIVEN an invalid node under the question', () => {
    beforeEach(() => {
      usePermissionsStore.getState().setAccess('ws-1', 'user-1', FULL_ACCESS);
      useCanvasStore.getState().loadCanvas(THREAD_ID, {
        nodes: [questionNode('q'), canvasNode('n1', { status: 'invalid' })],
        edges: [canvasEdge('e1', 'q', 'n1')],
      });
    });

    describe('WHEN its menu appears', () => {
      beforeEach(() => {
        render(<ContextMenu menu={{ type: 'node', x: 0, y: 0, nodeId: 'n1' }} onClose={onClose} />);
      });

      test('THEN the invalid verdict offers to be undone', () => {
        expect(menuItem(copy.unmarkInvalid)).toBeEnabled();
        expect(menuItem(copy.markValid)).toBeEnabled();
      });
    });
  });

  describe('GIVEN an editor on a node somebody else created', () => {
    beforeEach(() => {
      usePermissionsStore.getState().setAccess('ws-1', 'user-1', EDIT_ACCESS);
      useCanvasStore.getState().loadCanvas(THREAD_ID, {
        nodes: [canvasNode('n1', { createdBy: 'user-2' })],
        edges: [],
      });
    });

    describe('WHEN the menu appears', () => {
      beforeEach(() => {
        render(<ContextMenu menu={{ type: 'node', x: 0, y: 0, nodeId: 'n1' }} onClose={onClose} />);
      });

      test('THEN everything but delete is offered', () => {
        expect(menuLayout()).toEqual(['menuitem', 'menuitem', 'menuitem', 'menuitem', 'divider', 'menuitem']);
        expect(screen.queryByRole('menuitem', { name: new RegExp(copy.delete) })).not.toBeInTheDocument();
      });
    });
  });

  describe('GIVEN a commenter on a node', () => {
    beforeEach(() => {
      usePermissionsStore.getState().setAccess('ws-1', 'user-1', COMMENT_ACCESS);
      useCanvasStore.getState().loadCanvas(THREAD_ID, { nodes: [canvasNode('n1')], edges: [] });
    });

    describe('WHEN the menu appears', () => {
      beforeEach(() => {
        render(<ContextMenu menu={{ type: 'node', x: 0, y: 0, nodeId: 'n1' }} onClose={onClose} />);
      });

      test('THEN only the comment action is offered', () => {
        expect(menuLayout()).toEqual(['menuitem']);
        expect(menuItem(copy.comment)).toHaveFocus();
      });
    });
  });

  describe('GIVEN an owner opening the menu on a reference', () => {
    beforeEach(() => {
      usePermissionsStore.getState().setAccess('ws-1', 'user-1', FULL_ACCESS);
      useCanvasStore.getState().loadCanvas(THREAD_ID, { nodes: [referenceNode('r1')], edges: [] });
      render(<ContextMenu menu={{ type: 'node', x: 0, y: 0, nodeId: 'r1' }} onClose={onClose} />);
    });

    describe('WHEN the menu appears', () => {
      test('THEN opening the source and deleting the reference are offered as separate groups', () => {
        expect(menuLayout()).toEqual(['menuitem', 'divider', 'menuitem']);
        expect(menuItem(copy.openReferenced)).toBeInTheDocument();
        expect(menuItem(copy.deleteReference)).toBeInTheDocument();
      });
    });

    describe('WHEN the referenced node is opened', () => {
      beforeEach(() => {
        fireEvent.click(menuItem(copy.openReferenced));
      });

      test('THEN the source canvas is navigated to with the node in focus and the menu closes', () => {
        expect(router.push).toHaveBeenCalledExactlyOnceWith('/platform/ws-2/th-2?focus=ref&node=origin');
        expect(onClose).toHaveBeenCalledOnce();
      });
    });

    describe('WHEN the reference is deleted', () => {
      beforeEach(() => {
        fireEvent.click(menuItem(copy.deleteReference));
      });

      test('THEN the reference is gone', () => {
        expect(storedNode('r1')).toBeUndefined();
      });
    });
  });

  describe('GIVEN a viewer on a reference', () => {
    beforeEach(() => {
      usePermissionsStore.getState().setAccess('ws-1', 'user-1', READONLY_ACCESS);
      useCanvasStore.getState().loadCanvas(THREAD_ID, { nodes: [referenceNode('r1')], edges: [] });
    });

    describe('WHEN the menu appears', () => {
      beforeEach(() => {
        render(<ContextMenu menu={{ type: 'node', x: 0, y: 0, nodeId: 'r1' }} onClose={onClose} />);
      });

      test('THEN only opening the source is offered', () => {
        expect(menuLayout()).toEqual(['menuitem']);
        expect(menuItem(copy.openReferenced)).toBeInTheDocument();
      });
    });
  });

  describe('GIVEN an owner on a reference without a source node', () => {
    beforeEach(() => {
      usePermissionsStore.getState().setAccess('ws-1', 'user-1', FULL_ACCESS);
      useCanvasStore.getState().loadCanvas(THREAD_ID, {
        nodes: [{ ...referenceNode('r1'), data: { ...referenceNode('r1').data, sourceNodeId: '' } }],
        edges: [],
      });
    });

    describe('WHEN the menu appears', () => {
      beforeEach(() => {
        render(<ContextMenu menu={{ type: 'node', x: 0, y: 0, nodeId: 'r1' }} onClose={onClose} />);
      });

      test('THEN only deleting the reference is offered', () => {
        expect(menuLayout()).toEqual(['menuitem']);
        expect(menuItem(copy.deleteReference)).toBeInTheDocument();
      });
    });
  });

  describe('GIVEN an owner opening the menu on the question', () => {
    beforeEach(() => {
      usePermissionsStore.getState().setAccess('ws-1', 'user-1', FULL_ACCESS);
      useCanvasStore.getState().loadCanvas(THREAD_ID, { nodes: [questionNode('q')], edges: [] });
      render(<ContextMenu menu={{ type: 'node', x: 0, y: 0, nodeId: 'q' }} onClose={onClose} />);
    });

    describe('WHEN the question is edited from the menu', () => {
      beforeEach(() => {
        fireEvent.click(menuItem(TRANSLATIONS.platform.canvas.question.editLabel));
      });

      test('THEN the question enters editing and the menu closes', () => {
        expect(useCanvasStore.getState().editingNodeId).toBe('q');
        expect(onClose).toHaveBeenCalledOnce();
      });
    });
  });

  describe('GIVEN a commenter on the question', () => {
    beforeEach(() => {
      usePermissionsStore.getState().setAccess('ws-1', 'user-1', COMMENT_ACCESS);
      useCanvasStore.getState().loadCanvas(THREAD_ID, { nodes: [questionNode('q')], edges: [] });
    });

    describe('WHEN the menu mounts', () => {
      beforeEach(() => {
        render(<ContextMenu menu={{ type: 'node', x: 0, y: 0, nodeId: 'q' }} onClose={onClose} />);
      });

      test('THEN nothing is rendered and the menu closes itself', () => {
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
        expect(onClose).toHaveBeenCalledOnce();
      });
    });
  });

  describe('GIVEN a canvas node whose data is malformed', () => {
    beforeEach(() => {
      usePermissionsStore.getState().setAccess('ws-1', 'user-1', FULL_ACCESS);
      useCanvasStore.getState().loadCanvas(THREAD_ID, {
        nodes: [{ ...canvasNode('n1'), data: { ...canvasNode('n1').data, comments: undefined as never } }],
        edges: [],
      });
    });

    describe('WHEN the menu mounts', () => {
      beforeEach(() => {
        render(<ContextMenu menu={{ type: 'node', x: 0, y: 0, nodeId: 'n1' }} onClose={onClose} />);
      });

      test('THEN nothing is rendered and the menu closes itself', () => {
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
        expect(onClose).toHaveBeenCalledOnce();
      });
    });
  });
});
