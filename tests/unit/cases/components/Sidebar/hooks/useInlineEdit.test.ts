import { act, renderHook, type RenderHookResult } from '@testing-library/react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { afterEach, beforeEach, describe, expect, test, vi, type MockInstance } from 'vitest';

import { RENAME_ITEMS } from '@mocks/sidebar';
import { useInlineEdit } from '@/components/Sidebar/hooks';

type TEditor = ReturnType<typeof useInlineEdit>;

const onRename = vi.fn();
const onAutoEditHandled = vi.fn();

let editor: { current: TEditor };

describe('useInlineEdit', () => {
  describe('GIVEN an idle inline editor', () => {
    beforeEach(() => {
      editor = renderHook(() =>
        useInlineEdit({ items: RENAME_ITEMS, autoEditId: null, onRename, onAutoEditHandled }),
      ).result;
    });

    describe('WHEN editing starts', () => {
      beforeEach(() => {
        act(() => editor.current.startEditing('1', 'Alpha'));
      });

      test('THEN the item enters the editing state', () => {
        expect(editor.current).toMatchObject({ editingId: '1', editValue: 'Alpha' });
      });
    });

    describe('WHEN a trimmed value commits', () => {
      beforeEach(() => {
        act(() => editor.current.startEditing('1', 'Alpha'));
        act(() => editor.current.setEditValue('  Renamed  '));
        act(() => editor.current.commitRename());
      });

      test('THEN the rename fires and editing closes', () => {
        expect(onRename).toHaveBeenCalledExactlyOnceWith('1', 'Renamed');
        expect(editor.current.editingId).toBeNull();
      });
    });

    describe('WHEN an empty value commits', () => {
      beforeEach(() => {
        act(() => editor.current.startEditing('1', 'Alpha'));
        act(() => editor.current.setEditValue('   '));
        act(() => editor.current.commitRename());
      });

      test('THEN the rename is skipped and editing closes', () => {
        expect(onRename).not.toHaveBeenCalled();
        expect(editor.current.editingId).toBeNull();
      });
    });

    describe('WHEN a commit fires with nothing being edited', () => {
      beforeEach(() => {
        act(() => editor.current.commitRename());
      });

      test('THEN the rename is skipped', () => {
        expect(onRename).not.toHaveBeenCalled();
        expect(onAutoEditHandled).toHaveBeenCalledTimes(1);
      });
    });

    describe('WHEN Enter is pressed during an edit', () => {
      beforeEach(() => {
        act(() => editor.current.startEditing('1', 'Alpha'));
        act(() => editor.current.setEditValue('Alpha prime'));
        act(() => editor.current.handleKeyDown({ key: 'Enter' } as ReactKeyboardEvent));
      });

      test('THEN the edit commits', () => {
        expect(onRename).toHaveBeenCalledExactlyOnceWith('1', 'Alpha prime');
        expect(editor.current.editingId).toBeNull();
      });
    });

    describe('WHEN the edit commits with the name unchanged', () => {
      beforeEach(() => {
        act(() => editor.current.startEditing('1', 'Alpha'));
        act(() => editor.current.setEditValue(' Alpha '));
        act(() => editor.current.commitRename());
      });

      test('THEN no rename is sent and editing closes', () => {
        expect(onRename).not.toHaveBeenCalled();
        expect(editor.current.editingId).toBeNull();
        expect(onAutoEditHandled).toHaveBeenCalledTimes(1);
      });
    });

    describe('WHEN Escape is pressed during an edit', () => {
      beforeEach(() => {
        act(() => editor.current.startEditing('2', 'Beta'));
        act(() => editor.current.handleKeyDown({ key: 'Escape' } as ReactKeyboardEvent));
      });

      test('THEN the edit cancels without renaming', () => {
        expect(editor.current.editingId).toBeNull();
        expect(onRename).not.toHaveBeenCalled();
      });
    });

    describe('WHEN the edit input mounts', () => {
      let input: HTMLInputElement;
      let select: MockInstance<HTMLInputElement['select']>;

      beforeEach(() => {
        input = document.createElement('input');
        select = vi.spyOn(input, 'select');
        document.body.append(input);
        act(() => editor.current.inputRef(input));
      });

      afterEach(() => {
        input.remove();
      });

      test('THEN the input is focused with its text selected', () => {
        expect(document.activeElement).toBe(input);
        expect(select).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('GIVEN an auto edit request', () => {
    describe('WHEN the hook renders with a matching item', () => {
      beforeEach(() => {
        editor = renderHook(() => useInlineEdit({ items: RENAME_ITEMS, autoEditId: '2', onAutoEditHandled })).result;
      });

      test('THEN the item opens in the editing state', () => {
        expect(editor.current).toMatchObject({ editingId: '2', editValue: 'Beta' });
      });
    });

    describe('WHEN the auto edit commits', () => {
      beforeEach(() => {
        editor = renderHook(() => useInlineEdit({ items: RENAME_ITEMS, autoEditId: '2', onAutoEditHandled })).result;
        act(() => editor.current.commitRename());
      });

      test('THEN the handled callback fires', () => {
        expect(onAutoEditHandled).toHaveBeenCalledTimes(1);
      });
    });

    describe('WHEN the auto edited item gets a new name', () => {
      beforeEach(() => {
        editor = renderHook(() =>
          useInlineEdit({ items: RENAME_ITEMS, autoEditId: '2', onRename, onAutoEditHandled }),
        ).result;
        act(() => editor.current.setEditValue('Gamma'));
        act(() => editor.current.commitRename());
      });

      test('THEN the rename reaches the owner', () => {
        expect(onRename).toHaveBeenCalledExactlyOnceWith('2', 'Gamma');
      });
    });

    describe('WHEN the hook renders without any auto edit prop', () => {
      beforeEach(() => {
        editor = renderHook(() => useInlineEdit({ items: RENAME_ITEMS })).result;
      });

      test('THEN it settles idle instead of looping', () => {
        expect(editor.current.editingId).toBeNull();
      });
    });

    describe('WHEN the hook renders with an unknown id', () => {
      beforeEach(() => {
        editor = renderHook(() =>
          useInlineEdit({ items: RENAME_ITEMS, autoEditId: 'missing', onAutoEditHandled }),
        ).result;
      });

      test('THEN nothing enters the editing state', () => {
        expect(editor.current.editingId).toBeNull();
      });
    });

    describe('WHEN the hook renders with a custom item resolver', () => {
      beforeEach(() => {
        editor = renderHook(() =>
          useInlineEdit({ items: [], autoEditId: 'x9', findItem: (id) => ({ id, name: 'Resolved' }) }),
        ).result;
      });

      test('THEN the resolved item opens in the editing state', () => {
        expect(editor.current).toMatchObject({ editingId: 'x9', editValue: 'Resolved' });
      });
    });
  });

  describe('GIVEN a mounted editor watching for auto edit requests', () => {
    let view: RenderHookResult<TEditor, { autoEditId: string | null }>;

    beforeEach(() => {
      view = renderHook(
        ({ autoEditId }: { autoEditId: string | null }) =>
          useInlineEdit({ items: RENAME_ITEMS, autoEditId, onAutoEditHandled }),
        { initialProps: { autoEditId: null as string | null } },
      );
    });

    describe('WHEN an auto edit id arrives', () => {
      beforeEach(() => {
        view.rerender({ autoEditId: '2' });
      });

      test('THEN the item opens in the editing state', () => {
        expect(view.result.current).toMatchObject({ editingId: '2', editValue: 'Beta' });
      });
    });

    describe('WHEN the auto edit id switches to another item', () => {
      beforeEach(() => {
        view.rerender({ autoEditId: '2' });
        view.rerender({ autoEditId: '1' });
      });

      test('THEN the editing state follows the latest request', () => {
        expect(view.result.current).toMatchObject({ editingId: '1', editValue: 'Alpha' });
      });
    });

    describe('WHEN the auto edit id resets to null', () => {
      beforeEach(() => {
        view.rerender({ autoEditId: '2' });
        view.rerender({ autoEditId: null });
      });

      test('THEN the editing state is left unchanged', () => {
        expect(view.result.current).toMatchObject({ editingId: '2', editValue: 'Beta' });
      });
    });
  });
});
