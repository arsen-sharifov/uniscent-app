import { fireEvent, render, screen } from '@testing-library/react';
import { ReactFlowProvider } from '@xyflow/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import type { TCanvasNode } from '@interfaces';

import { stubResizeObserver } from '@mocks/browser';
import { THREAD_ID, nodeProps, questionNode } from '@mocks/canvas';
import { TRANSLATIONS } from '@mocks/i18n';
import { FULL_ACCESS, READONLY_ACCESS } from '@mocks/roles';
import { QuestionNode } from '@/components/Canvas/fragments';
import { MAX_NODE_LABEL_LENGTH, subscribeCanvasOperations } from '@/lib/canvas';
import { useCanvasStore, usePermissionsStore } from '@/lib/stores';

vi.mock('@/i18n', () => import('@mocks/i18n'));

const onOperation = vi.fn();

const unsubscribers: Array<() => void> = [];

const blankQuestion = (): TCanvasNode => ({ ...questionNode('q'), data: { ...questionNode('q').data, label: '  ' } });

const overflowLabels = () => {
  Object.defineProperty(HTMLParagraphElement.prototype, 'scrollHeight', { configurable: true, value: 200 });
  Object.defineProperty(HTMLParagraphElement.prototype, 'clientHeight', { configurable: true, value: 100 });
};

beforeEach(() => {
  stubResizeObserver();
});

afterEach(() => {
  unsubscribers.splice(0).forEach((unsubscribe) => unsubscribe());
  Reflect.deleteProperty(HTMLParagraphElement.prototype, 'scrollHeight');
  Reflect.deleteProperty(HTMLParagraphElement.prototype, 'clientHeight');
  useCanvasStore.getState().clearCanvas();
  usePermissionsStore.getState().clearAccess();
});

describe('QuestionNode', () => {
  describe('GIVEN a long question a viewer has selected', () => {
    beforeEach(() => {
      overflowLabels();
      usePermissionsStore.getState().setAccess('ws-1', 'user-1', READONLY_ACCESS);
      render(
        <ReactFlowProvider>
          <QuestionNode {...nodeProps(questionNode('q'), true)} />
        </ReactFlowProvider>,
      );
    });

    describe('WHEN it renders', () => {
      test('THEN the clamped question shows under its band with a show more toggle', () => {
        expect(screen.getByText(TRANSLATIONS.platform.canvas.question.badge)).toBeInTheDocument();
        expect(screen.getByText('Main question')).toHaveClass('line-clamp-8', 'text-[color:var(--text-strong)]');
        expect(screen.getByRole('button', { name: TRANSLATIONS.platform.canvas.node.showMore })).toBeInTheDocument();
      });
    });

    describe('WHEN the question is expanded', () => {
      beforeEach(() => {
        fireEvent.click(screen.getByRole('button', { name: TRANSLATIONS.platform.canvas.node.showMore }));
      });

      test('THEN the clamp lifts and the toggle offers to show less', () => {
        expect(screen.getByText('Main question')).not.toHaveClass('line-clamp-8');
        expect(screen.getByRole('button', { name: TRANSLATIONS.platform.canvas.node.showLess })).toBeInTheDocument();
      });
    });
  });

  describe('GIVEN a question without text', () => {
    beforeEach(() => {
      overflowLabels();
      usePermissionsStore.getState().setAccess('ws-1', 'user-1', FULL_ACCESS);
    });

    describe('WHEN it renders', () => {
      beforeEach(() => {
        render(
          <ReactFlowProvider>
            <QuestionNode {...nodeProps(blankQuestion())} />
          </ReactFlowProvider>,
        );
      });

      test('THEN the muted placeholder shows without a clamp or a toggle', () => {
        expect(screen.getByText(TRANSLATIONS.platform.canvas.question.placeholder)).toHaveClass(
          'text-[color:var(--text-subtle)]',
        );
        expect(screen.getByText(TRANSLATIONS.platform.canvas.question.placeholder)).not.toHaveClass('line-clamp-8');
        expect(screen.queryByRole('button')).not.toBeInTheDocument();
      });
    });
  });

  describe('GIVEN an owner editing the question', () => {
    beforeEach(() => {
      usePermissionsStore.getState().setAccess('ws-1', 'user-1', FULL_ACCESS);
      useCanvasStore.getState().loadCanvas(THREAD_ID, { nodes: [questionNode('q')], edges: [] });
      useCanvasStore.getState().setEditingNodeId('q');
      render(
        <ReactFlowProvider>
          <QuestionNode {...nodeProps(questionNode('q'))} />
        </ReactFlowProvider>,
      );
    });

    describe('WHEN the editor opens', () => {
      test('THEN a focused, labelled textarea replaces the question', () => {
        expect(screen.getByRole('textbox', { name: TRANSLATIONS.platform.canvas.question.ariaLabel })).toHaveValue(
          'Main question',
        );
        expect(screen.getByRole('textbox')).toHaveFocus();
        expect(screen.getByRole('textbox')).toHaveAttribute(
          'placeholder',
          TRANSLATIONS.platform.canvas.question.placeholder,
        );
      });

      test('THEN the textarea stops at the longest label the canvas stores', () => {
        expect(screen.getByRole('textbox')).toHaveAttribute('maxlength', String(MAX_NODE_LABEL_LENGTH));
      });
    });

    describe('WHEN a new question is committed with Enter', () => {
      beforeEach(() => {
        fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Which bet wins?' } });
        fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });
      });

      test('THEN the question is saved and editing ends', () => {
        expect(useCanvasStore.getState().nodes[0]?.data.label).toBe('Which bet wins?');
        expect(useCanvasStore.getState().editingNodeId).toBeNull();
      });
    });

    describe('WHEN the edit is cancelled with Escape', () => {
      beforeEach(() => {
        fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Discarded draft' } });
        fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Escape' });
      });

      test('THEN the question keeps its text and editing ends', () => {
        expect(useCanvasStore.getState().nodes[0]?.data.label).toBe('Main question');
        expect(useCanvasStore.getState().editingNodeId).toBeNull();
      });
    });
  });

  describe('GIVEN a fresh question opened for editing before React Flow measured it', () => {
    let rerender: ReturnType<typeof render>['rerender'];

    beforeEach(() => {
      usePermissionsStore.getState().setAccess('ws-1', 'user-1', FULL_ACCESS);
      useCanvasStore.getState().loadCanvas(THREAD_ID, { nodes: [blankQuestion()], edges: [] });
      useCanvasStore.getState().setEditingNodeId('q');
      unsubscribers.push(subscribeCanvasOperations(onOperation));
      rerender = render(
        <ReactFlowProvider>
          <QuestionNode {...nodeProps(blankQuestion())} width={0} height={0} />
        </ReactFlowProvider>,
      ).rerender;
    });

    describe('WHEN the hidden node renders its editor', () => {
      test('THEN the textarea is in place but not focused yet', () => {
        expect(
          screen.getByRole('textbox', { name: TRANSLATIONS.platform.canvas.question.ariaLabel }),
        ).not.toHaveFocus();
      });
    });

    describe('WHEN React Flow measures and reveals the node', () => {
      beforeEach(() => {
        rerender(
          <ReactFlowProvider>
            <QuestionNode {...nodeProps(blankQuestion())} />
          </ReactFlowProvider>,
        );
      });

      test('THEN the textarea takes focus so typing goes into the question', () => {
        expect(screen.getByRole('textbox', { name: TRANSLATIONS.platform.canvas.question.ariaLabel })).toHaveFocus();
      });
    });

    describe('WHEN it blurs without any text', () => {
      beforeEach(() => {
        fireEvent.blur(screen.getByRole('textbox'));
      });

      test('THEN editing ends without writing the unchanged label', () => {
        expect(useCanvasStore.getState().editingNodeId).toBeNull();
        expect(onOperation).not.toHaveBeenCalled();
      });
    });
  });
});
