import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { TRANSLATIONS } from '@mocks/i18n';
import { Modal } from '@/components/Modal';

vi.mock('@/i18n', () => import('@mocks/i18n'));

const onClose = vi.fn();

describe('Modal', () => {
  describe('GIVEN an open modal', () => {
    beforeEach(() => {
      render(
        <Modal open onClose={onClose}>
          <p>Body</p>
        </Modal>,
      );
    });

    describe('WHEN it renders', () => {
      test('THEN the panel is a native modal dialog holding the content and its close button', () => {
        const dialog = screen.getByRole('dialog');

        expect(dialog.tagName).toBe('DIALOG');
        expect(dialog).toHaveAttribute('aria-modal', 'true');
        expect(dialog).toHaveTextContent('Body');
        expect(within(dialog).getByRole('button', { name: TRANSLATIONS.common.close })).toBeInTheDocument();
      });

      test('THEN the panel takes focus', () => {
        expect(screen.getByRole('dialog')).toHaveFocus();
      });
    });

    describe('WHEN the scrim behind the panel is clicked', () => {
      beforeEach(() => {
        const closeButtons = screen.getAllByRole('button', { name: TRANSLATIONS.common.close });
        const scrim = closeButtons.find((button) => !screen.getByRole('dialog').contains(button));
        fireEvent.click(scrim!);
      });

      test('THEN the modal asks to close', () => {
        expect(onClose).toHaveBeenCalledOnce();
      });
    });

    describe('WHEN something inside the panel is clicked', () => {
      beforeEach(() => {
        fireEvent.click(screen.getByText('Body'));
      });

      test('THEN the modal stays open', () => {
        expect(onClose).not.toHaveBeenCalled();
      });
    });

    describe('WHEN Escape is pressed', () => {
      beforeEach(() => {
        fireEvent.keyDown(document, { key: 'Escape' });
      });

      test('THEN the modal asks to close', () => {
        expect(onClose).toHaveBeenCalledOnce();
      });
    });
  });

  describe('GIVEN a closed modal', () => {
    describe('WHEN it renders', () => {
      beforeEach(() => {
        render(
          <Modal open={false} onClose={onClose}>
            <p>Body</p>
          </Modal>,
        );
      });

      test('THEN nothing is shown', () => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });
  });
});
