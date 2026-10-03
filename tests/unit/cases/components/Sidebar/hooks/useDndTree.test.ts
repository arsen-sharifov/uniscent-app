import type { CollisionDetection } from '@dnd-kit/core';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import type { TNavItem } from '@interfaces';

import { domRect } from '@mocks/browser';
import { dragEndEvent, dragMoveEvent, dragStartEvent } from '@mocks/dnd';
import { folderItem, threadItem } from '@mocks/sidebar';
import { AUTO_EXPAND_DELAY_MS } from '@/components/Sidebar/consts';
import { useDndTree } from '@/components/Sidebar/hooks';

const ROW_HEIGHT = 32;

const onMoveItem = vi.fn();
const onBulkMove = vi.fn();

const TREE: TNavItem[] = [folderItem('f1', [threadItem('t1'), threadItem('t2')]), threadItem('t3'), threadItem('t4')];

const BULK_TREE: TNavItem[] = [
  folderItem('f1', [threadItem('t1')]),
  folderItem('f2', [threadItem('t2')]),
  threadItem('t3'),
];

const DEEP_TREE: TNavItem[] = [
  folderItem('f1', [threadItem('t1')]),
  folderItem('fD', [folderItem('fE')]),
  threadItem('t3'),
  threadItem('t4'),
];

const DEEP_LAST_TREE: TNavItem[] = [folderItem('fD', [folderItem('fE')]), folderItem('f1', [threadItem('t1')])];

const FLAT_TREE: TNavItem[] = [
  threadItem('t1'),
  threadItem('t2'),
  threadItem('t3'),
  threadItem('t4'),
  threadItem('t5'),
];

const BULK_SELECTED = new Set(['f1', 'f2']);
const SIDE_SELECTED = new Set(['t2', 't3']);
const SPREAD_SELECTED = new Set(['t2', 't4']);

const rowY = (index: number, ratio: number): number => (index + ratio) * ROW_HEIGHT;

const rowsElement = (ids: string[]): HTMLElement => {
  const host = document.createElement('div');
  ids.forEach((id, index) => {
    const row = document.createElement('div');
    row.dataset.itemId = id;
    vi.spyOn(row, 'getBoundingClientRect').mockReturnValue(
      domRect({ top: index * ROW_HEIGHT, bottom: (index + 1) * ROW_HEIGHT, height: ROW_HEIGHT }),
    );
    host.append(row);
  });

  return host;
};

const clientRect = (top: number, height: number) => ({
  top,
  bottom: top + height,
  left: 0,
  right: 200,
  width: 200,
  height,
});

const ROW_RECTS = { a: clientRect(0, 32), b: clientRect(40, 32) };
const GAP_POINTER = { x: 100, y: 36 };

const collisionArgs = (
  pointer: { x: number; y: number },
  rects: Record<string, ReturnType<typeof clientRect>>,
  collisionTop = 0,
): Parameters<CollisionDetection>[0] =>
  ({
    active: { id: 'active' },
    collisionRect: clientRect(collisionTop, ROW_HEIGHT),
    droppableRects: new Map(Object.entries(rects)),
    droppableContainers: Object.keys(rects).map((id) => ({ id })),
    pointerCoordinates: pointer,
  }) as never;

let dnd: { current: ReturnType<typeof useDndTree> };
let rows: HTMLElement | undefined;

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  rows?.remove();
  rows = undefined;
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('useDndTree', () => {
  describe('GIVEN a nested tree at rest', () => {
    beforeEach(() => {
      dnd = renderHook(() => useDndTree({ items: TREE, onMoveItem, onBulkMove })).result;
    });

    describe('WHEN the hook renders', () => {
      test('THEN the tree flattens in order with depths', () => {
        expect(dnd.current.sortedIds).toEqual(['f1', 't1', 't2', 't3', 't4']);
        expect(dnd.current.flattenedItems.map((item) => item.depth)).toEqual([0, 1, 1, 0, 0]);
        expect(dnd.current.flattenedItems.map((item) => item.parentId)).toEqual([null, 'f1', 'f1', null, null]);
      });

      test('THEN no drag state is active', () => {
        expect(dnd.current.activeId).toBeNull();
        expect(dnd.current.overId).toBeNull();
        expect(dnd.current.projected).toBeNull();
        expect(dnd.current.isPastLast).toBe(false);
      });
    });

    describe('WHEN a folder collapses', () => {
      beforeEach(() => {
        act(() => dnd.current.toggleCollapse('f1'));
      });

      test('THEN its children leave the list and the row keeps the child count', () => {
        expect(dnd.current.sortedIds).toEqual(['f1', 't3', 't4']);
        expect(dnd.current.flattenedItems[0]).toMatchObject({ collapsed: true, childCount: 2 });
      });
    });

    describe('WHEN a folder collapses and expands again', () => {
      beforeEach(() => {
        act(() => dnd.current.toggleCollapse('f1'));
        act(() => dnd.current.toggleCollapse('f1'));
      });

      test('THEN the children rejoin the list', () => {
        expect(dnd.current.sortedIds).toEqual(['f1', 't1', 't2', 't3', 't4']);
        expect(dnd.current.flattenedItems[0]).toMatchObject({ collapsed: false, childCount: 2 });
      });
    });

    describe('WHEN a collapsed folder expands for a drop', () => {
      beforeEach(() => {
        act(() => dnd.current.toggleCollapse('f1'));
        act(() => dnd.current.expandForDrop('f1'));
      });

      test('THEN the folder reopens', () => {
        expect(dnd.current.sortedIds).toEqual(['f1', 't1', 't2', 't3', 't4']);
      });
    });
  });

  describe('GIVEN an inline edit in progress', () => {
    beforeEach(() => {
      dnd = renderHook(() => useDndTree({ items: TREE, onMoveItem, onBulkMove, editingId: 't1' })).result;
    });

    describe('WHEN a drag starts on a row', () => {
      beforeEach(() => {
        act(() => dnd.current.handleDragStart(dragStartEvent('t3')));
      });

      test('THEN the drag is ignored', () => {
        expect(dnd.current.activeId).toBeNull();
        expect(dnd.current.overId).toBeNull();
      });
    });
  });

  describe('GIVEN a root thread dragged with the keyboard', () => {
    beforeEach(() => {
      dnd = renderHook(() => useDndTree({ items: TREE, onMoveItem, onBulkMove })).result;
      act(() => dnd.current.handleDragStart(dragStartEvent('t4')));
    });

    describe('WHEN it steps up onto the thread above and drops', () => {
      beforeEach(() => {
        act(() => dnd.current.handleDragMove(dragMoveEvent('t3')));
        act(() => dnd.current.handleDragEnd(dragEndEvent('t4', 't3')));
      });

      test('THEN it lands before that thread', () => {
        expect(onMoveItem).toHaveBeenCalledExactlyOnceWith('t4', null, 1);
      });
    });

    describe('WHEN it steps back down onto its own slot', () => {
      beforeEach(() => {
        act(() => dnd.current.handleDragMove(dragMoveEvent('t3')));
        act(() => dnd.current.handleDragMove(dragMoveEvent('t4')));
      });

      test('THEN no drop is projected', () => {
        expect(dnd.current.projected).toBeNull();
      });
    });
  });

  describe('GIVEN a folder holding a subfolder dragged across the tree', () => {
    beforeEach(() => {
      dnd = renderHook(() => useDndTree({ items: DEEP_TREE, onMoveItem, onBulkMove })).result;
      rows = rowsElement(['f1', 't1', 'fD', 't3', 't4']);
      document.body.append(rows);
      act(() => dnd.current.handleDragStart(dragStartEvent('fD')));
    });

    describe('WHEN it hovers beside a thread nested in another folder', () => {
      beforeEach(() => {
        act(() => dnd.current.handleDragMove(dragMoveEvent('t1', rowY(1, 0.8))));
      });

      test('THEN no drop is projected because its subtree would exceed the depth limit', () => {
        expect(dnd.current.projected).toBeNull();
      });
    });

    describe('WHEN it is dropped there', () => {
      beforeEach(() => {
        act(() => dnd.current.handleDragMove(dragMoveEvent('t1', rowY(1, 0.8))));
        act(() => dnd.current.handleDragEnd(dragEndEvent('fD', 't1')));
      });

      test('THEN nothing moves', () => {
        expect(onMoveItem).not.toHaveBeenCalled();
      });
    });

    describe('WHEN it is dropped on the body of another root folder', () => {
      beforeEach(() => {
        act(() => dnd.current.handleDragMove(dragMoveEvent('f1', rowY(0, 0.6))));
        act(() => dnd.current.handleDragEnd(dragEndEvent('fD', 'f1')));
      });

      test('THEN it stays at the root, placed before that folder', () => {
        expect(onMoveItem).toHaveBeenCalledExactlyOnceWith('fD', null, 0);
      });
    });
  });

  describe('GIVEN a folder holding a subfolder above a folder that ends the tree', () => {
    beforeEach(() => {
      dnd = renderHook(() => useDndTree({ items: DEEP_LAST_TREE, onMoveItem, onBulkMove })).result;
      rows = rowsElement(['fD', 'f1', 't1']);
      document.body.append(rows);
      act(() => dnd.current.handleDragStart(dragStartEvent('fD')));
    });

    describe('WHEN it is dropped below the last nested row', () => {
      beforeEach(() => {
        act(() => dnd.current.handleDragMove(dragMoveEvent('t1', 200)));
        act(() => dnd.current.handleDragEnd(dragEndEvent('fD', 't1')));
      });

      test('THEN it still moves to the end of the root', () => {
        expect(onMoveItem).toHaveBeenCalledExactlyOnceWith('fD', null, 1);
      });
    });
  });

  describe('GIVEN the nested thread that ends the tree dragged down past its own row', () => {
    beforeEach(() => {
      dnd = renderHook(() => useDndTree({ items: DEEP_LAST_TREE, onMoveItem, onBulkMove })).result;
      rows = rowsElement(['fD', 'fE', 'f1', 't1']);
      document.body.append(rows);
      act(() => dnd.current.handleDragStart(dragStartEvent('t1')));
      act(() => dnd.current.handleDragMove(dragMoveEvent('t1', 200)));
    });

    describe('WHEN it is dropped there', () => {
      beforeEach(() => {
        act(() => dnd.current.handleDragEnd(dragEndEvent('t1', 't1')));
      });

      test('THEN it leaves the folder for the end of the root', () => {
        expect(onMoveItem).toHaveBeenCalledExactlyOnceWith('t1', null, 2);
      });
    });
  });

  describe('GIVEN a thread dragged together with a selected folder holding a subfolder', () => {
    beforeEach(() => {
      dnd = renderHook(() =>
        useDndTree({ items: DEEP_TREE, onMoveItem, onBulkMove, selectedIds: new Set(['t3', 'fD']) }),
      ).result;
      rows = rowsElement(['f1', 't1', 'fD', 't3', 't4']);
      document.body.append(rows);
      act(() => dnd.current.handleDragStart(dragStartEvent('t3')));
    });

    describe('WHEN the pair is dropped beside a nested thread', () => {
      beforeEach(() => {
        act(() => dnd.current.handleDragMove(dragMoveEvent('t1', rowY(1, 0.8))));
        act(() => dnd.current.handleDragEnd(dragEndEvent('t3', 't1')));
      });

      test('THEN the deepest selected subtree blocks the drop', () => {
        expect(dnd.current.projected).toBeNull();
        expect(onBulkMove).not.toHaveBeenCalled();
      });
    });

    describe('WHEN the pair is dropped at the top of the root', () => {
      beforeEach(() => {
        act(() => dnd.current.handleDragMove(dragMoveEvent('f1', rowY(0, 0.1))));
        act(() => dnd.current.handleDragEnd(dragEndEvent('t3', 'f1')));
      });

      test('THEN the whole selection moves in one bulk call', () => {
        expect(onBulkMove).toHaveBeenCalledExactlyOnceWith(new Set(['t3', 'fD']), null, 0);
      });
    });
  });

  describe('GIVEN a folder dragged across the tree', () => {
    beforeEach(() => {
      dnd = renderHook(() => useDndTree({ items: TREE, onMoveItem, onBulkMove })).result;
      rows = rowsElement(['f1', 't3', 't4']);
      document.body.append(rows);
    });

    describe('WHEN the drag starts on the expanded folder', () => {
      beforeEach(() => {
        act(() => dnd.current.handleDragStart(dragStartEvent('f1')));
      });

      test('THEN the folder collapses out of the sortable list', () => {
        expect(dnd.current.activeId).toBe('f1');
        expect(dnd.current.sortedIds).toEqual(['f1', 't3', 't4']);
      });
    });

    describe('WHEN the drag ends over nothing', () => {
      beforeEach(() => {
        act(() => dnd.current.handleDragStart(dragStartEvent('f1')));
        act(() => dnd.current.handleDragEnd(dragEndEvent('f1', null)));
      });

      test('THEN no move fires and the collapse rolls back', () => {
        expect(onMoveItem).not.toHaveBeenCalled();
        expect(onBulkMove).not.toHaveBeenCalled();
        expect(dnd.current.activeId).toBeNull();
        expect(dnd.current.sortedIds).toEqual(['f1', 't1', 't2', 't3', 't4']);
      });
    });

    describe('WHEN the drag cancels', () => {
      beforeEach(() => {
        act(() => dnd.current.handleDragStart(dragStartEvent('f1')));
        act(() => dnd.current.handleDragCancel());
      });

      test('THEN the drag state resets and the folder reopens', () => {
        expect(onMoveItem).not.toHaveBeenCalled();
        expect(dnd.current.activeId).toBeNull();
        expect(dnd.current.sortedIds).toEqual(['f1', 't1', 't2', 't3', 't4']);
      });
    });

    describe('WHEN the drag ends back on its own row', () => {
      beforeEach(() => {
        act(() => dnd.current.handleDragStart(dragStartEvent('f1')));
        act(() => dnd.current.handleDragEnd(dragEndEvent('f1', 'f1')));
      });

      test('THEN the move is skipped and the folder reopens', () => {
        expect(onMoveItem).not.toHaveBeenCalled();
        expect(dnd.current.sortedIds).toEqual(['f1', 't1', 't2', 't3', 't4']);
      });
    });

    describe('WHEN the folder drops under the first root thread', () => {
      beforeEach(() => {
        act(() => dnd.current.handleDragStart(dragStartEvent('f1')));
        act(() => dnd.current.handleDragMove(dragMoveEvent('t3', rowY(1, 0.8))));
        act(() => dnd.current.handleDragEnd(dragEndEvent('f1', 't3')));
      });

      test('THEN the folder moves after the thread at the root', () => {
        expect(onMoveItem).toHaveBeenCalledExactlyOnceWith('f1', null, 1);
      });

      test('THEN the drag state resets and the folder reopens after the drop', () => {
        expect(dnd.current.activeId).toBeNull();
        expect(dnd.current.projected).toBeNull();
        expect(dnd.current.sortedIds).toEqual(['f1', 't1', 't2', 't3', 't4']);
      });
    });
  });

  describe('GIVEN a thread dragged out of its folder', () => {
    beforeEach(() => {
      dnd = renderHook(() => useDndTree({ items: TREE, onMoveItem, onBulkMove })).result;
      rows = rowsElement(['f1', 't1', 't2', 't3', 't4']);
      document.body.append(rows);
      act(() => dnd.current.handleDragStart(dragStartEvent('t1')));
    });

    describe('WHEN the pointer enters the upper half of a lower row', () => {
      beforeEach(() => {
        act(() => dnd.current.handleDragMove(dragMoveEvent('t3', rowY(3, 0.2))));
      });

      test('THEN the projection targets the root slot before that row', () => {
        expect(dnd.current.overId).toBe('t3');
        expect(dnd.current.projected).toEqual({ depth: 0, parentId: null, zone: 'before' });
      });
    });

    describe('WHEN the pointer enters the lower half of a lower row', () => {
      beforeEach(() => {
        act(() => dnd.current.handleDragMove(dragMoveEvent('t3', rowY(3, 0.8))));
      });

      test('THEN the projection targets the root slot after that row', () => {
        expect(dnd.current.projected).toEqual({ depth: 0, parentId: null, zone: 'after' });
      });
    });

    describe('WHEN the pointer drifts just past the split on the same row', () => {
      beforeEach(() => {
        act(() => dnd.current.handleDragMove(dragMoveEvent('t3', rowY(3, 0.45))));
        act(() => dnd.current.handleDragMove(dragMoveEvent('t3', rowY(3, 0.55))));
      });

      test('THEN the zone holds through the hysteresis buffer', () => {
        expect(dnd.current.projected).toEqual({ depth: 0, parentId: null, zone: 'before' });
      });
    });

    describe('WHEN the pointer clears the hysteresis buffer on the same row', () => {
      beforeEach(() => {
        act(() => dnd.current.handleDragMove(dragMoveEvent('t3', rowY(3, 0.45))));
        act(() => dnd.current.handleDragMove(dragMoveEvent('t3', rowY(3, 0.72))));
      });

      test('THEN the zone flips to after', () => {
        expect(dnd.current.projected).toEqual({ depth: 0, parentId: null, zone: 'after' });
      });
    });

    describe('WHEN the pointer jumps to a fresh row past the split', () => {
      beforeEach(() => {
        act(() => dnd.current.handleDragMove(dragMoveEvent('t3', rowY(3, 0.45))));
        act(() => dnd.current.handleDragMove(dragMoveEvent('t4', rowY(4, 0.55))));
      });

      test('THEN the fresh row splits without the buffer', () => {
        expect(dnd.current.overId).toBe('t4');
        expect(dnd.current.projected).toEqual({ depth: 0, parentId: null, zone: 'after' });
      });
    });

    describe('WHEN the drag moves without a pointer position', () => {
      beforeEach(() => {
        act(() => dnd.current.handleDragMove(dragMoveEvent('t3')));
      });

      test('THEN the over row updates and the zone stays at its default', () => {
        expect(dnd.current.overId).toBe('t3');
        expect(dnd.current.projected).toEqual({ depth: 0, parentId: null, zone: 'after' });
      });
    });

    describe('WHEN the pointer sinks below the last row', () => {
      beforeEach(() => {
        act(() => dnd.current.handleDragMove(dragMoveEvent('t4', 200)));
      });

      test('THEN the drop retargets the root tail', () => {
        expect(dnd.current.isPastLast).toBe(true);
        expect(dnd.current.projected).toEqual({ depth: 0, parentId: null, zone: 'after' });
      });
    });

    describe('WHEN the pointer leaves every row', () => {
      beforeEach(() => {
        act(() => dnd.current.handleDragMove(dragMoveEvent('t3', rowY(3, 0.45))));
        act(() => dnd.current.handleDragMove(dragMoveEvent(null)));
      });

      test('THEN the over state and the projection clear', () => {
        expect(dnd.current.overId).toBeNull();
        expect(dnd.current.projected).toBeNull();
      });
    });

    describe('WHEN the drop lands in the upper half of a lower row', () => {
      beforeEach(() => {
        act(() => dnd.current.handleDragMove(dragMoveEvent('t3', rowY(3, 0.2))));
        act(() => dnd.current.handleDragEnd(dragEndEvent('t1', 't3')));
      });

      test('THEN the thread moves to the root before that row', () => {
        expect(onMoveItem).toHaveBeenCalledExactlyOnceWith('t1', null, 1);
      });
    });

    describe('WHEN the drop lands below the last row', () => {
      beforeEach(() => {
        act(() => dnd.current.handleDragMove(dragMoveEvent('t4', 200)));
        act(() => dnd.current.handleDragEnd(dragEndEvent('t1', 't4')));
      });

      test('THEN the thread moves to the end of the root', () => {
        expect(onMoveItem).toHaveBeenCalledExactlyOnceWith('t1', null, 3);
      });
    });
  });

  describe('GIVEN a thread dragged over folder rows', () => {
    beforeEach(() => {
      dnd = renderHook(() => useDndTree({ items: TREE, onMoveItem, onBulkMove })).result;
      rows = rowsElement(['f1', 't1', 't2', 't3', 't4']);
      document.body.append(rows);
      act(() => dnd.current.handleDragStart(dragStartEvent('t3')));
    });

    describe('WHEN the pointer skims the top edge of the folder', () => {
      beforeEach(() => {
        act(() => dnd.current.handleDragMove(dragMoveEvent('f1', rowY(0, 0.2))));
      });

      test('THEN the projection stays at the root before the folder', () => {
        expect(dnd.current.projected).toEqual({ depth: 0, parentId: null, zone: 'before' });
      });
    });

    describe('WHEN the pointer rests on the folder body', () => {
      beforeEach(() => {
        act(() => dnd.current.handleDragMove(dragMoveEvent('f1', rowY(0, 0.5))));
      });

      test('THEN the projection dives inside the folder', () => {
        expect(dnd.current.projected).toEqual({ depth: 1, parentId: 'f1', zone: 'inside' });
      });
    });

    describe('WHEN the pointer lifts back toward the folder edge within the buffer', () => {
      beforeEach(() => {
        act(() => dnd.current.handleDragMove(dragMoveEvent('f1', rowY(0, 0.3))));
        act(() => dnd.current.handleDragMove(dragMoveEvent('f1', rowY(0, 0.2))));
      });

      test('THEN the zone holds inside', () => {
        expect(dnd.current.projected).toEqual({ depth: 1, parentId: 'f1', zone: 'inside' });
      });
    });

    describe('WHEN the pointer clears the folder buffer', () => {
      beforeEach(() => {
        act(() => dnd.current.handleDragMove(dragMoveEvent('f1', rowY(0, 0.3))));
        act(() => dnd.current.handleDragMove(dragMoveEvent('f1', rowY(0, 0.03))));
      });

      test('THEN the zone flips back to before', () => {
        expect(dnd.current.projected).toEqual({ depth: 0, parentId: null, zone: 'before' });
      });
    });

    describe('WHEN the drop lands on the folder body', () => {
      beforeEach(() => {
        act(() => dnd.current.handleDragMove(dragMoveEvent('f1', rowY(0, 0.5))));
        act(() => dnd.current.handleDragEnd(dragEndEvent('t3', 'f1')));
      });

      test('THEN the thread moves into the folder at the first slot', () => {
        expect(onMoveItem).toHaveBeenCalledExactlyOnceWith('t3', 'f1', 0);
      });
    });

    describe('WHEN the drop lands below the first child inside the folder', () => {
      beforeEach(() => {
        act(() => dnd.current.handleDragMove(dragMoveEvent('t1', rowY(1, 0.8))));
        act(() => dnd.current.handleDragEnd(dragEndEvent('t3', 't1')));
      });

      test('THEN the thread moves into the folder after that child', () => {
        expect(onMoveItem).toHaveBeenCalledExactlyOnceWith('t3', 'f1', 1);
      });
    });

    describe('WHEN the pointer hovers a slot that equals its current position', () => {
      beforeEach(() => {
        act(() => dnd.current.handleDragMove(dragMoveEvent('t4', rowY(4, 0.2))));
      });

      test('THEN the projection collapses to null', () => {
        expect(dnd.current.overId).toBe('t4');
        expect(dnd.current.projected).toBeNull();
      });
    });

    describe('WHEN the drop lands in a no-op slot', () => {
      beforeEach(() => {
        act(() => dnd.current.handleDragMove(dragMoveEvent('t4', rowY(4, 0.2))));
        act(() => dnd.current.handleDragEnd(dragEndEvent('t3', 't4')));
      });

      test('THEN no move fires', () => {
        expect(onMoveItem).not.toHaveBeenCalled();
        expect(onBulkMove).not.toHaveBeenCalled();
      });
    });
  });

  describe('GIVEN a thread dragged over a collapsed folder', () => {
    beforeEach(() => {
      dnd = renderHook(() => useDndTree({ items: TREE, onMoveItem, onBulkMove })).result;
      act(() => dnd.current.toggleCollapse('f1'));
      rows = rowsElement(['f1', 't3', 't4']);
      document.body.append(rows);
      act(() => dnd.current.handleDragStart(dragStartEvent('t4')));
    });

    describe('WHEN the pointer parks on the collapsed folder body', () => {
      beforeEach(() => {
        act(() => dnd.current.handleDragMove(dragMoveEvent('f1', rowY(0, 0.5))));
        act(() => {
          vi.advanceTimersByTime(AUTO_EXPAND_DELAY_MS);
        });
      });

      test('THEN the folder auto expands after the delay', () => {
        expect(dnd.current.sortedIds).toEqual(['f1', 't1', 't2', 't3', 't4']);
      });
    });

    describe('WHEN the pointer leaves the folder before the delay', () => {
      beforeEach(() => {
        act(() => dnd.current.handleDragMove(dragMoveEvent('f1', rowY(0, 0.5))));
        act(() => dnd.current.handleDragMove(dragMoveEvent('t3', rowY(1, 0.2))));
        act(() => {
          vi.advanceTimersByTime(AUTO_EXPAND_DELAY_MS);
        });
      });

      test('THEN the folder stays collapsed', () => {
        expect(dnd.current.sortedIds).toEqual(['f1', 't3', 't4']);
      });
    });

    describe('WHEN the pointer skims only the folder top edge', () => {
      beforeEach(() => {
        act(() => dnd.current.handleDragMove(dragMoveEvent('f1', rowY(0, 0.1))));
        act(() => {
          vi.advanceTimersByTime(AUTO_EXPAND_DELAY_MS);
        });
      });

      test('THEN no auto expand arms', () => {
        expect(dnd.current.sortedIds).toEqual(['f1', 't3', 't4']);
      });
    });

    describe('WHEN the pointer keeps hovering the same folder across moves', () => {
      beforeEach(() => {
        act(() => dnd.current.handleDragMove(dragMoveEvent('f1', rowY(0, 0.5))));
        act(() => {
          vi.advanceTimersByTime(300);
        });
        act(() => dnd.current.handleDragMove(dragMoveEvent('f1', rowY(0, 0.45))));
        act(() => {
          vi.advanceTimersByTime(AUTO_EXPAND_DELAY_MS - 300);
        });
      });

      test('THEN the original deadline still fires', () => {
        expect(dnd.current.sortedIds).toEqual(['f1', 't1', 't2', 't3', 't4']);
      });
    });

    describe('WHEN the drop lands before the folder unfolds', () => {
      beforeEach(() => {
        act(() => dnd.current.handleDragMove(dragMoveEvent('f1', rowY(0, 0.5))));
        act(() => dnd.current.handleDragEnd(dragEndEvent('t4', 'f1')));
      });

      test('THEN the thread moves into the still collapsed folder', () => {
        expect(onMoveItem).toHaveBeenCalledExactlyOnceWith('t4', 'f1', 0);
        expect(dnd.current.sortedIds).toEqual(['f1', 't3', 't4']);
      });
    });
  });

  describe('GIVEN a bulk drag of a multi selection', () => {
    beforeEach(() => {
      dnd = renderHook(() =>
        useDndTree({ items: BULK_TREE, onMoveItem, onBulkMove, selectedIds: BULK_SELECTED }),
      ).result;
      rows = rowsElement(['f1', 'f2', 't3']);
      document.body.append(rows);
    });

    describe('WHEN the drag starts on a selected folder', () => {
      beforeEach(() => {
        act(() => dnd.current.handleDragStart(dragStartEvent('f1')));
      });

      test('THEN children of every selected folder leave the list', () => {
        expect(dnd.current.sortedIds).toEqual(['f1', 'f2', 't3']);
      });
    });

    describe('WHEN the drop lands below the last root thread', () => {
      beforeEach(() => {
        act(() => dnd.current.handleDragStart(dragStartEvent('f1')));
        act(() => dnd.current.handleDragMove(dragMoveEvent('t3', rowY(2, 0.8))));
        act(() => dnd.current.handleDragEnd(dragEndEvent('f1', 't3')));
      });

      test('THEN the whole selection moves in one bulk call to the end of the rows that stay', () => {
        expect(onBulkMove).toHaveBeenCalledExactlyOnceWith(new Set(['f1', 'f2']), null, 1);
        expect(onMoveItem).not.toHaveBeenCalled();
      });

      test('THEN the collapse rolls back after the bulk drop', () => {
        expect(dnd.current.sortedIds).toEqual(['f1', 't1', 'f2', 't2', 't3']);
      });
    });
  });

  describe('GIVEN a bulk drag whose other selected row sits above the drop slot', () => {
    beforeEach(() => {
      dnd = renderHook(() =>
        useDndTree({ items: FLAT_TREE, onMoveItem, onBulkMove, selectedIds: SPREAD_SELECTED }),
      ).result;
      rows = rowsElement(['t1', 't2', 't3', 't4', 't5']);
      document.body.append(rows);
      act(() => dnd.current.handleDragStart(dragStartEvent('t4')));
    });

    describe('WHEN the drop lands before the row between them', () => {
      beforeEach(() => {
        act(() => dnd.current.handleDragMove(dragMoveEvent('t3', rowY(2, 0.2))));
        act(() => dnd.current.handleDragEnd(dragEndEvent('t4', 't3')));
      });

      test('THEN the slot is counted among the rows that stay', () => {
        expect(onBulkMove).toHaveBeenCalledExactlyOnceWith(SPREAD_SELECTED, null, 1);
      });
    });

    describe('WHEN the drop lands back on the dragged row own slot', () => {
      beforeEach(() => {
        act(() => dnd.current.handleDragMove(dragMoveEvent('t3', rowY(2, 0.8))));
      });

      test('THEN the slot stays a target because the other selected row moves there too', () => {
        expect(dnd.current.projected).toEqual({ depth: 0, parentId: null, zone: 'after' });
      });
    });

    describe('WHEN the drop on the dragged row own slot ends', () => {
      beforeEach(() => {
        act(() => dnd.current.handleDragMove(dragMoveEvent('t3', rowY(2, 0.8))));
        act(() => dnd.current.handleDragEnd(dragEndEvent('t4', 't3')));
      });

      test('THEN the selection gathers at that slot among the rows that stay', () => {
        expect(onBulkMove).toHaveBeenCalledExactlyOnceWith(SPREAD_SELECTED, null, 2);
      });
    });
  });

  describe('GIVEN a multi selection that skips the dragged row', () => {
    beforeEach(() => {
      dnd = renderHook(() =>
        useDndTree({ items: BULK_TREE, onMoveItem, onBulkMove, selectedIds: SIDE_SELECTED }),
      ).result;
      rows = rowsElement(['f1', 'f2', 't2', 't3']);
      document.body.append(rows);
    });

    describe('WHEN the drag starts on the unselected folder', () => {
      beforeEach(() => {
        act(() => dnd.current.handleDragStart(dragStartEvent('f1')));
      });

      test('THEN only the dragged folder loses its children', () => {
        expect(dnd.current.sortedIds).toEqual(['f1', 'f2', 't2', 't3']);
      });
    });

    describe('WHEN the drop lands below the last root thread', () => {
      beforeEach(() => {
        act(() => dnd.current.handleDragStart(dragStartEvent('f1')));
        act(() => dnd.current.handleDragMove(dragMoveEvent('t3', rowY(3, 0.8))));
        act(() => dnd.current.handleDragEnd(dragEndEvent('f1', 't3')));
      });

      test('THEN the folder moves alone', () => {
        expect(onMoveItem).toHaveBeenCalledExactlyOnceWith('f1', null, 2);
        expect(onBulkMove).not.toHaveBeenCalled();
      });
    });
  });

  describe('GIVEN collision detection over droppable rects', () => {
    beforeEach(() => {
      dnd = renderHook(() => useDndTree({ items: TREE, onMoveItem, onBulkMove })).result;
    });

    describe('WHEN the pointer rests inside a row', () => {
      test('THEN the hovered row wins', () => {
        expect(dnd.current.collisionDetection(collisionArgs({ x: 100, y: 16 }, ROW_RECTS))).toMatchObject([
          { id: 'a' },
        ]);
      });
    });

    describe('WHEN the pointer slips into a gap after hovering a row', () => {
      beforeEach(() => {
        dnd.current.collisionDetection(collisionArgs({ x: 100, y: 16 }, ROW_RECTS));
      });

      test('THEN the last hovered row stays sticky', () => {
        expect(dnd.current.collisionDetection(collisionArgs(GAP_POINTER, ROW_RECTS))).toEqual([{ id: 'a' }]);
      });
    });

    describe('WHEN the sticky row leaves the droppable set', () => {
      beforeEach(() => {
        dnd.current.collisionDetection(collisionArgs({ x: 100, y: 16 }, ROW_RECTS));
      });

      test('THEN the nearest center takes over', () => {
        expect(dnd.current.collisionDetection(collisionArgs(GAP_POINTER, { b: clientRect(40, 32) }, 48))).toMatchObject(
          [{ id: 'b' }],
        );
      });
    });

    describe('WHEN no row was hovered yet', () => {
      test('THEN the centers rank the rows', () => {
        expect(dnd.current.collisionDetection(collisionArgs(GAP_POINTER, ROW_RECTS, 48))).toMatchObject([
          { id: 'b' },
          { id: 'a' },
        ]);
      });
    });

    describe('WHEN a new drag starts after a hover', () => {
      beforeEach(() => {
        dnd.current.collisionDetection(collisionArgs({ x: 100, y: 16 }, ROW_RECTS));
        act(() => dnd.current.handleDragStart(dragStartEvent('t3')));
      });

      test('THEN the sticky memory resets', () => {
        expect(dnd.current.collisionDetection(collisionArgs(GAP_POINTER, ROW_RECTS, 48))).toMatchObject([
          { id: 'b' },
          { id: 'a' },
        ]);
      });
    });
  });
});
