import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { TRANSLATIONS } from '@mocks/i18n';
import { Modal } from '@/components/Modal';

vi.mock('@/i18n', () => import('@mocks/i18n'));

const onClose = vi.fn();

let rerender: (ui: ReactNode) => void;

const withTrigger = (open: boolean) => (
  <>
    <button type="button">Open</button>
    <Modal open={open} onClose={onClose}>
      <input aria-label="Name" autoFocus />
    </Modal>
  </>
);

const scrim = () => screen.getAllByRole('button', { hidden: true }).find((button) => button.closest('dialog') === null);

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

      test('THEN the close button inside the panel is the only close control assistive technology sees', () => {
        expect(screen.getAllByRole('button', { name: TRANSLATIONS.common.close })).toHaveLength(1);
        expect(scrim()).toHaveAttribute('aria-hidden', 'true');
        expect(scrim()).toHaveAttribute('tabindex', '-1');
      });

      test('THEN the panel takes focus', () => {
        expect(screen.getByRole('dialog')).toHaveFocus();
      });
    });

    describe('WHEN the scrim behind the panel is clicked', () => {
      beforeEach(() => {
        fireEvent.click(scrim()!);
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

    describe('WHEN Shift+Tab is pressed while the panel itself holds focus', () => {
      beforeEach(() => {
        fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
      });

      test('THEN focus wraps to the last control inside the panel', () => {
        expect(
          within(screen.getByRole('dialog')).getByRole('button', { name: TRANSLATIONS.common.close }),
        ).toHaveFocus();
      });
    });
  });

  describe('GIVEN a modal whose content focuses itself on mount', () => {
    beforeEach(() => {
      render(
        <Modal open onClose={onClose}>
          <input aria-label="Name" autoFocus />
        </Modal>,
      );
    });

    describe('WHEN it opens', () => {
      test('THEN the content keeps its focus', () => {
        expect(screen.getByRole('textbox', { name: 'Name' })).toHaveFocus();
      });
    });
  });

  describe('GIVEN a modal opened from a focused trigger', () => {
    beforeEach(() => {
      rerender = render(withTrigger(false)).rerender;
      screen.getByRole('button', { name: 'Open' }).focus();
      rerender(withTrigger(true));
    });

    describe('WHEN it closes', () => {
      beforeEach(() => {
        rerender(withTrigger(false));
      });

      test('THEN focus returns to the trigger', () => {
        expect(screen.getByRole('button', { name: 'Open' })).toHaveFocus();
      });
    });
  });

  describe('GIVEN a modal labelled as an alert dialog', () => {
    beforeEach(() => {
      render(
        <Modal open onClose={onClose} role="alertdialog" labelledBy="title" describedBy="message">
          <h3 id="title">Delete this thread?</h3>
          <p id="message">It cannot be restored.</p>
        </Modal>,
      );
    });

    describe('WHEN it renders', () => {
      test('THEN the native dialog itself carries the role, the name and the description', () => {
        const dialog = screen.getByRole('alertdialog', { name: 'Delete this thread?' });

        expect(dialog.tagName).toBe('DIALOG');
        expect(dialog).toHaveAccessibleDescription('It cannot be restored.');
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
