import { act, renderHook } from '@testing-library/react';
import type { FocusEvent, KeyboardEvent } from 'react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { THREAD_ID, canvasNode } from '@mocks/canvas';
import { EDIT_ACCESS } from '@mocks/roles';
import { useLabelEditing } from '@/components/Canvas/hooks';
import { subscribeCanvasOperations } from '@/lib/canvas';
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

const onOperation = vi.fn();

const unsubscribers: Array<() => void> = [];

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
  unsubscribers.splice(0).forEach((unsubscribe) => unsubscribe());
  useOnboardingStore.getState().forget();
  useCanvasStore.getState().clearCanvas();
  usePermissionsStore.getState().clearAccess();
});

describe('useLabelEditing', () => {
  describe('GIVEN an editor opened on a node that is not measured yet', () => {
    let textarea: HTMLTextAreaElement;
    let rerenderEditor: (props: { measured: boolean }) => void;

    beforeEach(() => {
      textarea = document.createElement('textarea');
      textarea.value = 'Idea';
      document.body.append(textarea);

      const view = renderHook(({ measured }) => useLabelEditing({ id: 'n1', label: 'Idea', measured }), {
        initialProps: { measured: false },
      });

      view.result.current.inputRef.current = textarea;
      rerenderEditor = view.rerender;
    });

    afterEach(() => {
      textarea.remove();
    });

    describe('WHEN the node is measured', () => {
      beforeEach(() => {
        rerenderEditor({ measured: true });
      });

      test('THEN the textarea takes focus with the caret after the text', () => {
        expect(textarea).toHaveFocus();
        expect(textarea.selectionStart).toBe(4);
        expect(textarea.selectionEnd).toBe(4);
      });
    });

    describe('WHEN the node is measured while the user is typing in another field', () => {
      let renameInput: HTMLInputElement;

      beforeEach(() => {
        renameInput = document.createElement('input');
        document.body.append(renameInput);
        renameInput.focus();
        rerenderEditor({ measured: true });
      });

      afterEach(() => {
        renameInput.remove();
      });

      test('THEN the other field keeps its focus', () => {
        expect(renameInput).toHaveFocus();
        expect(textarea).not.toHaveFocus();
      });
    });
  });

  describe('GIVEN a node label being edited while a guide is running', () => {
    beforeEach(() => {
      editor = renderHook(() =>
        useLabelEditing({ id: 'n1', label: 'Idea', measured: true, signalLabelled: true }),
      ).result;
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

    describe('WHEN the textarea blurs with the unchanged label', () => {
      beforeEach(() => {
        unsubscribers.push(subscribeCanvasOperations(onOperation));
        act(() => editor.current.handleLabelBlur(blurWith('Idea')));
      });

      test('THEN editing ends without writing the label again', () => {
        expect(useCanvasStore.getState().editingNodeId).toBeNull();
        expect(onOperation).not.toHaveBeenCalled();
        expect(labelledSignal()).toBe(false);
      });
    });
  });

  describe('GIVEN a label edited by a node that does not report to the guide', () => {
    beforeEach(() => {
      editor = renderHook(() => useLabelEditing({ id: 'n1', label: 'Idea', measured: true })).result;
    });

    describe('WHEN a new label is committed', () => {
      beforeEach(() => {
        act(() => editor.current.handleLabelBlur(blurWith('Question text')));
      });

      test('THEN the label is saved without the labelled signal', () => {
        expect(storedLabel()).toBe('Question text');
        expect(labelledSignal()).toBe(false);
      });
    });
  });
});
