import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { TRANSLATIONS } from '@mocks/i18n';
import { workspaceMember } from '@mocks/roles';
import { OwnershipTransferDialog } from '@/app/platform/components/WorkspaceSettings/fragments';

vi.mock('@/i18n', () => import('@mocks/i18n'));

const MEMBER = workspaceMember('u-member', 'role-member', { name: 'Mira Holt' });

const onConfirm = vi.fn();
const onCancel = vi.fn();
const onOuterKeyDown = vi.fn();

let rerender: (ui: ReactNode) => void;

const scrim = () => screen.getByRole('alertdialog').previousElementSibling;

const withTrigger = (open: boolean, cancel: () => void = onCancel) => (
  <>
    <button type="button">Member actions</button>
    {open && <OwnershipTransferDialog member={MEMBER} onConfirm={onConfirm} onCancel={cancel} />}
  </>
);

afterEach(() => {
  document.removeEventListener('keydown', onOuterKeyDown);
});

describe('OwnershipTransferDialog', () => {
  describe('GIVEN the open confirmation', () => {
    beforeEach(() => {
      render(withTrigger(true));
    });

    describe('WHEN it renders', () => {
      test('THEN one alert dialog is named by its title and described by the warning', () => {
        const dialog = screen.getByRole('alertdialog', {
          name: TRANSLATIONS.platform.workspaceSettings.members.transferTitle,
        });

        expect(dialog).toHaveAttribute('aria-modal', 'true');
        expect(dialog).toHaveAccessibleDescription(
          `${TRANSLATIONS.platform.workspaceSettings.members.transferConfirmPrefix} “Mira Holt”${TRANSLATIONS.platform.workspaceSettings.members.transferConfirmSuffix}`,
        );
        expect(dialog).toHaveFocus();
      });

      test('THEN the member name is isolated from the surrounding bidirectional text', () => {
        expect(screen.getByText('Mira Holt').tagName).toBe('BDI');
      });

      test('THEN the backdrop stays out of the accessibility tree and the tab order', () => {
        expect(scrim()).toHaveAttribute('aria-hidden', 'true');
        expect(scrim()).toHaveAttribute('tabindex', '-1');
        expect(screen.queryByRole('button', { name: TRANSLATIONS.common.close })).not.toBeInTheDocument();
      });
    });

    describe('WHEN the backdrop is clicked', () => {
      beforeEach(() => {
        fireEvent.click(scrim()!);
      });

      test('THEN it cancels', () => {
        expect(onCancel).toHaveBeenCalledOnce();
        expect(onConfirm).not.toHaveBeenCalled();
      });
    });

    describe('WHEN the transfer is confirmed', () => {
      beforeEach(() => {
        fireEvent.click(
          screen.getByRole('button', { name: TRANSLATIONS.platform.workspaceSettings.members.transferConfirm }),
        );
      });

      test('THEN it confirms', () => {
        expect(onConfirm).toHaveBeenCalledOnce();
        expect(onCancel).not.toHaveBeenCalled();
      });
    });
  });

  describe('GIVEN the open confirmation above another Escape listener', () => {
    beforeEach(() => {
      document.addEventListener('keydown', onOuterKeyDown);
      render(withTrigger(true));
    });

    describe('WHEN Escape is pressed', () => {
      beforeEach(() => {
        fireEvent.keyDown(document, { key: 'Escape' });
      });

      test('THEN only the confirmation cancels', () => {
        expect(onCancel).toHaveBeenCalledOnce();
        expect(onOuterKeyDown).not.toHaveBeenCalled();
      });
    });
  });

  describe('GIVEN the confirmation opened from a focused trigger', () => {
    beforeEach(() => {
      rerender = render(withTrigger(false)).rerender;
      screen.getByRole('button', { name: 'Member actions' }).focus();
      rerender(withTrigger(true));
    });

    describe('WHEN its owner re-renders it with a new cancel handler while the user is on the confirm button', () => {
      beforeEach(() => {
        screen.getByRole('button', { name: TRANSLATIONS.platform.workspaceSettings.members.transferConfirm }).focus();
        rerender(withTrigger(true, vi.fn()));
      });

      test('THEN focus stays on the confirm button', () => {
        expect(
          screen.getByRole('button', { name: TRANSLATIONS.platform.workspaceSettings.members.transferConfirm }),
        ).toHaveFocus();
      });
    });

    describe('WHEN it closes', () => {
      beforeEach(() => {
        rerender(withTrigger(false));
      });

      test('THEN focus returns to the trigger', () => {
        expect(screen.getByRole('button', { name: 'Member actions' })).toHaveFocus();
      });
    });
  });
});
