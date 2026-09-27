import { DndContext } from '@dnd-kit/core';
import { SortableContext } from '@dnd-kit/sortable';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import type { IFlattenedItem } from '@interfaces';

import { TRANSLATIONS } from '@mocks/i18n';
import { folderItem, threadItem } from '@mocks/sidebar';
import { SortableNavItem } from '@/components/Sidebar/fragments/dnd';
import { flattenTree } from '@/components/Sidebar/utils';
import { usePermissionsStore } from '@/lib/stores';

vi.mock('@/i18n', () => import('@mocks/i18n'));

const { sidebar } = TRANSLATIONS.platform;

const onItemClick = vi.fn();
const onToggleCollapse = vi.fn();
const onCreateThread = vi.fn();
const onRequestDelete = vi.fn();
const startEditing = vi.fn();
const onDragStart = vi.fn();

const ROWS = flattenTree([folderItem('f1', [threadItem('t1')]), folderItem('f2'), threadItem('t2', true)], new Set());

const row = (id: string): IFlattenedItem => ROWS.find((item) => item.id === id) as IFlattenedItem;

const renderRow = (item: IFlattenedItem, overrides: Partial<Parameters<typeof SortableNavItem>[0]> = {}) =>
  render(
    <DndContext onDragStart={onDragStart}>
      <SortableContext items={[item.id]}>
        <SortableNavItem
          item={item}
          isActivelyDragged={false}
          isSelected={false}
          isBulkDragActive={false}
          editingId={null}
          editValue={item.name}
          setEditValue={vi.fn()}
          inputRef={vi.fn()}
          commitRename={vi.fn()}
          handleKeyDown={vi.fn()}
          startEditing={startEditing}
          onItemClick={onItemClick}
          onRequestDelete={onRequestDelete}
          onCreateThread={onCreateThread}
          onToggleCollapse={onToggleCollapse}
          dropIndicator={null}
          dropDepth={null}
          isDragActive={false}
          {...overrides}
        />
      </SortableContext>
    </DndContext>,
  );

const treeItem = () => screen.getByRole('treeitem');

const grip = () => screen.queryByRole('button', { name: sidebar.dragToReorder });

const action = (title: string) => screen.queryByTitle(title);

afterEach(() => {
  usePermissionsStore.getState().clearAccess();
});

describe('SortableNavItem', () => {
  describe('GIVEN a resolved thread row for a structure manager', () => {
    beforeEach(() => {
      usePermissionsStore.setState({ canManageStructure: true });
      renderRow(row('t2'));
    });

    describe('WHEN it renders', () => {
      test('THEN the drag grip is a native button beside the tree item rather than inside it', () => {
        expect(grip()?.tagName).toBe('BUTTON');
        expect(treeItem()).not.toContainElement(grip());
      });

      test('THEN the resolved mark shows next to the name', () => {
        expect(treeItem()).toContainElement(screen.getByLabelText(sidebar.resolved));
      });
    });

    describe('WHEN the row is clicked', () => {
      beforeEach(() => {
        fireEvent.click(treeItem());
      });

      test('THEN the thread is opened', () => {
        expect(onItemClick).toHaveBeenCalledExactlyOnceWith('t2', expect.anything());
        expect(onToggleCollapse).not.toHaveBeenCalled();
      });
    });

    describe('WHEN the grip is clicked without dragging', () => {
      beforeEach(() => {
        fireEvent.click(grip()!);
      });

      test('THEN the click still opens the thread', () => {
        expect(onItemClick).toHaveBeenCalledExactlyOnceWith('t2', expect.anything());
      });
    });

    describe('WHEN the rename action is clicked', () => {
      beforeEach(() => {
        fireEvent.click(action(sidebar.rename)!);
      });

      test('THEN rename starts without opening the thread', () => {
        expect(startEditing).toHaveBeenCalledExactlyOnceWith('t2', 'Thread t2');
        expect(onItemClick).not.toHaveBeenCalled();
      });
    });

    describe('WHEN the delete action is clicked', () => {
      beforeEach(() => {
        fireEvent.click(action(sidebar.delete)!);
      });

      test('THEN deletion is requested without opening the thread', () => {
        expect(onRequestDelete).toHaveBeenCalledExactlyOnceWith('t2', 'Thread t2', 'thread');
        expect(onItemClick).not.toHaveBeenCalled();
      });
    });
  });

  describe('GIVEN a structure manager pressing on a thread row', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      usePermissionsStore.setState({ canManageStructure: true });
      renderRow(row('t2'));
    });

    afterEach(() => {
      fireEvent.pointerUp(document);
      vi.runOnlyPendingTimers();
      vi.useRealTimers();
    });

    describe('WHEN the press lands on the grip', () => {
      beforeEach(() => {
        fireEvent.pointerDown(grip()!, { isPrimary: true, button: 0 });
      });

      test('THEN a drag starts', () => {
        expect(onDragStart).toHaveBeenCalledOnce();
      });
    });

    describe('WHEN the press lands on a row action', () => {
      beforeEach(() => {
        fireEvent.pointerDown(action(sidebar.rename)!, { isPrimary: true, button: 0 });
      });

      test('THEN no drag starts', () => {
        expect(onDragStart).not.toHaveBeenCalled();
      });
    });
  });

  describe('GIVEN an expanded folder row for a structure manager', () => {
    beforeEach(() => {
      usePermissionsStore.setState({ canManageStructure: true });
      renderRow(row('f1'));
    });

    describe('WHEN it renders', () => {
      test('THEN it reports its open state and offers a new thread inside it', () => {
        expect(treeItem()).toHaveAttribute('aria-expanded', 'true');
        expect(action(sidebar.newThread)).toBeInTheDocument();
      });
    });

    describe('WHEN the row is clicked', () => {
      beforeEach(() => {
        fireEvent.click(treeItem());
      });

      test('THEN the folder toggles instead of opening', () => {
        expect(onToggleCollapse).toHaveBeenCalledExactlyOnceWith('f1');
        expect(onItemClick).not.toHaveBeenCalled();
      });
    });

    describe('WHEN the row is clicked with a selection modifier', () => {
      beforeEach(() => {
        fireEvent.click(treeItem(), { ctrlKey: true });
      });

      test('THEN the click goes to selection instead of toggling', () => {
        expect(onItemClick).toHaveBeenCalledExactlyOnceWith('f1', expect.anything());
        expect(onToggleCollapse).not.toHaveBeenCalled();
      });
    });

    describe('WHEN the new thread action is clicked', () => {
      beforeEach(() => {
        fireEvent.click(action(sidebar.newThread)!);
      });

      test('THEN a thread is requested inside the folder without toggling it', () => {
        expect(onCreateThread).toHaveBeenCalledExactlyOnceWith('f1');
        expect(onToggleCollapse).not.toHaveBeenCalled();
      });
    });
  });

  describe('GIVEN an empty folder row', () => {
    beforeEach(() => {
      usePermissionsStore.setState({ canManageStructure: true });
      renderRow(row('f2'));
    });

    describe('WHEN the row is clicked', () => {
      beforeEach(() => {
        fireEvent.click(treeItem());
      });

      test('THEN nothing happens', () => {
        expect(onToggleCollapse).not.toHaveBeenCalled();
        expect(onItemClick).not.toHaveBeenCalled();
      });
    });
  });

  describe('GIVEN a selected resolved thread', () => {
    beforeEach(() => {
      usePermissionsStore.setState({ canManageStructure: true });
      renderRow(row('t2'), { isSelected: true });
    });

    describe('WHEN it renders', () => {
      test('THEN it is marked selected and the resolved mark steps aside', () => {
        expect(treeItem()).toHaveAttribute('aria-selected', 'true');
        expect(screen.queryByLabelText(sidebar.resolved)).not.toBeInTheDocument();
      });
    });
  });

  describe('GIVEN a folder hovered as a drop target', () => {
    beforeEach(() => {
      usePermissionsStore.setState({ canManageStructure: true });
      renderRow(row('f1'), { dropIndicator: 'inside', dropDepth: 1 });
    });

    describe('WHEN it renders', () => {
      test('THEN the row itself is ringed instead of drawing a drop line', () => {
        expect(treeItem()).toHaveClass('!ring-2');
        expect(document.querySelector('[style*="left: 26px"]')).not.toBeInTheDocument();
      });
    });
  });

  describe('GIVEN a thread with a drop slot projected before it', () => {
    beforeEach(() => {
      usePermissionsStore.setState({ canManageStructure: true });
      renderRow(row('t1'), { dropIndicator: 'before', dropDepth: 1 });
    });

    describe('WHEN it renders', () => {
      test('THEN a drop line marks the slot at the projected depth', () => {
        expect(document.querySelector('[style*="left: 26px"]')).toBeInTheDocument();
        expect(treeItem()).not.toHaveClass('!ring-2');
      });
    });
  });

  describe('GIVEN a viewer without structure rights', () => {
    beforeEach(() => {
      renderRow(row('t2'));
    });

    describe('WHEN it renders', () => {
      test('THEN neither the grip nor the row actions are offered', () => {
        expect(grip()).not.toBeInTheDocument();
        expect(action(sidebar.rename)).not.toBeInTheDocument();
      });
    });

    describe('WHEN the row is clicked', () => {
      beforeEach(() => {
        fireEvent.click(treeItem());
      });

      test('THEN the thread still opens', () => {
        expect(onItemClick).toHaveBeenCalledExactlyOnceWith('t2', expect.anything());
      });
    });
  });

  describe('GIVEN a row being renamed', () => {
    beforeEach(() => {
      usePermissionsStore.setState({ canManageStructure: true });
      renderRow(row('t2'), { editingId: 't2' });
    });

    describe('WHEN it renders', () => {
      test('THEN the name turns into an input and the grip and actions step away', () => {
        expect(screen.getByRole('textbox')).toHaveValue('Thread t2');
        expect(grip()).not.toBeInTheDocument();
        expect(action(sidebar.rename)).not.toBeInTheDocument();
      });
    });
  });
});
