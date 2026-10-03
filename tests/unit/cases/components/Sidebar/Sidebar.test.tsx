import { act, fireEvent, render, screen, within, type RenderResult } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import type { IWorkspaceItem } from '@interfaces';

import { domRect, stubAnimationFrame } from '@mocks/browser';
import { TRANSLATIONS } from '@mocks/i18n';
import { folderItem, threadItem, workspaceItem } from '@mocks/sidebar';
import { Sidebar } from '@/components/Sidebar';
import { usePermissionsStore } from '@/lib/stores';

vi.mock('@/i18n', () => import('@mocks/i18n'));

const onCreateWorkspace = vi.fn();
const onRenameWorkspace = vi.fn();
const onWorkspaceEditingComplete = vi.fn();
const onItemClick = vi.fn();
const onOpenWorkspaceSettings = vi.fn();
const onBulkDeleteWorkspaces = vi.fn();
const onBulkMove = vi.fn();

const BASE_WORKSPACES = [workspaceItem('ws-1')];

const sidebarElement = (workspaces: IWorkspaceItem[], editingWorkspaceId?: string | null) => (
  <Sidebar
    workspaces={workspaces}
    activeWorkspaceId={workspaces.at(-1)?.id}
    editingWorkspaceId={editingWorkspaceId}
    onCreateWorkspace={onCreateWorkspace}
    onRenameWorkspace={onRenameWorkspace}
    onWorkspaceEditingComplete={onWorkspaceEditingComplete}
    onOpenWorkspaceSettings={onOpenWorkspaceSettings}
    onBulkDeleteWorkspaces={onBulkDeleteWorkspaces}
  />
);

const switcherTrigger = () => screen.getByRole('button', { expanded: false });

const workspacePanel = () => screen.queryByRole('dialog');

const selectionBar = (label: string) => screen.getByText(label).closest('div')!;

const selectedRows = () => screen.queryAllByRole('treeitem', { selected: true });

let view: RenderResult;
let frames: ReturnType<typeof stubAnimationFrame>;

afterEach(() => {
  usePermissionsStore.getState().clearAccess();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('Sidebar', () => {
  describe('GIVEN a sidebar mounted without any editing props', () => {
    beforeEach(() => {
      render(<Sidebar workspaces={BASE_WORKSPACES} activeWorkspaceId="ws-1" />);
    });

    describe('WHEN it renders', () => {
      test('THEN the switcher shows the active workspace without starting a rename', () => {
        expect(switcherTrigger()).toHaveTextContent('Workspace ws-1');
        expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
      });
    });
  });

  describe('GIVEN a closed workspace switcher', () => {
    beforeEach(() => {
      view = render(sidebarElement(BASE_WORKSPACES, null));
    });

    describe('WHEN a workspace created elsewhere arrives in rename mode', () => {
      beforeEach(() => {
        view.rerender(sidebarElement([...BASE_WORKSPACES, workspaceItem('ws-2')], 'ws-2'));
      });

      test('THEN the switcher opens on its focused rename field', () => {
        expect(workspacePanel()).toContainElement(screen.getByDisplayValue('Workspace ws-2'));
        expect(screen.getByDisplayValue('Workspace ws-2')).toHaveFocus();
        expect(onRenameWorkspace).not.toHaveBeenCalled();
      });
    });

    describe('WHEN that rename is confirmed', () => {
      beforeEach(() => {
        view.rerender(sidebarElement([...BASE_WORKSPACES, workspaceItem('ws-2')], 'ws-2'));
        fireEvent.change(screen.getByDisplayValue('Workspace ws-2'), { target: { value: 'Research' } });
        fireEvent.keyDown(screen.getByDisplayValue('Research'), { key: 'Enter' });
        view.rerender(sidebarElement([...BASE_WORKSPACES, workspaceItem('ws-2')], null));
      });

      test('THEN the name is saved and the switcher closes again', () => {
        expect(onRenameWorkspace).toHaveBeenCalledExactlyOnceWith('ws-2', 'Research');
        expect(workspacePanel()).not.toBeInTheDocument();
      });
    });

    describe('WHEN a click outside the switcher dismisses that rename', () => {
      beforeEach(() => {
        view.rerender(sidebarElement([...BASE_WORKSPACES, workspaceItem('ws-2')], 'ws-2'));
        fireEvent.change(screen.getByDisplayValue('Workspace ws-2'), { target: { value: 'Research' } });
        fireEvent.mouseDown(document.body);
      });

      test('THEN the rename is dropped, reported done, and the switcher closes', () => {
        expect(onRenameWorkspace).not.toHaveBeenCalled();
        expect(onWorkspaceEditingComplete).toHaveBeenCalledOnce();
        expect(workspacePanel()).not.toBeInTheDocument();
      });
    });
  });

  describe('GIVEN an open workspace switcher', () => {
    beforeEach(() => {
      view = render(sidebarElement(BASE_WORKSPACES, null));
      fireEvent.click(switcherTrigger());
    });

    describe('WHEN a workspace is created from the panel', () => {
      beforeEach(() => {
        fireEvent.click(screen.getByRole('button', { name: TRANSLATIONS.platform.sidebar.newWorkspace }));
      });

      test('THEN the creation is requested and the panel stays open', () => {
        expect(onCreateWorkspace).toHaveBeenCalledOnce();
        expect(workspacePanel()).toBeInTheDocument();
      });
    });

    describe('WHEN the created workspace arrives in rename mode', () => {
      beforeEach(() => {
        fireEvent.click(screen.getByRole('button', { name: TRANSLATIONS.platform.sidebar.newWorkspace }));
        view.rerender(sidebarElement([...BASE_WORKSPACES, workspaceItem('ws-2')], 'ws-2'));
      });

      test('THEN its rename field is visible in the panel and keeps the focus', () => {
        expect(workspacePanel()).toContainElement(screen.getByDisplayValue('Workspace ws-2'));
        expect(screen.getByDisplayValue('Workspace ws-2')).toHaveFocus();
        expect(onRenameWorkspace).not.toHaveBeenCalled();
      });
    });

    describe('WHEN the created workspace is named', () => {
      beforeEach(() => {
        fireEvent.click(screen.getByRole('button', { name: TRANSLATIONS.platform.sidebar.newWorkspace }));
        view.rerender(sidebarElement([...BASE_WORKSPACES, workspaceItem('ws-2')], 'ws-2'));
        fireEvent.change(screen.getByDisplayValue('Workspace ws-2'), { target: { value: 'Research' } });
        fireEvent.keyDown(screen.getByDisplayValue('Research'), { key: 'Enter' });
      });

      test('THEN the name is saved and the rename is reported done', () => {
        expect(onRenameWorkspace).toHaveBeenCalledExactlyOnceWith('ws-2', 'Research');
        expect(onWorkspaceEditingComplete).toHaveBeenCalledOnce();
      });
    });

    describe('WHEN the settings of a workspace are opened from the panel', () => {
      beforeEach(() => {
        fireEvent.click(screen.getByTitle(TRANSLATIONS.platform.sidebar.workspaceSettings));
      });

      test('THEN the settings open with the focus on the switcher, which the dialog returns to when it closes', () => {
        expect(onOpenWorkspaceSettings).toHaveBeenCalledExactlyOnceWith('ws-1');
        expect(workspacePanel()).not.toBeInTheDocument();
        expect(switcherTrigger()).toHaveFocus();
      });
    });
  });

  describe('GIVEN an open workspace switcher listing a workspace the member cannot manage', () => {
    beforeEach(() => {
      render(sidebarElement([workspaceItem('ws-1'), workspaceItem('ws-2', false)], null));
      fireEvent.click(switcherTrigger());
    });

    describe('WHEN only that workspace is added to the selection', () => {
      beforeEach(() => {
        fireEvent.click(within(workspacePanel()!).getByText('Workspace ws-2'), { ctrlKey: true });
      });

      test('THEN the selection bar counts one workspace in the singular and offers no delete', () => {
        expect(selectionBar('workspace selected')).toHaveTextContent('1');
        expect(
          within(selectionBar('workspace selected')).queryByTitle(TRANSLATIONS.platform.sidebar.delete),
        ).not.toBeInTheDocument();
      });
    });

    describe('WHEN a manageable workspace joins the selection', () => {
      beforeEach(() => {
        fireEvent.click(within(workspacePanel()!).getByText('Workspace ws-2'), { ctrlKey: true });
        fireEvent.click(within(workspacePanel()!).getByText('Workspace ws-1'), { ctrlKey: true });
      });

      test('THEN the selection bar counts two workspaces in the plural and offers the delete', () => {
        expect(selectionBar('workspaces selected')).toHaveTextContent('2');
        expect(
          within(selectionBar('workspaces selected')).getByTitle(TRANSLATIONS.platform.sidebar.delete),
        ).toBeInTheDocument();
      });
    });

    describe('WHEN the delete of the selected workspaces is confirmed', () => {
      beforeEach(() => {
        fireEvent.click(within(workspacePanel()!).getByText('Workspace ws-2'), { ctrlKey: true });
        fireEvent.click(within(workspacePanel()!).getByText('Workspace ws-1'), { ctrlKey: true });
        fireEvent.click(within(selectionBar('workspaces selected')).getByTitle(TRANSLATIONS.platform.sidebar.delete));
        fireEvent.click(
          within(screen.getByRole('alertdialog')).getByRole('button', { name: TRANSLATIONS.platform.sidebar.delete }),
        );
      });

      test('THEN the selected workspaces are deleted and the selection clears', () => {
        expect(onBulkDeleteWorkspaces).toHaveBeenCalledExactlyOnceWith(new Set(['ws-2', 'ws-1']));
        expect(screen.queryByText('workspaces selected')).not.toBeInTheDocument();
      });
    });
  });

  describe('GIVEN a structure the member may manage', () => {
    beforeEach(() => {
      usePermissionsStore.setState({ canManageStructure: true });
      render(
        <Sidebar items={[threadItem('t1'), threadItem('t2')]} workspaces={BASE_WORKSPACES} activeWorkspaceId="ws-1" />,
      );
    });

    describe('WHEN one thread is ctrl-clicked', () => {
      beforeEach(() => {
        fireEvent.click(screen.getByText('Thread t1'), { ctrlKey: true });
      });

      test('THEN the selection bar counts one item in the singular', () => {
        expect(selectionBar('item selected')).toHaveTextContent('1');
      });
    });

    describe('WHEN both threads are ctrl-clicked', () => {
      beforeEach(() => {
        fireEvent.click(screen.getByText('Thread t1'), { ctrlKey: true });
        fireEvent.click(screen.getByText('Thread t2'), { ctrlKey: true });
      });

      test('THEN the selection bar counts two items in the plural', () => {
        expect(selectionBar('items selected')).toHaveTextContent('2');
      });
    });

    describe('WHEN the delete of one thread is requested', () => {
      beforeEach(() => {
        fireEvent.click(screen.getAllByTitle(TRANSLATIONS.platform.sidebar.delete)[0]!);
      });

      test('THEN the confirmation isolates the thread name from the surrounding bidirectional text', () => {
        expect(within(screen.getByRole('alertdialog')).getByText('Thread t1').tagName).toBe('BDI');
      });
    });

    describe('WHEN the bulk delete of a selection is cancelled with Escape', () => {
      beforeEach(() => {
        fireEvent.click(screen.getByText('Thread t1'), { ctrlKey: true });
        fireEvent.click(screen.getByText('Thread t2'), { ctrlKey: true });
        fireEvent.click(
          within(selectionBar('items selected')).getByRole('button', { name: TRANSLATIONS.platform.sidebar.delete }),
        );
        fireEvent.keyDown(window, { key: 'Escape' });
      });

      test('THEN only the confirmation closes and the selection stays', () => {
        expect(screen.getByRole('alertdialog')).toHaveClass('opacity-0');
        expect(selectedRows()).toHaveLength(2);
        expect(selectionBar('items selected')).toHaveTextContent('2');
      });
    });

    describe('WHEN a search query is typed', () => {
      beforeEach(() => {
        fireEvent.change(screen.getByPlaceholderText(TRANSLATIONS.platform.sidebar.searchPlaceholder), {
          target: { value: 't1' },
        });
      });

      test('THEN the button that clears the query is named', () => {
        expect(screen.getByRole('button', { name: TRANSLATIONS.platform.sidebar.clearSearch })).toBeInTheDocument();
      });
    });
  });

  describe('GIVEN a managed structure with a folder and two root threads', () => {
    beforeEach(() => {
      usePermissionsStore.setState({ canManageStructure: true });
      render(
        <Sidebar
          items={[folderItem('f1'), threadItem('t1'), threadItem('t2')]}
          workspaces={BASE_WORKSPACES}
          activeWorkspaceId="ws-1"
          onBulkMove={onBulkMove}
        />,
      );
    });

    describe('WHEN both threads are moved into the folder through the move dialog', () => {
      beforeEach(() => {
        fireEvent.click(screen.getByText('Thread t1'), { ctrlKey: true });
        fireEvent.click(screen.getByText('Thread t2'), { ctrlKey: true });
        fireEvent.click(
          within(selectionBar('items selected')).getByRole('button', {
            name: TRANSLATIONS.platform.sidebar.moveToFolder,
          }),
        );
        fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Folder f1' }));
        fireEvent.click(
          within(screen.getByRole('dialog')).getByRole('button', { name: TRANSLATIONS.platform.sidebar.move }),
        );
      });

      test('THEN the threads move to the end of the folder and the selection clears', () => {
        expect(onBulkMove).toHaveBeenCalledExactlyOnceWith(new Set(['t1', 't2']), 'f1', 0);
        expect(selectedRows()).toHaveLength(0);
      });
    });
  });

  describe('GIVEN a structure the member may not manage', () => {
    beforeEach(() => {
      usePermissionsStore.setState({ canManageStructure: false });
      render(
        <Sidebar
          items={[threadItem('t1'), folderItem('f1', [threadItem('t2')])]}
          workspaces={BASE_WORKSPACES}
          activeWorkspaceId="ws-1"
          onItemClick={onItemClick}
        />,
      );
    });

    describe('WHEN a thread is ctrl-clicked', () => {
      beforeEach(() => {
        fireEvent.click(screen.getByText('Thread t1'), { ctrlKey: true });
      });

      test('THEN the thread is selected and the selection bar counts it', () => {
        expect(selectedRows()).toHaveLength(1);
        expect(selectionBar('item selected')).toHaveTextContent('1');
      });

      test('THEN move and delete stay visible but locked with the permission hint', () => {
        expect(
          within(selectionBar('item selected')).getByRole('button', {
            name: TRANSLATIONS.platform.sidebar.moveToFolder,
          }),
        ).toHaveAttribute('aria-disabled', 'true');
        expect(
          within(selectionBar('item selected')).getByRole('button', { name: TRANSLATIONS.platform.sidebar.delete }),
        ).toHaveAttribute('aria-disabled', 'true');
        expect(
          within(selectionBar('item selected')).getAllByTitle(TRANSLATIONS.platform.sidebar.structureLocked),
        ).toHaveLength(2);
      });
    });

    describe('WHEN the locked delete of a selection is clicked', () => {
      beforeEach(() => {
        fireEvent.click(screen.getByText('Thread t1'), { ctrlKey: true });
        fireEvent.click(
          within(selectionBar('item selected')).getByRole('button', { name: TRANSLATIONS.platform.sidebar.delete }),
        );
      });

      test('THEN no delete confirmation opens', () => {
        expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
      });
    });

    describe('WHEN the pointer drags a selection rectangle over the rows', () => {
      beforeEach(() => {
        frames = stubAnimationFrame();
        document.querySelectorAll('[data-item-id]').forEach((row, index) => {
          vi.spyOn(row, 'getBoundingClientRect').mockReturnValue(
            domRect({ left: 0, right: 200, top: index * 32, bottom: (index + 1) * 32, width: 200, height: 32 }),
          );
        });
        act(() => {
          document
            .querySelector('[data-sidebar-scroll]')!
            .dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0, clientX: 100, clientY: 0 }));
          window.dispatchEvent(new MouseEvent('mousemove', { clientX: 120, clientY: 90 }));
          frames.flush();
        });
      });

      test('THEN the rows under the rectangle are selected', () => {
        expect(selectedRows().length).toBeGreaterThan(0);
      });
    });
  });
});
