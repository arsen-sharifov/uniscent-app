import { DndContext } from '@dnd-kit/core';
import { SortableContext } from '@dnd-kit/sortable';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { IWorkspaceItem } from '@interfaces';

import { TRANSLATIONS } from '@mocks/i18n';
import { workspaceItem } from '@mocks/sidebar';
import { SortableWorkspaceItem } from '@/components/Sidebar/fragments/dnd';

vi.mock('@/i18n', () => import('@mocks/i18n'));

const { common } = TRANSLATIONS;
const { sidebar } = TRANSLATIONS.platform;

const onClick = vi.fn();
const onRequestRename = vi.fn();
const onRequestDelete = vi.fn();
const onRequestSettings = vi.fn();

const renderRow = (workspace: IWorkspaceItem, overrides: Partial<Parameters<typeof SortableWorkspaceItem>[0]> = {}) =>
  render(
    <DndContext>
      <SortableContext items={[workspace.id]}>
        <SortableWorkspaceItem
          workspace={workspace}
          isActive={false}
          isSelected={false}
          isEditing={false}
          editValue={workspace.name}
          setEditValue={vi.fn()}
          inputRef={vi.fn()}
          commitRename={vi.fn()}
          handleKeyDown={vi.fn()}
          onClick={onClick}
          onRequestRename={onRequestRename}
          onRequestDelete={onRequestDelete}
          onRequestSettings={onRequestSettings}
          isDragActive={false}
          dropIndicator={null}
          {...overrides}
        />
      </SortableContext>
    </DndContext>,
  );

const rowButton = (name: string) => screen.getByText(name).closest('button') as HTMLButtonElement;

const grip = () => screen.queryByRole('button', { name: sidebar.dragToReorder });

const action = (title: string) => screen.queryByTitle(title);

describe('SortableWorkspaceItem', () => {
  describe('GIVEN a workspace the member can manage', () => {
    beforeEach(() => {
      renderRow(workspaceItem('w1'));
    });

    describe('WHEN it renders', () => {
      test('THEN the drag grip is a native button beside the row button rather than inside it', () => {
        expect(grip()?.tagName).toBe('BUTTON');
        expect(rowButton('Workspace w1')).not.toContainElement(grip());
      });
    });

    describe('WHEN the row is clicked', () => {
      beforeEach(() => {
        fireEvent.click(rowButton('Workspace w1'));
      });

      test('THEN the workspace is picked', () => {
        expect(onClick).toHaveBeenCalledExactlyOnceWith('w1', expect.anything());
      });
    });

    describe('WHEN the grip is clicked without dragging', () => {
      beforeEach(() => {
        fireEvent.click(grip()!);
      });

      test('THEN the click still picks the workspace', () => {
        expect(onClick).toHaveBeenCalledExactlyOnceWith('w1', expect.anything());
      });
    });

    describe('WHEN the settings action is clicked', () => {
      beforeEach(() => {
        fireEvent.click(action(sidebar.workspaceSettings)!);
      });

      test('THEN settings open without picking the workspace', () => {
        expect(onRequestSettings).toHaveBeenCalledExactlyOnceWith('w1');
        expect(onClick).not.toHaveBeenCalled();
      });
    });

    describe('WHEN the rename action is clicked', () => {
      beforeEach(() => {
        fireEvent.click(action(sidebar.rename)!);
      });

      test('THEN rename is requested', () => {
        expect(onRequestRename).toHaveBeenCalledExactlyOnceWith('w1', 'Workspace w1');
        expect(onClick).not.toHaveBeenCalled();
      });
    });

    describe('WHEN the delete action is clicked', () => {
      beforeEach(() => {
        fireEvent.click(action(sidebar.delete)!);
      });

      test('THEN deletion is requested', () => {
        expect(onRequestDelete).toHaveBeenCalledExactlyOnceWith('w1', 'Workspace w1');
      });
    });
  });

  describe('GIVEN a workspace the member cannot manage', () => {
    beforeEach(() => {
      renderRow(workspaceItem('w2', false));
    });

    describe('WHEN it renders', () => {
      test('THEN rename and delete explain the missing permission', () => {
        expect(screen.getAllByTitle(common.noPermission).map((button) => button.getAttribute('aria-disabled'))).toEqual(
          ['true', 'true'],
        );
        expect(action(sidebar.workspaceSettings)).not.toHaveAttribute('aria-disabled');
      });
    });

    describe('WHEN the locked actions are clicked', () => {
      beforeEach(() => {
        screen.getAllByTitle(common.noPermission).forEach((button) => fireEvent.click(button));
      });

      test('THEN nothing is requested', () => {
        expect(onRequestRename).not.toHaveBeenCalled();
        expect(onRequestDelete).not.toHaveBeenCalled();
        expect(onClick).not.toHaveBeenCalled();
      });
    });
  });

  describe('GIVEN the active selected workspace', () => {
    beforeEach(() => {
      renderRow(workspaceItem('w1'), { isActive: true, isSelected: true });
    });

    describe('WHEN it renders', () => {
      test('THEN the tour anchors mark the row and its settings action', () => {
        expect(document.querySelector('[data-tour="sidebarWorkspaceRow"]')).toHaveAttribute('data-workspace-id', 'w1');
        expect(action(sidebar.workspaceSettings)).toHaveAttribute('data-tour', 'sidebarWorkspaceRowSettings');
        expect(action(sidebar.rename)).not.toHaveAttribute('aria-disabled', 'true');
      });
    });
  });

  describe('GIVEN a workspace being renamed', () => {
    beforeEach(() => {
      renderRow(workspaceItem('w1'), { isEditing: true });
    });

    describe('WHEN it renders', () => {
      test('THEN the name turns into an input and the grip and actions step away', () => {
        expect(screen.getByRole('textbox')).toHaveValue('Workspace w1');
        expect(grip()).not.toBeInTheDocument();
        expect(action(sidebar.workspaceSettings)).not.toBeInTheDocument();
      });
    });
  });
});
