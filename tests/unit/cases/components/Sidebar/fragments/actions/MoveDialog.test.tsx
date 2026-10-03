import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { TRANSLATIONS } from '@mocks/i18n';
import { folderItem, threadItem } from '@mocks/sidebar';
import { MoveDialog } from '@/components/Sidebar/fragments/actions';

vi.mock('@/i18n', () => import('@mocks/i18n'));

const onMove = vi.fn();
const onCancel = vi.fn();

const TREE = [folderItem('f1', [folderItem('f2', [threadItem('t1')])]), folderItem('f3'), threadItem('t2')];

const renderDialog = (selectedIds: string[]) =>
  render(<MoveDialog open items={TREE} selectedIds={new Set(selectedIds)} onMove={onMove} onCancel={onCancel} />);

const TARGET_NAMES = [TRANSLATIONS.platform.sidebar.rootLevel, 'Folder f1', 'Folder f2', 'Folder f3'];

const offeredTargets = () => TARGET_NAMES.filter((name) => screen.queryByRole('button', { name }) !== null);

describe('MoveDialog', () => {
  describe('GIVEN a selected folder holding a nested folder', () => {
    beforeEach(() => {
      renderDialog(['f1']);
    });

    describe('WHEN the targets are listed', () => {
      test('THEN only the root level is offered, so neither its own subtree nor a too deep nesting is possible', () => {
        expect(offeredTargets()).toEqual([TRANSLATIONS.platform.sidebar.rootLevel]);
      });
    });
  });

  describe('GIVEN a selected empty folder', () => {
    beforeEach(() => {
      renderDialog(['f3']);
    });

    describe('WHEN the targets are listed', () => {
      test('THEN the nested folder is left out because the folder could not hold content there', () => {
        expect(offeredTargets()).toEqual([TRANSLATIONS.platform.sidebar.rootLevel, 'Folder f1']);
      });
    });

    describe('WHEN a root folder is picked', () => {
      beforeEach(() => {
        fireEvent.click(screen.getByRole('button', { name: 'Folder f1' }));
      });

      test('THEN only the picked target reads as pressed', () => {
        expect(screen.getByRole('button', { name: 'Folder f1' })).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByRole('button', { name: TRANSLATIONS.platform.sidebar.rootLevel })).toHaveAttribute(
          'aria-pressed',
          'false',
        );
      });
    });

    describe('WHEN a root folder is picked and the move is confirmed', () => {
      beforeEach(() => {
        fireEvent.click(screen.getByRole('button', { name: 'Folder f1' }));
        fireEvent.click(screen.getByRole('button', { name: TRANSLATIONS.platform.sidebar.move }));
      });

      test('THEN the move targets that folder', () => {
        expect(onMove).toHaveBeenCalledExactlyOnceWith('f1');
      });
    });
  });

  describe('GIVEN a selected thread deep inside the tree', () => {
    beforeEach(() => {
      renderDialog(['t1']);
    });

    describe('WHEN the targets are listed', () => {
      test('THEN every folder is offered', () => {
        expect(offeredTargets()).toEqual(TARGET_NAMES);
      });

      test('THEN the dialog is named by its heading', () => {
        expect(screen.getByRole('dialog', { name: TRANSLATIONS.platform.sidebar.moveToFolder })).toBeInTheDocument();
      });
    });

    describe('WHEN the move is confirmed without picking a folder', () => {
      beforeEach(() => {
        fireEvent.click(screen.getByRole('button', { name: TRANSLATIONS.platform.sidebar.move }));
      });

      test('THEN the move targets the root level', () => {
        expect(onMove).toHaveBeenCalledExactlyOnceWith(null);
      });
    });
  });
});
