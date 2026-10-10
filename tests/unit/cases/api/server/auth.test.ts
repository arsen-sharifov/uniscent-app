import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import {
  INVITE_RATE_LIMIT_MAX_ATTEMPTS,
  INVITE_RATE_LIMIT_WINDOW_MS,
  PASSWORD_CHECK_RATE_LIMIT_MAX_ATTEMPTS,
} from '@constants';
import { handleChangePassword, handleDeleteAccount, handleVerifyInvite } from '@api/server';
import { getAdminClient } from '@mocks/adminClient';
import { event } from '@mocks/events';
import { verifyPassword } from '@mocks/serverAuth';
import { primeSupabase } from '@mocks/supabase';
import { createClient as createServerClient } from '@mocks/supabaseServer';

vi.mock('@/lib/supabase/server', () => import('@mocks/supabaseServer'));
vi.mock('@api/server/utils/adminClient', () => import('@mocks/adminClient'));
vi.mock('@api/server/utils/auth', () => import('@mocks/serverAuth'));
vi.mock('@/lib/events', () => import('@mocks/events'));

const deleteUser = vi.fn();
const rpc = vi.fn();

const WRONG_PASSWORD = { data: { user: null, session: null }, error: { code: 'invalid_credentials', status: 400 } };

const primeServer = (user: { id: string; email?: string } | null) => {
  const { client } = primeSupabase([], { user });
  vi.mocked(createServerClient).mockResolvedValue(client as never);

  return client;
};

const verifyRequest = (ip: string, body: unknown, headers?: Record<string, string>): Request =>
  new Request('http://localhost/auth/verify-invite', {
    method: 'POST',
    headers: { 'x-forwarded-for': ip, ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

const deleteRequest = (body: unknown, headers?: Record<string, string>): Request =>
  new Request('http://localhost/auth/delete-account', { method: 'POST', headers, body: JSON.stringify(body) });

const changeRequest = (body: unknown, headers?: Record<string, string>): Request =>
  new Request('http://localhost/auth/change-password', { method: 'POST', headers, body: JSON.stringify(body) });

beforeEach(() => {
  vi.stubEnv('INVITE_CODE', 'secret-code');
  rpc.mockResolvedValue({ data: null, error: null });
  verifyPassword.mockResolvedValue({ data: {}, error: null });
  deleteUser.mockResolvedValue({ data: {}, error: null });
  vi.mocked(getAdminClient).mockReturnValue({ rpc, auth: { admin: { deleteUser } } } as never);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('handleVerifyInvite', () => {
  describe('GIVEN the correct invite code and a signup email', () => {
    describe('WHEN the invite is verified', () => {
      test('THEN the code is accepted', async () => {
        const response = await handleVerifyInvite(
          verifyRequest('ip-happy', { code: 'secret-code', email: 'new@user.dev' }),
        );

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toEqual({ valid: true });
      });

      test('THEN a signup allowance is granted for the normalized email', async () => {
        await handleVerifyInvite(verifyRequest('ip-allowance', { code: 'secret-code', email: '  New@User.DEV ' }));

        expect(rpc.mock.calls).toEqual([['grant_signup_allowance', { p_email: 'new@user.dev' }]]);
      });
    });
  });

  describe('GIVEN the correct invite code and a failing allowance grant', () => {
    beforeEach(() => {
      rpc.mockResolvedValue({ data: null, error: { message: 'relation does not exist', code: '42P01' } });
    });

    describe('WHEN the invite is verified', () => {
      test('THEN the check fails as a server error without leaking the database message', async () => {
        const response = await handleVerifyInvite(
          verifyRequest('ip-grant-fail', { code: 'secret-code', email: 'new@user.dev' }),
        );

        expect(response.status).toBe(500);
        await expect(response.json()).resolves.toEqual({ valid: false });
        expect(event.error).toHaveBeenCalledExactlyOnceWith(
          { message: 'relation does not exist', code: '42P01' },
          { toast: false, context: 'auth.grantSignupAllowance' },
        );
      });
    });
  });

  describe('GIVEN a wrong code of the same length', () => {
    describe('WHEN the invite is verified', () => {
      test('THEN the code is rejected and no allowance is granted', async () => {
        const response = await handleVerifyInvite(
          verifyRequest('ip-wrong', { code: 'secret-codf', email: 'new@user.dev' }),
        );

        expect(response.status).toBe(403);
        await expect(response.json()).resolves.toEqual({ valid: false });
        expect(rpc).not.toHaveBeenCalled();
      });
    });
  });

  describe('GIVEN a code with a different length', () => {
    describe('WHEN the invite is verified', () => {
      test('THEN the code is rejected', async () => {
        const response = await handleVerifyInvite(verifyRequest('ip-short', { code: 'nope', email: 'new@user.dev' }));

        expect(response.status).toBe(403);
      });
    });
  });

  describe('GIVEN a non-string code', () => {
    describe('WHEN the invite is verified', () => {
      test('THEN the code is rejected', async () => {
        const response = await handleVerifyInvite(verifyRequest('ip-number', { code: 42, email: 'new@user.dev' }));

        expect(response.status).toBe(403);
      });
    });
  });

  describe('GIVEN the correct code without a valid email', () => {
    describe('WHEN the invite is verified', () => {
      test('THEN the request is rejected before the code is checked', async () => {
        const response = await handleVerifyInvite(verifyRequest('ip-no-email', { code: 'secret-code', email: 'nope' }));

        expect(response.status).toBe(400);
        expect(rpc).not.toHaveBeenCalled();
      });
    });
  });

  describe('GIVEN a malformed request body', () => {
    describe('WHEN the invite is verified', () => {
      test('THEN the request is rejected', async () => {
        const response = await handleVerifyInvite(verifyRequest('ip-broken', 'not json'));

        expect(response.status).toBe(400);
        expect(rpc).not.toHaveBeenCalled();
      });
    });
  });

  describe('GIVEN no configured invite code', () => {
    describe('WHEN the invite is verified', () => {
      test('THEN every code is rejected', async () => {
        vi.stubEnv('INVITE_CODE', '');

        const response = await handleVerifyInvite(verifyRequest('ip-unset', { code: '', email: 'new@user.dev' }));

        expect(response.status).toBe(403);
        expect(rpc).not.toHaveBeenCalled();
      });
    });
  });

  describe('GIVEN a request sent from another site', () => {
    describe('WHEN the browser marks the request as cross-site', () => {
      test('THEN the request is forbidden and no allowance is granted', async () => {
        const response = await handleVerifyInvite(
          verifyRequest(
            'ip-cross-site',
            { code: 'secret-code', email: 'new@user.dev' },
            { 'sec-fetch-site': 'cross-site' },
          ),
        );

        expect(response.status).toBe(403);
        expect(rpc).not.toHaveBeenCalled();
      });
    });

    describe('WHEN a foreign origin header is sent without fetch metadata', () => {
      test('THEN the request is forbidden', async () => {
        const response = await handleVerifyInvite(
          verifyRequest(
            'ip-foreign-origin',
            { code: 'secret-code', email: 'new@user.dev' },
            { origin: 'https://evil.example', host: 'localhost' },
          ),
        );

        expect(response.status).toBe(403);
      });
    });

    describe('WHEN a matching origin header is sent without fetch metadata', () => {
      test('THEN the code is accepted', async () => {
        const response = await handleVerifyInvite(
          verifyRequest(
            'ip-own-origin',
            { code: 'secret-code', email: 'new@user.dev' },
            { origin: 'http://localhost:3000', host: 'localhost:3000' },
          ),
        );

        expect(response.status).toBe(200);
      });
    });
  });

  describe('GIVEN a client identified through x-real-ip', () => {
    describe('WHEN the invite is verified', () => {
      test('THEN the code is accepted', async () => {
        const request = new Request('http://localhost/auth/verify-invite', {
          method: 'POST',
          headers: { 'x-real-ip': 'ip-real' },
          body: JSON.stringify({ code: 'secret-code', email: 'new@user.dev' }),
        });

        const response = await handleVerifyInvite(request);

        expect(response.status).toBe(200);
      });
    });
  });

  describe('GIVEN a client without ip headers', () => {
    describe('WHEN the invite is verified', () => {
      test('THEN the code is accepted through the fallback bucket', async () => {
        const request = new Request('http://localhost/auth/verify-invite', {
          method: 'POST',
          body: JSON.stringify({ code: 'secret-code', email: 'new@user.dev' }),
        });

        const response = await handleVerifyInvite(request);

        expect(response.status).toBe(200);
      });
    });
  });

  describe('GIVEN a client that exhausted the rate limit', () => {
    describe('WHEN the limit is exceeded within the window', () => {
      test('THEN the request is throttled before the code is even checked', async () => {
        const allowed = await Promise.all(
          Array.from({ length: INVITE_RATE_LIMIT_MAX_ATTEMPTS }, () =>
            handleVerifyInvite(verifyRequest('ip-flood', { code: 'wrong-code!', email: 'new@user.dev' })),
          ),
        );

        expect(allowed.every((response) => response.status === 403)).toBe(true);

        const throttled = await handleVerifyInvite(
          verifyRequest('ip-flood', { code: 'secret-code', email: 'new@user.dev' }),
        );

        expect(throttled.status).toBe(429);
        await expect(throttled.json()).resolves.toEqual({ valid: false });
        expect(rpc).not.toHaveBeenCalled();
      });
    });
  });

  describe('GIVEN a throttled client whose rate limit window has elapsed', () => {
    beforeEach(async () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      await Promise.all(
        Array.from({ length: INVITE_RATE_LIMIT_MAX_ATTEMPTS + 1 }, () =>
          handleVerifyInvite(verifyRequest('ip-window', { code: 'wrong-code!', email: 'new@user.dev' })),
        ),
      );
      vi.setSystemTime(Date.now() + INVITE_RATE_LIMIT_WINDOW_MS);
    });

    describe('WHEN the invite is verified again', () => {
      test('THEN a fresh window accepts the code', async () => {
        const response = await handleVerifyInvite(
          verifyRequest('ip-window', { code: 'secret-code', email: 'new@user.dev' }),
        );

        expect(response.status).toBe(200);
      });
    });
  });
});

describe('handleDeleteAccount', () => {
  describe('GIVEN no authenticated user', () => {
    beforeEach(() => {
      primeServer(null);
    });

    describe('WHEN the account deletion is requested', () => {
      test('THEN the request is unauthorized before any password check', async () => {
        const response = await handleDeleteAccount(deleteRequest({ password: 'correct-horse' }));

        expect(response.status).toBe(401);
        await expect(response.json()).resolves.toEqual({ error: { message: 'Unauthorized' } });
        expect(verifyPassword).not.toHaveBeenCalled();
        expect(deleteUser).not.toHaveBeenCalled();
      });
    });
  });

  describe('GIVEN an authenticated user who knows the password', () => {
    let client: ReturnType<typeof primeServer>;

    beforeEach(() => {
      client = primeServer({ id: 'user-delete', email: 'delete@uniscept.dev' });
      vi.mocked(client.rpc).mockResolvedValue({ data: [], error: null });
    });

    describe('WHEN the deletion is confirmed from the app', () => {
      test('THEN the password and the shared workspaces are checked and exactly that user is deleted', async () => {
        const response = await handleDeleteAccount(
          deleteRequest({ password: 'correct-horse' }, { 'sec-fetch-site': 'same-origin' }),
        );

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toEqual({ success: true });
        expect(verifyPassword.mock.calls).toEqual([['delete@uniscept.dev', 'correct-horse']]);
        expect(client.rpc.mock.calls).toEqual([['get_my_owned_shared_workspaces']]);
        expect(deleteUser.mock.calls).toEqual([['user-delete']]);
      });
    });

    describe('WHEN the deletion is confirmed without a password', () => {
      test('THEN the request is rejected before the password check', async () => {
        const response = await handleDeleteAccount(deleteRequest({}));

        expect(response.status).toBe(400);
        await expect(response.json()).resolves.toEqual({ error: { message: 'Invalid request' } });
        expect(verifyPassword).not.toHaveBeenCalled();
        expect(deleteUser).not.toHaveBeenCalled();
      });
    });

    describe('WHEN a cross-site page submits the deletion', () => {
      test('THEN the request is forbidden and nothing is deleted', async () => {
        const response = await handleDeleteAccount(
          deleteRequest({ password: 'correct-horse' }, { 'sec-fetch-site': 'cross-site' }),
        );

        expect(response.status).toBe(403);
        expect(verifyPassword).not.toHaveBeenCalled();
        expect(deleteUser).not.toHaveBeenCalled();
      });
    });

    describe('WHEN a same-site sibling submits the deletion', () => {
      test('THEN the request is forbidden and nothing is deleted', async () => {
        const response = await handleDeleteAccount(
          deleteRequest({ password: 'correct-horse' }, { 'sec-fetch-site': 'same-site' }),
        );

        expect(response.status).toBe(403);
        expect(deleteUser).not.toHaveBeenCalled();
      });
    });
  });

  describe('GIVEN an authenticated user who types a wrong password', () => {
    let client: ReturnType<typeof primeServer>;

    beforeEach(() => {
      client = primeServer({ id: 'user-delete-wrong', email: 'wrong@uniscept.dev' });
      verifyPassword.mockResolvedValue(WRONG_PASSWORD);
    });

    describe('WHEN the deletion is confirmed', () => {
      test('THEN the invalid credentials code comes back before the workspaces are checked and nothing is deleted', async () => {
        const response = await handleDeleteAccount(deleteRequest({ password: 'guess' }));

        expect(response.status).toBe(400);
        await expect(response.json()).resolves.toEqual({
          error: { message: 'Invalid credentials', code: 'invalid_credentials' },
        });
        expect(client.rpc).not.toHaveBeenCalled();
        expect(deleteUser).not.toHaveBeenCalled();
        expect(event.error).not.toHaveBeenCalled();
      });
    });
  });

  describe('GIVEN an owner of a workspace that other members still use', () => {
    beforeEach(() => {
      const client = primeServer({ id: 'user-delete-owner', email: 'owner@uniscept.dev' });
      vi.mocked(client.rpc).mockResolvedValue({ data: [{ id: 'ws-shared', name: 'Shared space' }], error: null });
    });

    describe('WHEN the deletion is confirmed with the right password', () => {
      test('THEN the deletion is refused with the shared workspaces code and nothing is deleted', async () => {
        const response = await handleDeleteAccount(deleteRequest({ password: 'correct-horse' }));

        expect(response.status).toBe(409);
        await expect(response.json()).resolves.toEqual({
          error: { message: 'Account owns shared workspaces', code: 'owns_shared_workspaces' },
        });
        expect(deleteUser).not.toHaveBeenCalled();
      });
    });
  });

  describe('GIVEN a shared workspace check the database fails to answer', () => {
    const checkFailure = { message: 'function does not exist', code: '42883' };

    beforeEach(() => {
      const client = primeServer({ id: 'user-delete-check', email: 'check@uniscept.dev' });
      vi.mocked(client.rpc).mockResolvedValue({ data: null, error: checkFailure });
    });

    describe('WHEN the deletion is confirmed', () => {
      test('THEN a generic server error comes back, the failure is reported and nothing is deleted', async () => {
        const response = await handleDeleteAccount(deleteRequest({ password: 'correct-horse' }));

        expect(response.status).toBe(500);
        await expect(response.json()).resolves.toEqual({ error: { message: 'Account deletion failed' } });
        expect(event.error).toHaveBeenCalledExactlyOnceWith(checkFailure, {
          toast: false,
          context: 'auth.checkSharedWorkspaces',
        });
        expect(deleteUser).not.toHaveBeenCalled();
      });
    });
  });

  describe('GIVEN a password check the auth server fails to answer', () => {
    beforeEach(() => {
      primeServer({ id: 'user-delete-outage', email: 'outage@uniscept.dev' });
      verifyPassword.mockResolvedValue({ data: {}, error: { code: 'unexpected_failure', status: 500 } });
    });

    describe('WHEN the deletion is confirmed', () => {
      test('THEN a generic server error comes back, the failure is reported and nothing is deleted', async () => {
        const response = await handleDeleteAccount(deleteRequest({ password: 'correct-horse' }));

        expect(response.status).toBe(500);
        await expect(response.json()).resolves.toEqual({
          error: { message: 'Password check failed', code: 'unexpected_failure' },
        });
        expect(event.error).toHaveBeenCalledExactlyOnceWith(
          { code: 'unexpected_failure', status: 500 },
          { toast: false, context: 'auth.verifyPassword' },
        );
        expect(deleteUser).not.toHaveBeenCalled();
      });
    });
  });

  describe('GIVEN a password check the auth server throttles', () => {
    beforeEach(() => {
      primeServer({ id: 'user-delete-throttled', email: 'throttled@uniscept.dev' });
      verifyPassword.mockResolvedValue({ data: {}, error: { code: 'over_request_rate_limit', status: 429 } });
    });

    describe('WHEN the deletion is confirmed', () => {
      test('THEN the throttle reaches the client as a rate limit and nothing is deleted', async () => {
        const response = await handleDeleteAccount(deleteRequest({ password: 'correct-horse' }));

        expect(response.status).toBe(429);
        await expect(response.json()).resolves.toEqual({
          error: { message: 'Password check failed', code: 'over_request_rate_limit' },
        });
        expect(deleteUser).not.toHaveBeenCalled();
      });
    });
  });

  describe('GIVEN a user who exhausted the password attempts', () => {
    beforeEach(async () => {
      primeServer({ id: 'user-delete-flood', email: 'flood@uniscept.dev' });
      verifyPassword.mockResolvedValue(WRONG_PASSWORD);
      await Promise.all(
        Array.from({ length: PASSWORD_CHECK_RATE_LIMIT_MAX_ATTEMPTS }, () =>
          handleDeleteAccount(deleteRequest({ password: 'guess' })),
        ),
      );
      verifyPassword.mockClear();
    });

    describe('WHEN another deletion is confirmed', () => {
      test('THEN the request is throttled before the password is checked', async () => {
        const response = await handleDeleteAccount(deleteRequest({ password: 'correct-horse' }));

        expect(response.status).toBe(429);
        expect(verifyPassword).not.toHaveBeenCalled();
        expect(deleteUser).not.toHaveBeenCalled();
      });
    });

    describe('WHEN the password change is attempted instead', () => {
      test('THEN the shared limit throttles it as well', async () => {
        const response = await handleChangePassword(
          changeRequest({ currentPassword: 'correct-horse', newPassword: 'new-secret-1' }),
        );

        expect(response.status).toBe(429);
        expect(verifyPassword).not.toHaveBeenCalled();
      });
    });
  });

  describe('GIVEN a failing admin deletion', () => {
    beforeEach(() => {
      primeServer({ id: 'user-delete-admin', email: 'admin-fail@uniscept.dev' });
      deleteUser.mockResolvedValue({ data: null, error: { message: 'admin api unavailable' } });
    });

    describe('WHEN the deletion is confirmed', () => {
      test('THEN the failure surfaces as a generic server error', async () => {
        const response = await handleDeleteAccount(deleteRequest({ password: 'correct-horse' }));

        expect(response.status).toBe(500);
        await expect(response.json()).resolves.toEqual({ error: { message: 'Account deletion failed' } });
        expect(event.error).toHaveBeenCalledExactlyOnceWith(
          { message: 'admin api unavailable' },
          { toast: false, context: 'auth.deleteAccount' },
        );
      });
    });
  });
});

describe('handleChangePassword', () => {
  describe('GIVEN no authenticated user', () => {
    beforeEach(() => {
      primeServer(null);
    });

    describe('WHEN a new password is submitted', () => {
      test('THEN the request is unauthorized before any password check', async () => {
        const response = await handleChangePassword(
          changeRequest({ currentPassword: 'old-secret', newPassword: 'new-secret-1' }),
        );

        expect(response.status).toBe(401);
        await expect(response.json()).resolves.toEqual({ error: { message: 'Unauthorized' } });
        expect(verifyPassword).not.toHaveBeenCalled();
      });
    });
  });

  describe('GIVEN an authenticated user who knows the current password', () => {
    let client: ReturnType<typeof primeServer>;

    beforeEach(() => {
      client = primeServer({ id: 'user-change', email: 'change@uniscept.dev' });
    });

    describe('WHEN a new password is submitted from the app', () => {
      test('THEN the current password is checked and the session updates with both passwords', async () => {
        const response = await handleChangePassword(
          changeRequest(
            { currentPassword: 'old-secret', newPassword: 'new-secret-1' },
            { 'sec-fetch-site': 'same-origin' },
          ),
        );

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toEqual({ success: true });
        expect(verifyPassword.mock.calls).toEqual([['change@uniscept.dev', 'old-secret']]);
        expect(client.auth.updateUser).toHaveBeenCalledExactlyOnceWith({
          password: 'new-secret-1',
          current_password: 'old-secret',
        });
      });
    });

    describe('WHEN a cross-site page submits the change', () => {
      test('THEN the request is forbidden and nothing is updated', async () => {
        const response = await handleChangePassword(
          changeRequest(
            { currentPassword: 'old-secret', newPassword: 'new-secret-1' },
            { 'sec-fetch-site': 'cross-site' },
          ),
        );

        expect(response.status).toBe(403);
        expect(client.auth.updateUser).not.toHaveBeenCalled();
      });
    });

    describe('WHEN the change is submitted without a new password', () => {
      test('THEN the request is rejected before the password check', async () => {
        const response = await handleChangePassword(changeRequest({ currentPassword: 'old-secret' }));

        expect(response.status).toBe(400);
        expect(verifyPassword).not.toHaveBeenCalled();
        expect(client.auth.updateUser).not.toHaveBeenCalled();
      });
    });

    describe('WHEN the change is submitted without the current password', () => {
      test('THEN the request is rejected and nothing is updated', async () => {
        const response = await handleChangePassword(changeRequest({ newPassword: 'new-secret-1' }));

        expect(response.status).toBe(400);
        expect(verifyPassword).not.toHaveBeenCalled();
        expect(client.auth.updateUser).not.toHaveBeenCalled();
      });
    });
  });

  describe('GIVEN an authenticated user who types a wrong current password', () => {
    let client: ReturnType<typeof primeServer>;

    beforeEach(() => {
      client = primeServer({ id: 'user-change-wrong', email: 'change-wrong@uniscept.dev' });
      verifyPassword.mockResolvedValue(WRONG_PASSWORD);
    });

    describe('WHEN a new password is submitted', () => {
      test('THEN the invalid credentials code comes back and the password stays', async () => {
        const response = await handleChangePassword(
          changeRequest({ currentPassword: 'guess', newPassword: 'new-secret-1' }),
        );

        expect(response.status).toBe(400);
        await expect(response.json()).resolves.toEqual({
          error: { message: 'Invalid credentials', code: 'invalid_credentials' },
        });
        expect(client.auth.updateUser).not.toHaveBeenCalled();
      });
    });
  });

  describe('GIVEN a new password the auth server refuses', () => {
    beforeEach(() => {
      const client = primeServer({ id: 'user-change-weak', email: 'weak@uniscept.dev' });
      vi.mocked(client.auth.updateUser).mockResolvedValue({
        data: { user: null },
        error: { code: 'weak_password', status: 422, message: 'Password is known to be weak' },
      } as never);
    });

    describe('WHEN it is submitted', () => {
      test('THEN the refusal keeps its status and code behind a generic message and is reported', async () => {
        const response = await handleChangePassword(
          changeRequest({ currentPassword: 'old-secret', newPassword: 'password1' }),
        );

        expect(response.status).toBe(422);
        await expect(response.json()).resolves.toEqual({
          error: { message: 'Password update failed', code: 'weak_password' },
        });
        expect(event.error).toHaveBeenCalledExactlyOnceWith(
          { code: 'weak_password', status: 422, message: 'Password is known to be weak' },
          { toast: false, context: 'auth.changePassword' },
        );
      });
    });
  });

  describe('GIVEN a password update that never reaches the auth server', () => {
    beforeEach(() => {
      const client = primeServer({ id: 'user-change-offline', email: 'offline@uniscept.dev' });
      vi.mocked(client.auth.updateUser).mockResolvedValue({
        data: { user: null },
        error: { status: 0, message: 'fetch failed' },
      } as never);
    });

    describe('WHEN it is submitted', () => {
      test('THEN a generic server error comes back', async () => {
        const response = await handleChangePassword(
          changeRequest({ currentPassword: 'old-secret', newPassword: 'new-secret-1' }),
        );

        expect(response.status).toBe(500);
        await expect(response.json()).resolves.toEqual({ error: { message: 'Password update failed' } });
      });
    });
  });
});
