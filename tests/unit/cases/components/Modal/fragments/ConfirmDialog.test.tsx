import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { ConfirmDialog } from '@/components/Modal';

vi.mock('@/i18n', () => import('@mocks/i18n'));

const onConfirm = vi.fn();
const onCancel = vi.fn();

describe('ConfirmDialog', () => {
  describe('GIVEN an open confirmation', () => {
    beforeEach(() => {
      render(
        <ConfirmDialog
          open
          title="Delete this thread?"
          message="It cannot be restored."
          confirmLabel="Delete"
          cancelLabel="Keep"
          onConfirm={onConfirm}
          onCancel={onCancel}
        />,
      );
    });

    describe('WHEN it renders', () => {
      test('THEN a single alert dialog is named by the title and described by the message', () => {
        const dialog = screen.getByRole('alertdialog', { name: 'Delete this thread?' });

        expect(dialog).toHaveAccessibleDescription('It cannot be restored.');
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });

      test('THEN the safe choice holds focus', () => {
        expect(screen.getByRole('button', { name: 'Keep' })).toHaveFocus();
      });
    });

    describe('WHEN the destructive choice is picked', () => {
      beforeEach(() => {
        fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
      });

      test('THEN it confirms', () => {
        expect(onConfirm).toHaveBeenCalledOnce();
        expect(onCancel).not.toHaveBeenCalled();
      });
    });

    describe('WHEN the safe choice is picked', () => {
      beforeEach(() => {
        fireEvent.click(screen.getByRole('button', { name: 'Keep' }));
      });

      test('THEN it cancels', () => {
        expect(onCancel).toHaveBeenCalledOnce();
        expect(onConfirm).not.toHaveBeenCalled();
      });
    });
  });
});
