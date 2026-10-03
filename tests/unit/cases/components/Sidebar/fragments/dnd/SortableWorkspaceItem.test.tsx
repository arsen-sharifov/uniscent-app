import { DndContext } from '@dnd-kit/core';
import { SortableContext } from '@dnd-kit/sortable';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { IWorkspaceItem } from '@interfaces';
import { MAX_NAME_LENGTH } from '@constants';
import { TRANSLATIONS } from '@mocks/i18n';
import { inlineEdit, workspaceItem } from '@mocks/sidebar';
import { SortableWorkspaceItem } from '@/components/Sidebar/fragments/dnd';

vi.mock('@/i18n', () => import('@mocks/i18n'));

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
          edit={inlineEdit({ editValue: workspace.name, startEditing: onRequestRename })}
          onClick={onClick}
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

const grip = () => screen.queryByRole('button', { name: TRANSLATIONS.platform.sidebar.dragToReorder });

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

      test('THEN the inactive row is not announced as current', () => {
        expect(rowButton('Workspace w1')).not.toHaveAttribute('aria-current');
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

    describe('WHEN the grip is clicked with the pointer without dragging', () => {
      beforeEach(() => {
        fireEvent.click(grip()!, { detail: 1 });
      });

      test('THEN the click still picks the workspace', () => {
        expect(onClick).toHaveBeenCalledExactlyOnceWith('w1', expect.anything());
      });
    });

    describe('WHEN the focused grip receives a keyboard click', () => {
      beforeEach(() => {
        fireEvent.click(grip()!, { detail: 0 });
      });

      test('THEN the workspace is not picked', () => {
        expect(onClick).not.toHaveBeenCalled();
      });
    });

    describe('WHEN the settings action is clicked', () => {
      beforeEach(() => {
        fireEvent.click(action(TRANSLATIONS.platform.sidebar.workspaceSettings)!);
      });

      test('THEN settings open without picking the workspace', () => {
        expect(onRequestSettings).toHaveBeenCalledExactlyOnceWith('w1');
        expect(onClick).not.toHaveBeenCalled();
      });
    });

    describe('WHEN the rename action is clicked', () => {
      beforeEach(() => {
        fireEvent.click(action(TRANSLATIONS.platform.sidebar.rename)!);
      });

      test('THEN rename is requested', () => {
        expect(onRequestRename).toHaveBeenCalledExactlyOnceWith('w1', 'Workspace w1');
        expect(onClick).not.toHaveBeenCalled();
      });
    });

    describe('WHEN the delete action is clicked', () => {
      beforeEach(() => {
        fireEvent.click(action(TRANSLATIONS.platform.sidebar.delete)!);
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
      test('THEN rename and delete are hidden while settings and the grip stay', () => {
        expect(action(TRANSLATIONS.platform.sidebar.rename)).not.toBeInTheDocument();
        expect(action(TRANSLATIONS.platform.sidebar.delete)).not.toBeInTheDocument();
        expect(action(TRANSLATIONS.platform.sidebar.workspaceSettings)).toBeInTheDocument();
        expect(grip()).toBeInTheDocument();
      });
    });
  });

  describe('GIVEN the active selected workspace', () => {
    beforeEach(() => {
      renderRow(workspaceItem('w1'), { isActive: true, isSelected: true });
    });

    describe('WHEN it renders', () => {
      test('THEN the row is announced as the current workspace', () => {
        expect(rowButton('Workspace w1')).toHaveAttribute('aria-current', 'true');
      });

      test('THEN the tour anchors mark the row and its settings action', () => {
        expect(document.querySelector('[data-tour="sidebarWorkspaceRow"]')).toHaveAttribute('data-workspace-id', 'w1');
        expect(action(TRANSLATIONS.platform.sidebar.workspaceSettings)).toHaveAttribute(
          'data-tour',
          'sidebarWorkspaceRowSettings',
        );
      });
    });
  });

  describe('GIVEN a workspace being renamed', () => {
    beforeEach(() => {
      renderRow(workspaceItem('w1'), { edit: inlineEdit({ editingId: 'w1', editValue: 'Workspace w1' }) });
    });

    describe('WHEN it renders', () => {
      test('THEN the name turns into an input and the grip and actions step away', () => {
        expect(screen.getByRole('textbox')).toHaveValue('Workspace w1');
        expect(grip()).not.toBeInTheDocument();
        expect(action(TRANSLATIONS.platform.sidebar.workspaceSettings)).not.toBeInTheDocument();
      });

      test('THEN the labelled input caps the name at the shared name length', () => {
        expect(screen.getByRole('textbox', { name: TRANSLATIONS.platform.sidebar.rename })).toHaveAttribute(
          'maxlength',
          String(MAX_NAME_LENGTH),
        );
      });
    });
  });
});
