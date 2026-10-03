import { afterEach, describe, expect, test, vi } from 'vitest';

import {
  completeInvitedAccount,
  getSession,
  signIn,
  signOut,
  signUp,
  verifyInvitation,
  verifyInviteCode,
} from '@api/client';
import { primeFetch } from '@mocks/fetch';
import { primeSupabase } from '@mocks/supabase';

vi.mock('@/lib/supabase', () => import('@mocks/supabase'));

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('signIn', () => {
  describe('GIVEN sign-in credentials', () => {
    describe('WHEN the user signs in', () => {
      test('THEN the credentials pass through and the auth result is returned', async () => {
        const { client } = primeSupabase([]);

        await expect(signIn('user@example.com', 'secret')).resolves.toEqual({ data: { session: null }, error: null });
        expect(client.auth.signInWithPassword).toHaveBeenCalledExactlyOnceWith({
          email: 'user@example.com',
          password: 'secret',
        });
      });
    });
  });
});

describe('signUp', () => {
  describe('GIVEN new account details', () => {
    describe('WHEN the account is registered', () => {
      test('THEN the payload pins the beta plan', async () => {
        const { client } = primeSupabase([]);

        await signUp('user@example.com', 'secret', 'Ada');

        expect(client.auth.signUp).toHaveBeenCalledExactlyOnceWith({
          email: 'user@example.com',
          password: 'secret',
          options: { data: { name: 'Ada', plan: 'beta' } },
        });
      });
    });
  });
});

describe('getSession', () => {
  describe('GIVEN an active auth client', () => {
    describe('WHEN the session is read', () => {
      test('THEN the auth result is returned', async () => {
        primeSupabase([]);

        await expect(getSession()).resolves.toEqual({ data: { session: null }, error: null });
      });
    });
  });
});

describe('verifyInvitation', () => {
  describe('GIVEN the token hash of an emailed invitation', () => {
    describe('WHEN the invitation is verified', () => {
      test('THEN the hash is checked as an invite and the auth result is returned', async () => {
        const { client } = primeSupabase([]);

        await expect(verifyInvitation('hash-1')).resolves.toEqual({
          data: { user: null, session: null },
          error: null,
        });
        expect(client.auth.verifyOtp).toHaveBeenCalledExactlyOnceWith({ token_hash: 'hash-1', type: 'invite' });
      });
    });
  });
});

describe('completeInvitedAccount', () => {
  describe('GIVEN an invited user finishing setup', () => {
    describe('WHEN the account is completed', () => {
      test('THEN the update pins the password and beta plan', async () => {
        const { client } = primeSupabase([]);

        await completeInvitedAccount('Ada', 'secret');

        expect(client.auth.updateUser).toHaveBeenCalledExactlyOnceWith({
          password: 'secret',
          data: { name: 'Ada', plan: 'beta' },
        });
      });
    });
  });
});

describe('signOut', () => {
  describe('GIVEN a signed-in user', () => {
    describe('WHEN the user signs out', () => {
      test('THEN sign out runs and resolves', async () => {
        const { client } = primeSupabase([]);

        await expect(signOut()).resolves.toBeUndefined();
        expect(client.auth.signOut).toHaveBeenCalledTimes(1);
      });
    });

    describe('WHEN the user signs out of this browser only', () => {
      test('THEN the local scope passes through', async () => {
        const { client } = primeSupabase([]);

        await expect(signOut({ scope: 'local' })).resolves.toBeUndefined();
        expect(client.auth.signOut).toHaveBeenCalledExactlyOnceWith({ scope: 'local' });
      });
    });
  });

  describe('GIVEN a sign out the auth server fails', () => {
    describe('WHEN the user signs out', () => {
      test('THEN the auth error is thrown instead of returned', async () => {
        const failure = new Error('auth unreachable');
        const { client } = primeSupabase([]);
        vi.mocked(client.auth.signOut).mockResolvedValue({ error: failure } as never);

        await expect(signOut()).rejects.toBe(failure);
      });
    });
  });
});

describe('verifyInviteCode', () => {
  describe('GIVEN the server accepts the code', () => {
    describe('WHEN the code is verified', () => {
      test('THEN the code is valid and posted as json', async () => {
        const fetchSpy = primeFetch(200);

        await expect(verifyInviteCode('beta-code', 'new@user.dev')).resolves.toBe(true);
        expect(fetchSpy).toHaveBeenCalledExactlyOnceWith('/auth/verify-invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: 'beta-code', email: 'new@user.dev' }),
        });
      });
    });
  });

  describe('GIVEN the server rejects the code', () => {
    describe('WHEN the code is verified', () => {
      test('THEN the code is reported invalid', async () => {
        primeFetch(403);

        await expect(verifyInviteCode('wrong', 'new@user.dev')).resolves.toBe(false);
      });
    });
  });

  describe('GIVEN a client throttled by the rate limit', () => {
    describe('WHEN the code is verified', () => {
      test('THEN the check fails with the rate limit status instead of calling the code invalid', async () => {
        primeFetch(429);

        await expect(verifyInviteCode('beta-code', 'new@user.dev')).rejects.toMatchObject({ status: 429 });
      });
    });
  });

  describe('GIVEN a failing server', () => {
    describe('WHEN the code is verified', () => {
      test('THEN the check fails with the server status', async () => {
        primeFetch(500);

        await expect(verifyInviteCode('beta-code', 'new@user.dev')).rejects.toMatchObject({ status: 500 });
      });
    });
  });
});
