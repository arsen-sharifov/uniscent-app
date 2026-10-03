import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { stubResizeObserver } from '@mocks/browser';
import { THREAD_ID, canvasNode } from '@mocks/canvas';
import { TRANSLATIONS } from '@mocks/i18n';
import { FULL_ACCESS, READONLY_ACCESS } from '@mocks/roles';
import { CanvasNodeLabel } from '@/components/Canvas/fragments';
import { MAX_NODE_LABEL_LENGTH } from '@/lib/canvas';
import { useOnboardingStore } from '@/lib/onboarding';
import { useCanvasStore, usePermissionsStore } from '@/lib/stores';

vi.mock('@/i18n', () => import('@mocks/i18n'));

const onPageClick = vi.fn();
const onPagePress = vi.fn();

const overflowLabels = () => {
  Object.defineProperty(HTMLParagraphElement.prototype, 'scrollHeight', { configurable: true, value: 200 });
  Object.defineProperty(HTMLParagraphElement.prototype, 'clientHeight', { configurable: true, value: 100 });
};

beforeEach(() => {
  stubResizeObserver();
  document.body.addEventListener('click', onPageClick);
  document.body.addEventListener('mousedown', onPagePress);
});

afterEach(() => {
  document.body.removeEventListener('click', onPageClick);
  document.body.removeEventListener('mousedown', onPagePress);
  Reflect.deleteProperty(HTMLParagraphElement.prototype, 'scrollHeight');
  Reflect.deleteProperty(HTMLParagraphElement.prototype, 'clientHeight');
  useOnboardingStore.getState().forget();
  useCanvasStore.getState().clearCanvas();
  usePermissionsStore.getState().clearAccess();
});

describe('CanvasNodeLabel', () => {
  describe('GIVEN a long label an owner is not editing', () => {
    beforeEach(() => {
      overflowLabels();
      usePermissionsStore.getState().setAccess('ws-1', 'user-1', FULL_ACCESS);
      render(<CanvasNodeLabel id="n1" label="A long idea" isEditing={false} measured commentCount={0} />);
    });

    describe('WHEN the label renders', () => {
      test('THEN it is clamped with the comment invite and a show more toggle beside it', () => {
        expect(screen.getByText('A long idea')).toHaveClass('line-clamp-10');
        expect(screen.getByRole('button', { name: TRANSLATIONS.platform.canvas.node.addComment })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: TRANSLATIONS.platform.canvas.node.showMore })).toBeInTheDocument();
      });
    });

    describe('WHEN the label is expanded', () => {
      beforeEach(() => {
        fireEvent.click(screen.getByRole('button', { name: TRANSLATIONS.platform.canvas.node.showMore }));
      });

      test('THEN the clamp lifts and the toggle offers to show less', () => {
        expect(screen.getByText('A long idea')).not.toHaveClass('line-clamp-10');
        expect(screen.getByRole('button', { name: TRANSLATIONS.platform.canvas.node.showLess })).toBeInTheDocument();
      });
    });
  });

  describe('GIVEN a short label a viewer is reading', () => {
    beforeEach(() => {
      usePermissionsStore.getState().setAccess('ws-1', 'user-1', READONLY_ACCESS);
    });

    describe('WHEN the label renders', () => {
      beforeEach(() => {
        render(<CanvasNodeLabel id="n1" label="Short" isEditing={false} measured commentCount={0} />);
      });

      test('THEN neither the toggle nor the comment invite is shown', () => {
        expect(screen.getByText('Short')).toBeInTheDocument();
        expect(screen.queryByRole('button')).not.toBeInTheDocument();
      });
    });
  });

  describe('GIVEN an owner editing the label while a guide is running', () => {
    beforeEach(() => {
      overflowLabels();
      usePermissionsStore.getState().setAccess('ws-1', 'user-1', FULL_ACCESS);
      useCanvasStore.getState().loadCanvas(THREAD_ID, { nodes: [canvasNode('n1', { label: 'Idea' })], edges: [] });
      useCanvasStore.getState().setEditingNodeId('n1');
      useOnboardingStore.getState().startGuide('canvas');
      render(<CanvasNodeLabel id="n1" label="Idea" isEditing measured commentCount={2} />);
    });

    describe('WHEN the editor opens', () => {
      test('THEN a focused, labelled textarea replaces the label without the side buttons', () => {
        expect(screen.getByRole('textbox', { name: TRANSLATIONS.platform.canvas.node.labelAriaLabel })).toHaveValue(
          'Idea',
        );
        expect(screen.getByRole('textbox')).toHaveFocus();
        expect(screen.queryByRole('button')).not.toBeInTheDocument();
      });

      test('THEN the textarea stops at the longest label the canvas stores', () => {
        expect(screen.getByRole('textbox')).toHaveAttribute('maxlength', String(MAX_NODE_LABEL_LENGTH));
      });
    });

    describe('WHEN the textarea is clicked and pressed', () => {
      beforeEach(() => {
        fireEvent.mouseDown(screen.getByRole('textbox'));
        fireEvent.click(screen.getByRole('textbox'));
      });

      test('THEN neither reaches the canvas and editing continues', () => {
        expect(onPageClick).not.toHaveBeenCalled();
        expect(onPagePress).not.toHaveBeenCalled();
        expect(useCanvasStore.getState().editingNodeId).toBe('n1');
      });
    });

    describe('WHEN a new label is committed', () => {
      beforeEach(() => {
        fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Better idea' } });
        fireEvent.blur(screen.getByRole('textbox'));
      });

      test('THEN the label is saved and the guide learns the node was labelled', () => {
        expect(useCanvasStore.getState().nodes[0]?.data.label).toBe('Better idea');
        expect(useOnboardingStore.getState().signals.has('nodeLabelled')).toBe(true);
      });
    });

    describe('WHEN the same label is committed', () => {
      beforeEach(() => {
        fireEvent.blur(screen.getByRole('textbox'));
      });

      test('THEN the guide is not told about a relabel', () => {
        expect(useOnboardingStore.getState().signals.has('nodeLabelled')).toBe(false);
      });
    });
  });

  describe('GIVEN an owner editing the label of a node React Flow has not measured yet', () => {
    let rerender: ReturnType<typeof render>['rerender'];

    beforeEach(() => {
      usePermissionsStore.getState().setAccess('ws-1', 'user-1', FULL_ACCESS);
      useCanvasStore.getState().loadCanvas(THREAD_ID, { nodes: [canvasNode('n1', { label: 'Idea' })], edges: [] });
      useCanvasStore.getState().setEditingNodeId('n1');
      rerender = render(<CanvasNodeLabel id="n1" label="Idea" isEditing measured={false} commentCount={0} />).rerender;
    });

    describe('WHEN the editor opens on the hidden node', () => {
      test('THEN the textarea waits without taking focus', () => {
        expect(screen.getByRole('textbox')).not.toHaveFocus();
      });
    });

    describe('WHEN the node is measured and shown', () => {
      beforeEach(() => {
        rerender(<CanvasNodeLabel id="n1" label="Idea" isEditing measured commentCount={0} />);
      });

      test('THEN the textarea takes focus', () => {
        expect(screen.getByRole('textbox')).toHaveFocus();
      });
    });
  });
});
