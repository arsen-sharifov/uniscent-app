import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { stubResizeObserver } from '@mocks/browser';
import { THREAD_ID, canvasEdge, canvasNode, questionNode, referenceNode } from '@mocks/canvas';
import { TRANSLATIONS } from '@mocks/i18n';
import { router } from '@mocks/navigation';
import { COMMENT_ACCESS, EDIT_ACCESS, FULL_ACCESS, READONLY_ACCESS } from '@mocks/roles';
import { OVERLAY_VIEWPORT_MARGIN } from '@/components/Canvas/consts';
import { ContextMenu } from '@/components/Canvas/fragments';
import { useCanvasStore, usePermissionsStore } from '@/lib/stores';

vi.mock('@/i18n', () => import('@mocks/i18n'));
vi.mock('next/navigation', () => import('@mocks/navigation'));

const MENU_WIDTH = 224;
const MENU_HEIGHT = 96;

const onClose = vi.fn();

const menuItem = (label: string) => screen.getByRole('menuitem', { name: new RegExp(label) });
const menuLayout = () =>
  Array.from(screen.getByRole('menu').children, (child) => child.getAttribute('role') ?? 'divider');
const storedNode = (id: string) => useCanvasStore.getState().nodes.find((node) => node.id === id);

const measureMenus = () => {
  Object.defineProperty(HTMLDivElement.prototype, 'offsetWidth', { configurable: true, value: MENU_WIDTH });
  Object.defineProperty(HTMLDivElement.prototype, 'offsetHeight', { configurable: true, value: MENU_HEIGHT });
};

beforeEach(() => {
  stubResizeObserver();
});

afterEach(() => {
  Reflect.deleteProperty(HTMLDivElement.prototype, 'offsetWidth');
  Reflect.deleteProperty(HTMLDivElement.prototype, 'offsetHeight');
  useCanvasStore.getState().clearCanvas();
  usePermissionsStore.getState().clearAccess();
  vi.unstubAllGlobals();
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
        expect(menuItem(TRANSLATIONS.platform.canvas.context.addNode)).toHaveFocus();
        expect(screen.getByRole('menu', { name: TRANSLATIONS.platform.canvas.context.ariaLabel })).toHaveStyle({
          left: '40px',
          top: '60px',
        });
        expect(screen.getByRole('menu')).toHaveAttribute('tabindex', '-1');
      });
    });

    describe('WHEN a node is added from the menu', () => {
      beforeEach(() => {
        fireEvent.click(menuItem(TRANSLATIONS.platform.canvas.context.addNode));
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
        fireEvent.click(menuItem(TRANSLATIONS.platform.canvas.context.addReference));
      });

      test('THEN the reference search opens at the flow position and the menu closes', () => {
        expect(useCanvasStore.getState().referenceSearchPosition).toEqual({ x: 120, y: 80 });
        expect(onClose).toHaveBeenCalledOnce();
      });
    });

    describe('WHEN the arrow key moves down the menu', () => {
      beforeEach(() => {
        fireEvent.keyDown(menuItem(TRANSLATIONS.platform.canvas.context.addNode), { key: 'ArrowDown' });
      });

      test('THEN the next action takes focus', () => {
        expect(menuItem(TRANSLATIONS.platform.canvas.context.addReference)).toHaveFocus();
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

  describe('GIVEN an editor right-clicking next to the bottom right corner of the window', () => {
    beforeEach(() => {
      measureMenus();
      usePermissionsStore.getState().setAccess('ws-1', 'user-1', FULL_ACCESS);
      useCanvasStore.getState().loadCanvas(THREAD_ID, { nodes: [], edges: [] });
    });

    describe('WHEN the menu appears', () => {
      beforeEach(() => {
        render(
          <ContextMenu
            menu={{ type: 'pane', x: window.innerWidth - 10, y: window.innerHeight - 10, flowX: 0, flowY: 0 }}
            onClose={onClose}
          />,
        );
      });

      test('THEN it moves back inside the window with the edge margin', () => {
        expect(screen.getByRole('menu')).toHaveStyle({
          left: `${window.innerWidth - MENU_WIDTH - OVERLAY_VIEWPORT_MARGIN}px`,
          top: `${window.innerHeight - MENU_HEIGHT - OVERLAY_VIEWPORT_MARGIN}px`,
        });
      });
    });
  });

  describe('GIVEN a menu opened on a node before the canvas holds it', () => {
    beforeEach(() => {
      usePermissionsStore.getState().setAccess('ws-1', 'user-1', FULL_ACCESS);
      useCanvasStore.getState().loadCanvas(THREAD_ID, { nodes: [], edges: [] });
      render(<ContextMenu menu={{ type: 'node', x: 40, y: 60, nodeId: 'n1' }} onClose={onClose} />);
    });

    describe('WHEN the node arrives and the menu gets its items', () => {
      beforeEach(() => {
        act(() => useCanvasStore.getState().loadCanvas(THREAD_ID, { nodes: [canvasNode('n1')], edges: [] }));
      });

      test('THEN the menu is placed at the cursor', () => {
        expect(screen.getByRole('menu')).toHaveStyle({ left: '40px', top: '60px' });
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
        fireEvent.click(menuItem(TRANSLATIONS.platform.canvas.context.deleteEdge));
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
          `${TRANSLATIONS.platform.canvas.context.markValid}${TRANSLATIONS.platform.canvas.context.needsValidParent}`,
          `${TRANSLATIONS.platform.canvas.context.markInvalid}X`,
          `${TRANSLATIONS.platform.canvas.context.markAnswer}${TRANSLATIONS.platform.canvas.context.needsValidParent}`,
          TRANSLATIONS.platform.canvas.context.comment,
          TRANSLATIONS.platform.canvas.context.duplicate,
          `${TRANSLATIONS.platform.canvas.context.delete}⌫`,
        ]);
      });

      test('THEN the verdicts that need a validated parent are disabled with their hint and stay focusable', () => {
        expect(menuItem(TRANSLATIONS.platform.canvas.context.markValid)).not.toHaveAttribute('disabled');
        expect(menuItem(TRANSLATIONS.platform.canvas.context.markValid)).toHaveAttribute('aria-disabled', 'true');
        expect(menuItem(TRANSLATIONS.platform.canvas.context.markValid)).toHaveAttribute(
          'title',
          TRANSLATIONS.platform.canvas.context.needsValidParent,
        );
        expect(menuItem(TRANSLATIONS.platform.canvas.context.markAnswer)).toHaveAttribute('aria-disabled', 'true');
        expect(menuItem(TRANSLATIONS.platform.canvas.context.markInvalid)).toHaveAttribute('aria-disabled', 'false');
      });

      test('THEN the disabled first verdict still takes the focus', () => {
        expect(menuItem(TRANSLATIONS.platform.canvas.context.markValid)).toHaveFocus();
      });
    });

    describe('WHEN the disabled valid verdict is clicked', () => {
      beforeEach(() => {
        fireEvent.click(menuItem(TRANSLATIONS.platform.canvas.context.markValid));
      });

      test('THEN the node keeps its status and the menu stays open', () => {
        expect(storedNode('n1')).toMatchObject({ data: { status: null } });
        expect(onClose).not.toHaveBeenCalled();
      });
    });

    describe('WHEN the node is marked invalid', () => {
      beforeEach(() => {
        fireEvent.click(menuItem(TRANSLATIONS.platform.canvas.context.markInvalid));
      });

      test('THEN the node carries the invalid verdict and the menu closes', () => {
        expect(storedNode('n1')?.data.status).toBe('invalid');
        expect(onClose).toHaveBeenCalledOnce();
      });
    });

    describe('WHEN the comments are opened from the menu', () => {
      beforeEach(() => {
        fireEvent.click(menuItem(TRANSLATIONS.platform.canvas.context.comment));
      });

      test('THEN the node comments open and the menu closes', () => {
        expect(useCanvasStore.getState().openCommentsNodeId).toBe('n1');
        expect(onClose).toHaveBeenCalledOnce();
      });
    });

    describe('WHEN the node is duplicated', () => {
      beforeEach(() => {
        fireEvent.click(menuItem(TRANSLATIONS.platform.canvas.context.duplicate));
      });

      test('THEN a copy joins the canvas and the menu closes', () => {
        expect(useCanvasStore.getState().nodes).toHaveLength(2);
        expect(onClose).toHaveBeenCalledOnce();
      });
    });

    describe('WHEN the node is deleted', () => {
      beforeEach(() => {
        fireEvent.click(menuItem(TRANSLATIONS.platform.canvas.context.delete));
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
        expect(menuItem(TRANSLATIONS.platform.canvas.context.unmarkValid)).toBeEnabled();
        expect(menuItem(TRANSLATIONS.platform.canvas.context.markInvalid)).toBeEnabled();
        expect(menuItem(TRANSLATIONS.platform.canvas.context.unmarkAnswer)).toBeEnabled();
      });
    });

    describe('WHEN the answer mark is removed', () => {
      beforeEach(() => {
        fireEvent.click(menuItem(TRANSLATIONS.platform.canvas.context.unmarkAnswer));
      });

      test('THEN the node is no longer the answer', () => {
        expect(storedNode('n1')?.data.isAnswer).toBe(false);
      });
    });

    describe('WHEN the valid verdict is removed', () => {
      beforeEach(() => {
        fireEvent.click(menuItem(TRANSLATIONS.platform.canvas.context.unmarkValid));
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
        expect(menuItem(TRANSLATIONS.platform.canvas.context.unmarkInvalid)).toBeEnabled();
        expect(menuItem(TRANSLATIONS.platform.canvas.context.markValid)).toBeEnabled();
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

      test('THEN delete is offered as unavailable with the reason', () => {
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
        expect(menuItem(TRANSLATIONS.platform.canvas.context.delete)).toHaveAttribute('aria-disabled', 'true');
        expect(menuItem(TRANSLATIONS.platform.canvas.context.delete)).toHaveTextContent(
          TRANSLATIONS.platform.canvas.context.deleteNotAllowed,
        );
      });
    });

    describe('WHEN the unavailable delete is clicked', () => {
      beforeEach(() => {
        render(<ContextMenu menu={{ type: 'node', x: 0, y: 0, nodeId: 'n1' }} onClose={onClose} />);
        fireEvent.click(menuItem(TRANSLATIONS.platform.canvas.context.delete));
      });

      test('THEN the node stays and the menu stays open', () => {
        expect(storedNode('n1')).toBeDefined();
        expect(onClose).not.toHaveBeenCalled();
      });
    });
  });

  describe('GIVEN an editor on a reference somebody else added', () => {
    beforeEach(() => {
      usePermissionsStore.getState().setAccess('ws-1', 'user-1', EDIT_ACCESS);
      useCanvasStore.getState().loadCanvas(THREAD_ID, { nodes: [referenceNode('r1')], edges: [] });
    });

    describe('WHEN the menu appears', () => {
      beforeEach(() => {
        render(<ContextMenu menu={{ type: 'node', x: 0, y: 0, nodeId: 'r1' }} onClose={onClose} />);
      });

      test('THEN deleting the reference is offered as unavailable with the reason', () => {
        expect(menuItem(TRANSLATIONS.platform.canvas.context.deleteReference)).toHaveAttribute('aria-disabled', 'true');
        expect(menuItem(TRANSLATIONS.platform.canvas.context.deleteReference)).toHaveTextContent(
          TRANSLATIONS.platform.canvas.context.deleteNotAllowed,
        );
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
        expect(menuItem(TRANSLATIONS.platform.canvas.context.comment)).toHaveFocus();
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
        expect(menuItem(TRANSLATIONS.platform.canvas.context.openReferenced)).toBeInTheDocument();
        expect(menuItem(TRANSLATIONS.platform.canvas.context.deleteReference)).toBeInTheDocument();
      });
    });

    describe('WHEN the referenced node is opened', () => {
      beforeEach(() => {
        fireEvent.click(menuItem(TRANSLATIONS.platform.canvas.context.openReferenced));
      });

      test('THEN the source canvas is navigated to with the node in focus and the menu closes', () => {
        expect(router.push).toHaveBeenCalledExactlyOnceWith('/platform/ws-2/th-2?focus=ref&node=origin');
        expect(onClose).toHaveBeenCalledOnce();
      });
    });

    describe('WHEN the reference is deleted', () => {
      beforeEach(() => {
        fireEvent.click(menuItem(TRANSLATIONS.platform.canvas.context.deleteReference));
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
        expect(menuItem(TRANSLATIONS.platform.canvas.context.openReferenced)).toBeInTheDocument();
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
        expect(menuItem(TRANSLATIONS.platform.canvas.context.deleteReference)).toBeInTheDocument();
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
