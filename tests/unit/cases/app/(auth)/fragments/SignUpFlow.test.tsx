import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { completeInvitedAccount, signUp, verifyInviteCode } from '@mocks/authApi';
import { event } from '@mocks/events';
import { TRANSLATIONS } from '@mocks/i18n';
import { router } from '@mocks/navigation';
import { addUserBadge } from '@mocks/userApi';
import { acceptWorkspaceInvitation, getMyInvitations } from '@mocks/workspaceApi';
import { SignUpFlow } from '@/app/(auth)/fragments';

vi.mock('@api/client', async () => ({
  ...(await import('@mocks/authApi')),
  ...(await import('@mocks/workspaceApi')),
  ...(await import('@mocks/userApi')),
}));
vi.mock('next/navigation', () => import('@mocks/navigation'));
vi.mock('@/i18n', () => import('@mocks/i18n'));
vi.mock('@/lib/events', () => import('@mocks/events'));

const accountForm = (submitLabel: string): HTMLFormElement =>
  screen.getByRole('button', { name: submitLabel }).closest('form')!;

afterEach(() => {
  cleanup();
});

describe('SignUpFlow', () => {
  describe('GIVEN a visitor on the plan step', () => {
    beforeEach(() => {
      render(<SignUpFlow />);
    });

    describe('WHEN the plans are listed', () => {
      test('THEN every paid plan is shown locked with its monthly price and the demo plan is left out', () => {
        expect(screen.getByText(TRANSLATIONS.landing.pricing.plans.lite.name)).toBeVisible();
        expect(screen.getByText(`$2/${TRANSLATIONS.landing.pricing.periods.month}`)).toBeVisible();
        expect(screen.getByText(TRANSLATIONS.landing.pricing.plans.standard.name)).toBeVisible();
        expect(screen.getByText(`$5/${TRANSLATIONS.landing.pricing.periods.month}`)).toBeVisible();
        expect(screen.getByText(TRANSLATIONS.landing.pricing.plans.pro.name)).toBeVisible();
        expect(screen.getByText(`$20/${TRANSLATIONS.landing.pricing.periods.month}`)).toBeVisible();
        expect(screen.queryByText(TRANSLATIONS.landing.pricing.plans.demo.name)).toBeNull();
      });

      test('THEN the beta plan is shown as plain text and continuing is the only action', () => {
        expect(screen.getByText(TRANSLATIONS.auth.signUp.planStep.betaPlan)).toBeVisible();
        expect(screen.getByRole('button')).toHaveAccessibleName(TRANSLATIONS.auth.signUp.planStep.continue);
      });
    });
  });

  describe('GIVEN a visitor on the account step', () => {
    beforeEach(() => {
      render(<SignUpFlow />);
      fireEvent.click(screen.getByRole('button', { name: TRANSLATIONS.auth.signUp.planStep.continue }));
      fireEvent.change(screen.getByLabelText(TRANSLATIONS.auth.signUp.accountStep.inviteCode), {
        target: { value: 'beta-code' },
      });
      fireEvent.change(screen.getByLabelText(TRANSLATIONS.auth.signUp.accountStep.name), { target: { value: 'Ada' } });
      fireEvent.change(screen.getByLabelText(TRANSLATIONS.auth.signUp.accountStep.email), {
        target: { value: 'ada@example.com' },
      });
      fireEvent.change(screen.getByLabelText(TRANSLATIONS.auth.signUp.accountStep.password), {
        target: { value: 'secret-pass' },
      });
    });

    describe('WHEN they submit a wrong invite code', () => {
      beforeEach(async () => {
        verifyInviteCode.mockResolvedValue(false);
        await act(async () => {
          fireEvent.submit(accountForm(TRANSLATIONS.auth.signUp.accountStep.submit));
        });
      });

      test('THEN the code error shows and no account is created', () => {
        expect(screen.getByRole('alert')).toHaveTextContent(TRANSLATIONS.auth.errors.invalidInviteCode);
        expect(signUp).not.toHaveBeenCalled();
      });
    });

    describe('WHEN they submit a valid invite code', () => {
      beforeEach(async () => {
        verifyInviteCode.mockResolvedValue(true);
        signUp.mockResolvedValue({ error: null });
        await act(async () => {
          fireEvent.submit(accountForm(TRANSLATIONS.auth.signUp.accountStep.submit));
        });
      });

      test('THEN the account is created and the visitor is asked to confirm the email', () => {
        expect(verifyInviteCode).toHaveBeenCalledExactlyOnceWith('beta-code', 'ada@example.com');
        expect(signUp).toHaveBeenCalledExactlyOnceWith('ada@example.com', 'secret-pass', 'Ada');
        expect(router.push).toHaveBeenCalledExactlyOnceWith('/login?emailSent=true');
      });
    });

    describe('WHEN the account creation is refused and they submit again', () => {
      beforeEach(async () => {
        verifyInviteCode.mockResolvedValue(true);
        signUp.mockResolvedValueOnce({ error: { status: 403 } }).mockResolvedValueOnce({ error: null });
        await act(async () => {
          fireEvent.submit(accountForm(TRANSLATIONS.auth.signUp.accountStep.submit));
        });
        await act(async () => {
          fireEvent.submit(accountForm(TRANSLATIONS.auth.signUp.accountStep.submit));
        });
      });

      test('THEN the invite code is verified again for the same email before the retry', () => {
        expect(verifyInviteCode.mock.calls).toEqual([
          ['beta-code', 'ada@example.com'],
          ['beta-code', 'ada@example.com'],
        ]);
        expect(signUp).toHaveBeenCalledTimes(2);
        expect(event.error).toHaveBeenCalledExactlyOnceWith(
          { status: 403 },
          { title: TRANSLATIONS.auth.errors.signUpFailed, context: 'auth.signUp' },
        );
        expect(router.push).toHaveBeenCalledExactlyOnceWith('/login?emailSent=true');
      });
    });

    describe('WHEN the invite code check fails on the server', () => {
      beforeEach(async () => {
        verifyInviteCode.mockRejectedValue(new Error('network down'));
        await act(async () => {
          fireEvent.submit(accountForm(TRANSLATIONS.auth.signUp.accountStep.submit));
        });
      });

      test('THEN the failure is reported and no account is created', () => {
        expect(event.error).toHaveBeenCalledExactlyOnceWith(expect.any(Error), {
          title: TRANSLATIONS.auth.errors.signUpFailed,
          context: 'auth.verifyInvite',
        });
        expect(signUp).not.toHaveBeenCalled();
      });
    });
  });

  describe('GIVEN an invited teammate on the account step', () => {
    beforeEach(() => {
      addUserBadge.mockResolvedValue(undefined);
      render(<SignUpFlow mode="invite" lockedEmail="invitee@example.com" />);
      fireEvent.click(screen.getByRole('button', { name: TRANSLATIONS.auth.signUp.planStep.continue }));
      fireEvent.change(screen.getByLabelText(TRANSLATIONS.auth.signUp.accountStep.name), {
        target: { value: 'Grace' },
      });
      fireEvent.change(screen.getByLabelText(TRANSLATIONS.auth.signUp.accountStep.password), {
        target: { value: 'secret-pass' },
      });
    });

    describe('WHEN they join', () => {
      beforeEach(async () => {
        completeInvitedAccount.mockResolvedValue({ error: null });
        getMyInvitations.mockResolvedValue([{ id: 'inv-1' }, { id: 'inv-2' }]);
        acceptWorkspaceInvitation.mockResolvedValue(undefined);
        await act(async () => {
          fireEvent.submit(accountForm(TRANSLATIONS.auth.signUp.accountStep.join));
        });
      });

      test('THEN the account is completed, every pending invitation is accepted and the platform opens', () => {
        expect(screen.getByLabelText(TRANSLATIONS.auth.signUp.accountStep.email)).toHaveValue('invitee@example.com');
        expect(completeInvitedAccount).toHaveBeenCalledExactlyOnceWith('Grace', 'secret-pass');
        expect(acceptWorkspaceInvitation.mock.calls).toEqual([['inv-1'], ['inv-2']]);
        expect(addUserBadge).toHaveBeenCalledExactlyOnceWith('collaborator');
        expect(router.push).toHaveBeenCalledExactlyOnceWith('/platform');
      });
    });

    describe('WHEN they join but the collaborator badge cannot be saved', () => {
      const badgeError = new Error('metadata locked');

      beforeEach(async () => {
        completeInvitedAccount.mockResolvedValue({ error: null });
        getMyInvitations.mockResolvedValue([{ id: 'inv-1' }]);
        acceptWorkspaceInvitation.mockResolvedValue(undefined);
        addUserBadge.mockRejectedValue(badgeError);
        await act(async () => {
          fireEvent.submit(accountForm(TRANSLATIONS.auth.signUp.accountStep.join));
        });
      });

      test('THEN the failure is logged without a toast and the platform still opens', () => {
        expect(event.error).toHaveBeenCalledExactlyOnceWith(badgeError, {
          toast: false,
          context: 'auth.collaboratorBadge',
        });
        expect(router.push).toHaveBeenCalledExactlyOnceWith('/platform');
      });
    });

    describe('WHEN one of the pending invitations cannot be accepted', () => {
      const acceptError = new Error('invitation gone');

      beforeEach(async () => {
        completeInvitedAccount.mockResolvedValue({ error: null });
        getMyInvitations.mockResolvedValue([{ id: 'inv-1' }, { id: 'inv-2' }]);
        acceptWorkspaceInvitation.mockResolvedValueOnce(undefined).mockRejectedValueOnce(acceptError);
        await act(async () => {
          fireEvent.submit(accountForm(TRANSLATIONS.auth.signUp.accountStep.join));
        });
      });

      test('THEN the failure is reported with its title and the platform still opens', () => {
        expect(event.error).toHaveBeenCalledExactlyOnceWith(acceptError, {
          title: TRANSLATIONS.platform.sidebar.invitations.acceptFailed,
          context: 'auth.acceptInvitation',
        });
        expect(addUserBadge).toHaveBeenCalledExactlyOnceWith('collaborator');
        expect(router.push).toHaveBeenCalledExactlyOnceWith('/platform');
      });
    });

    describe('WHEN the pending invitations cannot be loaded', () => {
      const loadError = new Error('rpc down');

      beforeEach(async () => {
        completeInvitedAccount.mockResolvedValue({ error: null });
        getMyInvitations.mockRejectedValue(loadError);
        await act(async () => {
          fireEvent.submit(accountForm(TRANSLATIONS.auth.signUp.accountStep.join));
        });
      });

      test('THEN the failure is reported with its title, nothing is accepted and the platform still opens', () => {
        expect(event.error).toHaveBeenCalledExactlyOnceWith(loadError, {
          title: TRANSLATIONS.platform.sidebar.invitations.acceptFailed,
          context: 'auth.loadInvitations',
        });
        expect(acceptWorkspaceInvitation).not.toHaveBeenCalled();
        expect(addUserBadge).not.toHaveBeenCalled();
        expect(router.push).toHaveBeenCalledExactlyOnceWith('/platform');
      });
    });

    describe('WHEN completing the invited account fails', () => {
      const completeError = new Error('weak password');

      beforeEach(async () => {
        completeInvitedAccount.mockResolvedValue({ error: completeError });
        await act(async () => {
          fireEvent.submit(accountForm(TRANSLATIONS.auth.signUp.accountStep.join));
        });
      });

      test('THEN the failure is reported and the teammate stays on the form', () => {
        expect(event.error).toHaveBeenCalledExactlyOnceWith(completeError, {
          title: TRANSLATIONS.auth.errors.joinFailed,
          context: 'auth.completeInvite',
        });
        expect(getMyInvitations).not.toHaveBeenCalled();
        expect(router.push).not.toHaveBeenCalled();
      });
    });
  });
});
