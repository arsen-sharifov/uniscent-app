import { act, renderHook } from '@testing-library/react';
import type { FocusEvent, KeyboardEvent } from 'react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { THREAD_ID, canvasNode } from '@mocks/canvas';
import { EDIT_ACCESS } from '@mocks/roles';
import { useLabelEditing } from '@/components/Canvas/hooks';
import { useOnboardingStore } from '@/lib/onboarding';
import { useCanvasStore, usePermissionsStore } from '@/lib/stores';

const blurWith = (value: string) => ({ target: { value } }) as FocusEvent<HTMLTextAreaElement>;

const keyWith = (key: string, value: string, shiftKey = false) =>
  ({
    key,
    shiftKey,
    preventDefault: vi.fn(),
    currentTarget: { value },
  }) as unknown as KeyboardEvent<HTMLTextAreaElement>;

const storedLabel = () => useCanvasStore.getState().nodes.find((node) => node.id === 'n1')?.data.label;
const labelledSignal = () => useOnboardingStore.getState().signals.has('nodeLabelled');

let editor: { current: ReturnType<typeof useLabelEditing> };

beforeEach(() => {
  usePermissionsStore.getState().setAccess('ws-1', 'user-1', EDIT_ACCESS);
  useCanvasStore.getState().loadCanvas(THREAD_ID, {
    nodes: [canvasNode('n1', { label: 'Idea', createdBy: 'user-1' })],
    edges: [],
  });
  useCanvasStore.getState().setEditingNodeId('n1');
  useOnboardingStore.getState().startGuide('canvas');
});

afterEach(() => {
  useOnboardingStore.getState().forget();
  useCanvasStore.getState().clearCanvas();
  usePermissionsStore.getState().clearAccess();
});

describe('useLabelEditing', () => {
  describe('GIVEN a label textarea that is not being edited yet', () => {
    let textarea: HTMLTextAreaElement;
    let rerenderEditor: (props: { isEditing: boolean }) => void;

    beforeEach(() => {
      textarea = document.createElement('textarea');
      textarea.value = 'Idea';
      document.body.append(textarea);

      const view = renderHook(({ isEditing }) => useLabelEditing('n1', 'Idea', isEditing), {
        initialProps: { isEditing: false },
      });

      view.result.current.inputRef.current = textarea;
      rerenderEditor = view.rerender;
    });

    afterEach(() => {
      textarea.remove();
    });

    describe('WHEN editing starts', () => {
      beforeEach(() => {
        rerenderEditor({ isEditing: true });
      });

      test('THEN the textarea takes focus with the caret after the text', () => {
        expect(textarea).toHaveFocus();
        expect(textarea.selectionStart).toBe(4);
        expect(textarea.selectionEnd).toBe(4);
      });
    });
  });

  describe('GIVEN a node label being edited while a guide is running', () => {
    beforeEach(() => {
      editor = renderHook(() => useLabelEditing('n1', 'Idea', true)).result;
    });

    describe('WHEN the textarea blurs with a new padded label', () => {
      beforeEach(() => {
        act(() => editor.current.handleLabelBlur(blurWith('  Better idea  ')));
      });

      test('THEN the trimmed label is saved, editing ends and the guide learns the node was labelled', () => {
        expect(storedLabel()).toBe('Better idea');
        expect(useCanvasStore.getState().editingNodeId).toBeNull();
        expect(labelledSignal()).toBe(true);
      });
    });

    describe('WHEN the textarea blurs with only whitespace', () => {
      beforeEach(() => {
        act(() => editor.current.handleLabelBlur(blurWith('   ')));
      });

      test('THEN the previous label stays, editing ends and the guide is not told about a relabel', () => {
        expect(storedLabel()).toBe('Idea');
        expect(useCanvasStore.getState().editingNodeId).toBeNull();
        expect(labelledSignal()).toBe(false);
      });
    });

    describe('WHEN Enter is pressed', () => {
      let press: KeyboardEvent<HTMLTextAreaElement>;

      beforeEach(() => {
        press = keyWith('Enter', 'Sharper idea');
        act(() => editor.current.handleLabelKeyDown(press));
      });

      test('THEN the new line is suppressed and the label is committed', () => {
        expect(press.preventDefault).toHaveBeenCalledOnce();
        expect(storedLabel()).toBe('Sharper idea');
        expect(useCanvasStore.getState().editingNodeId).toBeNull();
        expect(labelledSignal()).toBe(true);
      });
    });

    describe('WHEN Shift+Enter is pressed', () => {
      let press: KeyboardEvent<HTMLTextAreaElement>;

      beforeEach(() => {
        press = keyWith('Enter', 'Two\nlines', true);
        act(() => editor.current.handleLabelKeyDown(press));
      });

      test('THEN the new line is kept and editing continues', () => {
        expect(press.preventDefault).not.toHaveBeenCalled();
        expect(storedLabel()).toBe('Idea');
        expect(useCanvasStore.getState().editingNodeId).toBe('n1');
      });
    });

    describe('WHEN Escape is pressed', () => {
      beforeEach(() => {
        act(() => editor.current.handleLabelKeyDown(keyWith('Escape', 'Discarded')));
      });

      test('THEN editing ends without saving the draft', () => {
        expect(storedLabel()).toBe('Idea');
        expect(useCanvasStore.getState().editingNodeId).toBeNull();
        expect(labelledSignal()).toBe(false);
      });
    });

    describe('WHEN another key is pressed', () => {
      beforeEach(() => {
        act(() => editor.current.handleLabelKeyDown(keyWith('a', 'Ideaa')));
      });

      test('THEN editing continues untouched', () => {
        expect(storedLabel()).toBe('Idea');
        expect(useCanvasStore.getState().editingNodeId).toBe('n1');
      });
    });
  });
});
