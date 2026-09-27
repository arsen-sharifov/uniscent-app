import { fireEvent, render, screen } from '@testing-library/react';
import { type NodeProps, ReactFlowProvider } from '@xyflow/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import type { TCanvasNode } from '@interfaces';

import { stubResizeObserver } from '@mocks/browser';
import { THREAD_ID, questionNode } from '@mocks/canvas';
import { TRANSLATIONS } from '@mocks/i18n';
import { FULL_ACCESS, READONLY_ACCESS } from '@mocks/roles';
import { QuestionNode } from '@/components/Canvas';
import { useCanvasStore, usePermissionsStore } from '@/lib/stores';

vi.mock('@/i18n', () => import('@mocks/i18n'));

const questionCopy = TRANSLATIONS.platform.canvas.question;
const nodeCopy = TRANSLATIONS.platform.canvas.node;

const nodeProps = (node: TCanvasNode, selected = false) =>
  ({
    id: node.id,
    data: node.data,
    selected,
    type: node.type,
    dragging: false,
    zIndex: 0,
    isConnectable: true,
    positionAbsoluteX: 0,
    positionAbsoluteY: 0,
    selectable: true,
    deletable: true,
    draggable: true,
  }) as unknown as NodeProps<TCanvasNode>;

const blankQuestion = (): TCanvasNode => ({ ...questionNode('q'), data: { ...questionNode('q').data, label: '  ' } });

const overflowLabels = () => {
  Object.defineProperty(HTMLParagraphElement.prototype, 'scrollHeight', { configurable: true, value: 200 });
  Object.defineProperty(HTMLParagraphElement.prototype, 'clientHeight', { configurable: true, value: 100 });
};

beforeEach(() => {
  stubResizeObserver();
});

afterEach(() => {
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
        expect(screen.getByText(questionCopy.badge)).toBeInTheDocument();
        expect(screen.getByText('Main question')).toHaveClass('line-clamp-8', 'text-[color:var(--text-strong)]');
        expect(screen.getByRole('button', { name: nodeCopy.showMore })).toBeInTheDocument();
      });
    });

    describe('WHEN the question is expanded', () => {
      beforeEach(() => {
        fireEvent.click(screen.getByRole('button', { name: nodeCopy.showMore }));
      });

      test('THEN the clamp lifts and the toggle offers to show less', () => {
        expect(screen.getByText('Main question')).not.toHaveClass('line-clamp-8');
        expect(screen.getByRole('button', { name: nodeCopy.showLess })).toBeInTheDocument();
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
        expect(screen.getByText(questionCopy.placeholder)).toHaveClass('text-[color:var(--text-subtle)]');
        expect(screen.getByText(questionCopy.placeholder)).not.toHaveClass('line-clamp-8');
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
        expect(screen.getByRole('textbox', { name: questionCopy.ariaLabel })).toHaveValue('Main question');
        expect(screen.getByRole('textbox')).toHaveFocus();
        expect(screen.getByRole('textbox')).toHaveAttribute('placeholder', questionCopy.placeholder);
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
  });
});
