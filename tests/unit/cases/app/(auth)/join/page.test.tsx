import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { getSession, verifyInvitation } from '@mocks/authApi';
import { event } from '@mocks/events';
import { TRANSLATIONS } from '@mocks/i18n';
import { router, searchParams } from '@mocks/navigation';
import { signOut } from '@mocks/userApi';
import JoinPage from '@/app/(auth)/join/page';

vi.mock('@api/client', async () => ({
  ...(await import('@mocks/authApi')),
  ...(await import('@mocks/userApi')),
  ...(await import('@mocks/workspaceApi')),
}));
vi.mock('next/navigation', () => import('@mocks/navigation'));
vi.mock('@/i18n', () => import('@mocks/i18n'));
vi.mock('@/lib/events', () => import('@mocks/events'));

const INVITED = { data: { user: { email: 'invitee@example.com' }, session: {} }, error: null };

const sessionOf = (email: string | null) => ({
  data: { session: email ? { user: { email } } : null },
  error: null,
});

afterEach(() => {
  cleanup();
  searchParams.delete('token_hash');
  window.history.replaceState(null, '', '/');
});

describe('JoinPage', () => {
  describe('GIVEN a visitor without an invitation link or a session', () => {
    beforeEach(() => {
      getSession.mockResolvedValue(sessionOf(null));
    });

    describe('WHEN the join page opens', () => {
      beforeEach(async () => {
        await act(async () => {
          render(<JoinPage />);
        });
      });

      test('THEN the visitor is sent to the sign-in page', () => {
        expect(router.replace).toHaveBeenCalledExactlyOnceWith('/login');
      });
    });
  });

  describe('GIVEN a session lookup that fails', () => {
    const failure = new Error('storage unavailable');

    beforeEach(() => {
      searchParams.set('token_hash', 'hash-0');
      getSession.mockRejectedValue(failure);
    });

    describe('WHEN the join page opens', () => {
      beforeEach(async () => {
        await act(async () => {
          render(<JoinPage />);
        });
      });

      test('THEN the failure is reported and the visitor is sent to the sign-in page without verifying anything', () => {
        expect(event.error).toHaveBeenCalledExactlyOnceWith(failure, { toast: false, context: 'auth.readSession' });
        expect(router.replace).toHaveBeenCalledExactlyOnceWith('/login');
        expect(verifyInvitation).not.toHaveBeenCalled();
      });
    });
  });

  describe('GIVEN a crafted link that carries session tokens in the address fragment', () => {
    beforeEach(() => {
      window.history.replaceState(null, '', '/join#access_token=attacker-access&refresh_token=attacker-refresh');
      getSession.mockResolvedValue(sessionOf(null));
    });

    describe('WHEN the join page opens', () => {
      beforeEach(async () => {
        await act(async () => {
          render(<JoinPage />);
        });
      });

      test('THEN no session is taken from the fragment and the visitor is sent to the sign-in page', () => {
        expect(verifyInvitation).not.toHaveBeenCalled();
        expect(router.replace).toHaveBeenCalledExactlyOnceWith('/login');
      });
    });
  });

  describe('GIVEN an invited session that reloads the page before finishing the setup', () => {
    beforeEach(() => {
      getSession.mockResolvedValue({
        data: {
          session: { user: { email: 'invitee@example.com', invited_at: '2026-10-01T10:00:00Z', user_metadata: {} } },
        },
        error: null,
      });
    });

    describe('WHEN the join page opens without a link', () => {
      beforeEach(async () => {
        await act(async () => {
          render(<JoinPage />);
        });
        fireEvent.click(screen.getByRole('button', { name: TRANSLATIONS.auth.signUp.planStep.continue }));
      });

      test('THEN the account setup continues for the session email', () => {
        expect(screen.getByLabelText(TRANSLATIONS.auth.signUp.accountStep.email)).toHaveValue('invitee@example.com');
        expect(verifyInvitation).not.toHaveBeenCalled();
      });
    });
  });

  describe('GIVEN a finished account that opens the join page without a link', () => {
    beforeEach(() => {
      getSession.mockResolvedValue({
        data: { session: { user: { email: 'member@example.com', user_metadata: { name: 'Member', plan: 'beta' } } } },
        error: null,
      });
    });

    describe('WHEN the join page opens', () => {
      beforeEach(async () => {
        await act(async () => {
          render(<JoinPage />);
        });
      });

      test('THEN no account setup is offered and the visitor is sent on', () => {
        expect(screen.queryByRole('button', { name: TRANSLATIONS.auth.signUp.planStep.continue })).toBeNull();
        expect(router.replace).toHaveBeenCalledExactlyOnceWith('/login');
      });
    });
  });

  describe('GIVEN a guest who follows the emailed invitation link', () => {
    beforeEach(() => {
      searchParams.set('token_hash', 'hash-1');
      window.history.replaceState(null, '', '/join?token_hash=hash-1');
      getSession.mockResolvedValue(sessionOf(null));
    });

    describe('WHEN the join page opens', () => {
      beforeEach(async () => {
        await act(async () => {
          render(<JoinPage />);
        });
      });

      test('THEN the invitation waits for an explicit acceptance', () => {
        expect(screen.getByRole('heading', { name: TRANSLATIONS.auth.join.heading })).toBeVisible();
        expect(screen.getByRole('button', { name: TRANSLATIONS.auth.join.accept })).toBeEnabled();
        expect(screen.queryByRole('button', { name: TRANSLATIONS.auth.join.stay })).toBeNull();
        expect(verifyInvitation).not.toHaveBeenCalled();
      });
    });

    describe('WHEN the invitation is accepted', () => {
      beforeEach(async () => {
        verifyInvitation.mockResolvedValue(INVITED);
        await act(async () => {
          render(<JoinPage />);
        });
        await act(async () => {
          fireEvent.click(screen.getByRole('button', { name: TRANSLATIONS.auth.join.accept }));
        });
        fireEvent.click(screen.getByRole('button', { name: TRANSLATIONS.auth.signUp.planStep.continue }));
      });

      test('THEN the link is verified once and the setup opens for the invited email without the token in the address', () => {
        expect(verifyInvitation).toHaveBeenCalledExactlyOnceWith('hash-1');
        expect(screen.getByLabelText(TRANSLATIONS.auth.signUp.accountStep.email)).toHaveValue('invitee@example.com');
        expect(window.location.search).toBe('');
        expect(signOut).not.toHaveBeenCalled();
      });
    });

    describe('WHEN the accepted link turns out to be expired', () => {
      const expired = { code: 'otp_expired', status: 403 };

      beforeEach(async () => {
        verifyInvitation.mockResolvedValue({ data: { user: null, session: null }, error: expired });
        await act(async () => {
          render(<JoinPage />);
        });
        await act(async () => {
          fireEvent.click(screen.getByRole('button', { name: TRANSLATIONS.auth.join.accept }));
        });
      });

      test('THEN the failure is reported and the sign-in page explains the invalid link', () => {
        expect(event.error).toHaveBeenCalledExactlyOnceWith(expired, {
          toast: false,
          context: 'auth.verifyInvitation',
        });
        expect(router.replace).toHaveBeenCalledExactlyOnceWith('/login?error=invalid_code');
      });
    });
  });

  describe('GIVEN an invitee who accepted earlier but left before finishing the setup', () => {
    beforeEach(() => {
      searchParams.set('token_hash', 'hash-used');
      getSession.mockResolvedValue({
        data: {
          session: { user: { email: 'invitee@example.com', invited_at: '2026-10-01T10:00:00Z', user_metadata: {} } },
        },
        error: null,
      });
    });

    describe('WHEN they follow the emailed link again', () => {
      beforeEach(async () => {
        await act(async () => {
          render(<JoinPage />);
        });
        fireEvent.click(screen.getByRole('button', { name: TRANSLATIONS.auth.signUp.planStep.continue }));
      });

      test('THEN the setup continues for their own account without a sign out or a second verification', () => {
        expect(screen.getByLabelText(TRANSLATIONS.auth.signUp.accountStep.email)).toHaveValue('invitee@example.com');
        expect(screen.queryByRole('button', { name: TRANSLATIONS.auth.join.switchAccount })).toBeNull();
        expect(signOut).not.toHaveBeenCalled();
        expect(verifyInvitation).not.toHaveBeenCalled();
      });
    });
  });

  describe('GIVEN an invitee who finished the setup and follows the emailed link again', () => {
    beforeEach(() => {
      searchParams.set('token_hash', 'hash-used');
      getSession.mockResolvedValue({
        data: {
          session: {
            user: {
              email: 'invitee@example.com',
              invited_at: '2026-10-01T10:00:00Z',
              user_metadata: { name: 'Invitee', plan: 'beta' },
            },
          },
        },
        error: null,
      });
    });

    describe('WHEN the join page opens', () => {
      beforeEach(async () => {
        await act(async () => {
          render(<JoinPage />);
        });
      });

      test('THEN the finished account is treated like any signed-in account and both choices are offered', () => {
        expect(screen.getByRole('button', { name: TRANSLATIONS.auth.join.switchAccount })).toBeEnabled();
        expect(screen.getByRole('button', { name: TRANSLATIONS.auth.join.stay })).toBeEnabled();
      });
    });
  });

  describe('GIVEN someone already signed in who follows an emailed invitation link', () => {
    beforeEach(() => {
      searchParams.set('token_hash', 'hash-2');
      getSession.mockResolvedValue(sessionOf('current@example.com'));
    });

    describe('WHEN the join page opens', () => {
      beforeEach(async () => {
        await act(async () => {
          render(<JoinPage />);
        });
      });

      test('THEN the current account is named and both choices are offered without verifying anything', () => {
        expect(
          screen.getByText(TRANSLATIONS.auth.join.signedInAs.replace('{email}', 'current@example.com')),
        ).toBeVisible();
        expect(screen.getByRole('button', { name: TRANSLATIONS.auth.join.switchAccount })).toBeEnabled();
        expect(screen.getByRole('button', { name: TRANSLATIONS.auth.join.stay })).toBeEnabled();
        expect(verifyInvitation).not.toHaveBeenCalled();
        expect(signOut).not.toHaveBeenCalled();
      });
    });

    describe('WHEN they choose to stay signed in', () => {
      beforeEach(async () => {
        await act(async () => {
          render(<JoinPage />);
        });
        fireEvent.click(screen.getByRole('button', { name: TRANSLATIONS.auth.join.stay }));
      });

      test('THEN the platform opens for the current account and the invitation is left untouched', () => {
        expect(router.replace).toHaveBeenCalledExactlyOnceWith('/platform');
        expect(verifyInvitation).not.toHaveBeenCalled();
        expect(signOut).not.toHaveBeenCalled();
      });
    });

    describe('WHEN they sign out and accept but the server refuses the sign out after the local session is gone', () => {
      const failure = new Error('auth unreachable');

      beforeEach(async () => {
        signOut.mockRejectedValue(failure);
        verifyInvitation.mockResolvedValue(INVITED);
        await act(async () => {
          render(<JoinPage />);
        });
        await act(async () => {
          fireEvent.click(screen.getByRole('button', { name: TRANSLATIONS.auth.join.switchAccount }));
        });
        fireEvent.click(screen.getByRole('button', { name: TRANSLATIONS.auth.signUp.planStep.continue }));
      });

      test('THEN the failure is reported quietly and the link is still verified for the invited email', () => {
        expect(event.error).toHaveBeenCalledExactlyOnceWith(failure, { toast: false, context: 'auth.signOut' });
        expect(verifyInvitation).toHaveBeenCalledExactlyOnceWith('hash-2');
        expect(screen.getByLabelText(TRANSLATIONS.auth.signUp.accountStep.email)).toHaveValue('invitee@example.com');
      });
    });

    describe('WHEN they sign out and accept', () => {
      beforeEach(async () => {
        signOut.mockResolvedValue(undefined);
        verifyInvitation.mockResolvedValue(INVITED);
        await act(async () => {
          render(<JoinPage />);
        });
        await act(async () => {
          fireEvent.click(screen.getByRole('button', { name: TRANSLATIONS.auth.join.switchAccount }));
        });
        fireEvent.click(screen.getByRole('button', { name: TRANSLATIONS.auth.signUp.planStep.continue }));
      });

      test('THEN only this browser session ends before the link is verified and the setup opens for the invited email', () => {
        expect(signOut).toHaveBeenCalledExactlyOnceWith({ scope: 'local' });
        expect(verifyInvitation).toHaveBeenCalledExactlyOnceWith('hash-2');
        expect(signOut.mock.invocationCallOrder[0]).toBeLessThan(verifyInvitation.mock.invocationCallOrder[0]!);
        expect(screen.getByLabelText(TRANSLATIONS.auth.signUp.accountStep.email)).toHaveValue('invitee@example.com');
      });
    });
  });
});
