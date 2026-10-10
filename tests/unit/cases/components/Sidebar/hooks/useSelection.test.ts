import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { SELECTION_ITEMS } from '@mocks/sidebar';
import { useSelection } from '@/components/Sidebar/hooks';

const onActivate = vi.fn();

const PLAIN_CLICK = { shiftKey: false, ctrlKey: false, metaKey: false };
const CTRL_CLICK = { ...PLAIN_CLICK, ctrlKey: true };
const META_CLICK = { ...PLAIN_CLICK, metaKey: true };
const SHIFT_CLICK = { ...PLAIN_CLICK, shiftKey: true };

let selection: { current: ReturnType<typeof useSelection> };

describe('useSelection', () => {
  describe('GIVEN an empty selection', () => {
    beforeEach(() => {
      selection = renderHook(() => useSelection()).result;
    });

    describe('WHEN an item is ctrl-clicked', () => {
      beforeEach(() => {
        act(() => selection.current.selectOnClick('b', CTRL_CLICK, SELECTION_ITEMS, onActivate));
      });

      test('THEN it becomes selected without being activated', () => {
        expect(selection.current.selectedIds).toEqual(new Set(['b']));
        expect(selection.current.selectionCount).toBe(1);
        expect(onActivate).not.toHaveBeenCalled();
      });
    });

    describe('WHEN an item is ctrl-clicked twice', () => {
      beforeEach(() => {
        act(() => selection.current.selectOnClick('b', CTRL_CLICK, SELECTION_ITEMS));
        act(() => selection.current.selectOnClick('b', CTRL_CLICK, SELECTION_ITEMS));
      });

      test('THEN it is deselected', () => {
        expect(selection.current.selectedIds).toEqual(new Set());
      });
    });

    describe('WHEN two different items are ctrl-clicked', () => {
      beforeEach(() => {
        act(() => selection.current.selectOnClick('b', CTRL_CLICK, SELECTION_ITEMS));
        act(() => selection.current.selectOnClick('d', CTRL_CLICK, SELECTION_ITEMS));
      });

      test('THEN both stay selected', () => {
        expect(selection.current.selectedIds).toEqual(new Set(['b', 'd']));
        expect(selection.current.selectionCount).toBe(2);
      });
    });

    describe('WHEN an item is meta-clicked', () => {
      beforeEach(() => {
        act(() => selection.current.selectOnClick('c', META_CLICK, SELECTION_ITEMS, onActivate));
      });

      test('THEN it is toggled like a ctrl-click', () => {
        expect(selection.current.selectedIds).toEqual(new Set(['c']));
        expect(onActivate).not.toHaveBeenCalled();
      });
    });

    describe('WHEN an item is shift-clicked without an anchor', () => {
      beforeEach(() => {
        act(() => selection.current.selectOnClick('d', SHIFT_CLICK, SELECTION_ITEMS, onActivate));
      });

      test('THEN only the target is selected without being activated', () => {
        expect(selection.current.selectedIds).toEqual(new Set(['d']));
        expect(onActivate).not.toHaveBeenCalled();
      });
    });
  });

  describe('GIVEN an anchored selection', () => {
    beforeEach(() => {
      selection = renderHook(() => useSelection()).result;
      act(() => selection.current.selectOnClick('b', CTRL_CLICK, SELECTION_ITEMS));
    });

    describe('WHEN a later item is shift-clicked', () => {
      beforeEach(() => {
        act(() => selection.current.selectOnClick('d', SHIFT_CLICK, SELECTION_ITEMS, onActivate));
      });

      test('THEN the span between the anchor and the target is selected without activating it', () => {
        expect(selection.current.selectedIds).toEqual(new Set(['b', 'c', 'd']));
        expect(onActivate).not.toHaveBeenCalled();
      });
    });

    describe('WHEN an earlier item is shift-clicked', () => {
      beforeEach(() => {
        act(() => selection.current.selectOnClick('a', SHIFT_CLICK, SELECTION_ITEMS));
      });

      test('THEN the span still covers both directions', () => {
        expect(selection.current.selectedIds).toEqual(new Set(['a', 'b']));
      });
    });

    describe('WHEN the shift-click targets an id missing from the items', () => {
      beforeEach(() => {
        act(() => selection.current.selectOnClick('missing', SHIFT_CLICK, SELECTION_ITEMS));
      });

      test('THEN the selection stays unchanged', () => {
        expect(selection.current.selectedIds).toEqual(new Set(['b']));
      });
    });

    describe('WHEN the shift-click starts from an anchor missing from the items', () => {
      beforeEach(() => {
        act(() =>
          selection.current.selectOnClick(
            'd',
            SHIFT_CLICK,
            SELECTION_ITEMS.filter((item) => item.id !== 'b'),
          ),
        );
      });

      test('THEN it acts like a plain click and selects only the target', () => {
        expect(selection.current.selectedIds).toEqual(new Set(['d']));
      });
    });

    describe('WHEN a shift-click from a missing anchor is followed by another shift-click', () => {
      beforeEach(() => {
        act(() =>
          selection.current.selectOnClick(
            'd',
            SHIFT_CLICK,
            SELECTION_ITEMS.filter((item) => item.id !== 'b'),
          ),
        );
        act(() => selection.current.selectOnClick('e', SHIFT_CLICK, SELECTION_ITEMS));
      });

      test('THEN the target became the new anchor', () => {
        expect(selection.current.selectedIds).toEqual(new Set(['d', 'e']));
      });
    });

    describe('WHEN the anchor item is ctrl-clicked off before a shift-click', () => {
      beforeEach(() => {
        act(() => selection.current.selectOnClick('b', CTRL_CLICK, SELECTION_ITEMS));
        act(() => selection.current.selectOnClick('d', SHIFT_CLICK, SELECTION_ITEMS));
      });

      test('THEN the deselected item still anchors the range', () => {
        expect(selection.current.selectedIds).toEqual(new Set(['b', 'c', 'd']));
      });
    });

    describe('WHEN the selection is cleared before a shift-click', () => {
      beforeEach(() => {
        act(() => selection.current.clearSelection());
        act(() => selection.current.selectOnClick('d', SHIFT_CLICK, SELECTION_ITEMS));
      });

      test('THEN the anchor resets too', () => {
        expect(selection.current.selectedIds).toEqual(new Set(['d']));
      });
    });

    describe('WHEN another item is clicked plainly', () => {
      beforeEach(() => {
        act(() => selection.current.selectOnClick('c', PLAIN_CLICK, SELECTION_ITEMS, onActivate));
      });

      test('THEN the selection clears and the item is activated', () => {
        expect(selection.current.selectedIds).toEqual(new Set());
        expect(onActivate).toHaveBeenCalledExactlyOnceWith('c');
      });
    });

    describe('WHEN a plain click is followed by a shift-click', () => {
      beforeEach(() => {
        act(() => selection.current.selectOnClick('c', PLAIN_CLICK, SELECTION_ITEMS));
        act(() => selection.current.selectOnClick('e', SHIFT_CLICK, SELECTION_ITEMS));
      });

      test('THEN the range starts from the plainly clicked item', () => {
        expect(selection.current.selectedIds).toEqual(new Set(['c', 'd', 'e']));
      });
    });
  });

  describe('GIVEN a selection with valid ids', () => {
    let rerender: (props: { validIds: ReadonlySet<string> }) => void;

    beforeEach(() => {
      const hook = renderHook(({ validIds }) => useSelection(validIds), {
        initialProps: { validIds: new Set(['a', 'b', 'c']) as ReadonlySet<string> },
      });
      selection = hook.result;
      rerender = hook.rerender;
      act(() => selection.current.setSelectedIds(new Set(['a', 'c'])));
    });

    describe('WHEN a selected id leaves the valid ids', () => {
      beforeEach(() => {
        rerender({ validIds: new Set(['a', 'b']) });
      });

      test('THEN it is dropped from the selection', () => {
        expect(selection.current.selectedIds).toEqual(new Set(['a']));
      });
    });

    describe('WHEN the valid ids still cover the selection', () => {
      let before: Set<string>;

      beforeEach(() => {
        before = selection.current.selectedIds;
        rerender({ validIds: new Set(['a', 'c']) });
      });

      test('THEN the selection keeps its identity', () => {
        expect(selection.current.selectedIds).toBe(before);
      });
    });
  });
});
