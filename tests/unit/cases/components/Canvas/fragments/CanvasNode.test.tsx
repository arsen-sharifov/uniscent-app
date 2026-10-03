import { fireEvent, render, screen } from '@testing-library/react';
import { ReactFlowProvider } from '@xyflow/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { stubResizeObserver } from '@mocks/browser';
import { THREAD_ID, canvasEdge, canvasNode, comment, nodeProps } from '@mocks/canvas';
import { TRANSLATIONS } from '@mocks/i18n';
import { COMMENT_ACCESS, FULL_ACCESS } from '@mocks/roles';
import { NODE_ALARM_WASHES } from '@/components/Canvas/consts';
import { CanvasNode } from '@/components/Canvas/fragments';
import { useCanvasStore, usePermissionsStore } from '@/lib/stores';

vi.mock('@/i18n', () => import('@mocks/i18n'));

const onPageClick = vi.fn();

const nodeCard = () => document.querySelector<HTMLElement>('[data-tour="canvasNode"]');
const commentsPanel = () => document.querySelector<HTMLElement>('[data-tour="canvasCommentsPanel"]');

beforeEach(() => {
  stubResizeObserver();
  document.body.addEventListener('click', onPageClick);
});

afterEach(() => {
  document.body.removeEventListener('click', onPageClick);
  useCanvasStore.getState().clearCanvas();
  usePermissionsStore.getState().clearAccess();
});

describe('CanvasNode', () => {
  describe('GIVEN an invalid node linked into the graph', () => {
    beforeEach(() => {
      usePermissionsStore.getState().setAccess('ws-1', 'user-1', FULL_ACCESS);
      useCanvasStore.getState().loadCanvas(THREAD_ID, {
        nodes: [canvasNode('n1', { status: 'invalid' }), canvasNode('n2')],
        edges: [canvasEdge('e1', 'n1', 'n2')],
      });
    });

    describe('WHEN the node renders at rest', () => {
      beforeEach(() => {
        render(
          <ReactFlowProvider>
            <CanvasNode {...nodeProps(canvasNode('n1', { status: 'invalid' }), true)} />
          </ReactFlowProvider>,
        );
      });

      test('THEN it carries the invalid band, the alarm wash and the tour markers', () => {
        expect(screen.getByText(TRANSLATIONS.platform.canvas.node.invalidBadge)).toBeInTheDocument();
        expect(nodeCard()).toHaveStyle({
          backgroundImage: `linear-gradient(${NODE_ALARM_WASHES.invalid}, ${NODE_ALARM_WASHES.invalid})`,
        });
        expect(nodeCard()).toHaveAttribute('data-tour-state', 'invalid');
        expect(nodeCard()).toHaveAttribute('data-tour-linked', 'true');
        expect(nodeCard()).toHaveClass('ring-[color:var(--selection)]');
      });
    });

    describe('WHEN the node is being edited', () => {
      beforeEach(() => {
        useCanvasStore.getState().setEditingNodeId('n1');
        render(
          <ReactFlowProvider>
            <CanvasNode {...nodeProps(canvasNode('n1', { status: 'invalid' }))} />
          </ReactFlowProvider>,
        );
      });

      test('THEN the wash lifts and the label turns into a textarea', () => {
        expect(nodeCard()).not.toHaveAttribute('style');
        expect(nodeCard()).toHaveClass('border-[color:var(--border-active)]');
        expect(screen.getByRole('textbox')).toHaveValue('Node n1');
      });
    });
  });

  describe('GIVEN a freshly dropped node that is eligible for the active tool', () => {
    beforeEach(() => {
      usePermissionsStore.getState().setAccess('ws-1', 'user-1', FULL_ACCESS);
      useCanvasStore.getState().loadCanvas(THREAD_ID, {
        nodes: [canvasNode('n1', { isNew: true, eligibleHint: true })],
        edges: [],
      });
      render(
        <ReactFlowProvider>
          <CanvasNode {...nodeProps(canvasNode('n1', { isNew: true, eligibleHint: true }))} />
        </ReactFlowProvider>,
      );
    });

    describe('WHEN it renders', () => {
      test('THEN it plays the drop animation inside the eligibility halo without any band', () => {
        expect(nodeCard()).toHaveClass('animate-node-drop');
        expect(nodeCard()?.querySelector('[aria-hidden].border-dashed')).toBeInTheDocument();
        expect(nodeCard()).toHaveAttribute('data-tour-state', 'unmarked');
        expect(nodeCard()).toHaveAttribute('data-tour-linked', 'false');
      });
    });
  });

  describe('GIVEN a commenter with the node comments open', () => {
    beforeEach(() => {
      usePermissionsStore.getState().setAccess('ws-1', 'user-1', COMMENT_ACCESS);
      useCanvasStore.getState().loadCanvas(THREAD_ID, {
        nodes: [canvasNode('n1', { comments: [comment('c1')] })],
        edges: [],
      });
      useCanvasStore.getState().setOpenCommentsNodeId('n1');
      render(
        <ReactFlowProvider>
          <CanvasNode {...nodeProps(canvasNode('n1', { comments: [comment('c1')] }))} />
        </ReactFlowProvider>,
      );
    });

    describe('WHEN the panel renders', () => {
      test('THEN it sits beside the card and is left out of exports', () => {
        expect(commentsPanel()).toHaveClass('nodrag', 'left-full');
        expect(commentsPanel()).toHaveAttribute('data-export-omit');
        expect(screen.getByText('Comment c1')).toBeInTheDocument();
      });
    });

    describe('WHEN something inside the panel is clicked', () => {
      beforeEach(() => {
        fireEvent.click(screen.getByText('Comment c1'));
      });

      test('THEN the click stays inside the panel and the comments stay open', () => {
        expect(onPageClick).not.toHaveBeenCalled();
        expect(useCanvasStore.getState().openCommentsNodeId).toBe('n1');
      });
    });

    describe('WHEN the card label is clicked', () => {
      beforeEach(() => {
        fireEvent.click(screen.getByText('Node n1'));
      });

      test('THEN the click reaches the canvas like any node click', () => {
        expect(onPageClick).toHaveBeenCalledOnce();
      });
    });

    describe('WHEN a draft is typed and the panel is closed and reopened', () => {
      beforeEach(() => {
        fireEvent.change(screen.getByPlaceholderText(TRANSLATIONS.platform.canvas.node.addCommentPlaceholder), {
          target: { value: 'Later' },
        });
        fireEvent.click(screen.getByRole('button', { name: TRANSLATIONS.platform.canvas.node.closeComments }));
        fireEvent.click(screen.getByRole('button', { name: TRANSLATIONS.platform.canvas.node.viewComments }));
      });

      test('THEN the draft is still in the composer', () => {
        expect(screen.getByPlaceholderText(TRANSLATIONS.platform.canvas.node.addCommentPlaceholder)).toHaveValue(
          'Later',
        );
      });
    });
  });
});
