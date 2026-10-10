import { afterEach, describe, expect, test, vi } from 'vitest';

import { addUserBadge, deleteAccount, getUser, updateEmail, updatePassword, updateUserMetadata } from '@api/client';
import { event } from '@mocks/events';
import { primeFetch } from '@mocks/fetch';
import { primeSupabase } from '@mocks/supabase';

vi.mock('@/lib/supabase', () => import('@mocks/supabase'));
vi.mock('@/lib/events', () => import('@mocks/events'));

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('getUser', () => {
  describe('GIVEN an authenticated session', () => {
    describe('WHEN the user is read', () => {
      test('THEN the auth user result is returned', async () => {
        primeSupabase([]);

        await expect(getUser()).resolves.toEqual({ data: { user: { id: 'user-1' } }, error: null });
      });
    });
  });
});

describe('updateUserMetadata', () => {
  describe('GIVEN a profile metadata update', () => {
    describe('WHEN the metadata is saved', () => {
      test('THEN the profile fields are wrapped under data', async () => {
        const { client } = primeSupabase([]);

        await updateUserMetadata({ name: 'Ada', avatarIcon: 'cat' });

        expect(client.auth.updateUser).toHaveBeenCalledExactlyOnceWith({ data: { name: 'Ada', avatarIcon: 'cat' } });
      });
    });
  });
});

describe('updateEmail', () => {
  describe('GIVEN a new email address', () => {
    describe('WHEN the email is updated', () => {
      test('THEN the update carries the new email', async () => {
        const { client } = primeSupabase([]);

        await updateEmail('new@example.com');

        expect(client.auth.updateUser).toHaveBeenCalledExactlyOnceWith({ email: 'new@example.com' });
      });
    });
  });
});

describe('updatePassword', () => {
  describe('GIVEN the server accepts the current password', () => {
    describe('WHEN the password is updated', () => {
      test('THEN both passwords are posted to the change route and the change succeeds', async () => {
        const fetchSpy = primeFetch(200, { success: true });

        await expect(updatePassword('old-secret', 'new-secret')).resolves.toBe(true);
        expect(fetchSpy).toHaveBeenCalledExactlyOnceWith('/auth/change-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currentPassword: 'old-secret', newPassword: 'new-secret' }),
        });
      });
    });
  });

  describe('GIVEN the server rejects the current password', () => {
    describe('WHEN the password is updated', () => {
      test('THEN the change reports the wrong current password instead of failing', async () => {
        primeFetch(400, { error: { message: 'Invalid credentials', code: 'invalid_credentials' } });

        await expect(updatePassword('guess', 'new-secret')).resolves.toBe(false);
      });
    });
  });

  describe('GIVEN the server refuses the new password', () => {
    describe('WHEN the password is updated', () => {
      test('THEN the change fails with the response status and code', async () => {
        primeFetch(422, { error: { message: 'Password update failed', code: 'weak_password' } });

        await expect(updatePassword('old-secret', 'password1')).rejects.toMatchObject({
          message: 'Password update failed',
          status: 422,
          code: 'weak_password',
        });
      });
    });
  });

  describe('GIVEN a failing server without a json body', () => {
    describe('WHEN the password is updated', () => {
      test('THEN the change fails with the fallback message and the status', async () => {
        primeFetch(500);

        await expect(updatePassword('old-secret', 'new-secret')).rejects.toMatchObject({
          message: 'Failed to update password',
          status: 500,
        });
      });
    });
  });
});

describe('deleteAccount', () => {
  describe('GIVEN the server confirms the password', () => {
    describe('WHEN the account is deleted', () => {
      test('THEN the password is posted to the delete route and the session is signed out', async () => {
        const { client } = primeSupabase([]);
        const fetchSpy = primeFetch(200, { success: true });

        await deleteAccount('correct-horse');

        expect(fetchSpy).toHaveBeenCalledExactlyOnceWith('/auth/delete-account', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: 'correct-horse' }),
        });
        expect(client.auth.signOut).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('GIVEN the server rejects the password', () => {
    describe('WHEN the account is deleted', () => {
      test('THEN the deletion fails with the invalid credentials code and the session stays', async () => {
        const { client } = primeSupabase([]);
        primeFetch(400, { error: { message: 'Invalid credentials', code: 'invalid_credentials' } });

        await expect(deleteAccount('guess')).rejects.toMatchObject({ status: 400, code: 'invalid_credentials' });
        expect(client.auth.signOut).not.toHaveBeenCalled();
      });
    });
  });

  describe('GIVEN a deleted account whose local sign out then fails', () => {
    const failure = new Error('auth unreachable');

    describe('WHEN the account is deleted', () => {
      test('THEN the deletion still resolves and the sign out failure is reported quietly', async () => {
        const { client } = primeSupabase([]);
        vi.mocked(client.auth.signOut).mockResolvedValue({ error: failure } as never);
        primeFetch(200, { success: true });

        await expect(deleteAccount('correct-horse')).resolves.toBeUndefined();
        expect(event.error).toHaveBeenCalledExactlyOnceWith(failure, { toast: false, context: 'auth.signOut' });
      });
    });
  });

  describe('GIVEN the server refuses because the account still owns shared workspaces', () => {
    describe('WHEN the account is deleted', () => {
      test('THEN the deletion fails with the shared workspaces code and the session stays', async () => {
        const { client } = primeSupabase([]);
        primeFetch(409, { error: { message: 'Account owns shared workspaces', code: 'owns_shared_workspaces' } });

        await expect(deleteAccount('correct-horse')).rejects.toMatchObject({
          status: 409,
          code: 'owns_shared_workspaces',
        });
        expect(client.auth.signOut).not.toHaveBeenCalled();
      });
    });
  });
});

describe('addUserBadge', () => {
  describe('GIVEN a user whose badges were never written', () => {
    describe('WHEN a badge is awarded', () => {
      test('THEN the default badges are kept alongside the new one', async () => {
        const { client } = primeSupabase([], { user: { id: 'user-1' } });

        await addUserBadge('initiate');

        expect(client.auth.updateUser).toHaveBeenCalledExactlyOnceWith({ data: { badges: ['founder', 'initiate'] } });
      });
    });
  });

  describe('GIVEN a user who already holds the badge', () => {
    describe('WHEN it is awarded again', () => {
      test('THEN nothing is written', async () => {
        const { client } = primeSupabase([], {
          user: { id: 'user-1', user_metadata: { badges: ['founder', 'initiate'] } },
        });

        await addUserBadge('initiate');

        expect(client.auth.updateUser).not.toHaveBeenCalled();
      });
    });
  });

  describe('GIVEN stored badges holding an unknown id', () => {
    describe('WHEN a badge is awarded', () => {
      test('THEN the unknown id is dropped', async () => {
        const { client } = primeSupabase([], {
          user: { id: 'user-1', user_metadata: { badges: ['critic', 'retired'] } },
        });

        await addUserBadge('initiate');

        expect(client.auth.updateUser).toHaveBeenCalledExactlyOnceWith({ data: { badges: ['critic', 'initiate'] } });
      });
    });
  });

  describe('GIVEN a metadata write that fails', () => {
    describe('WHEN a badge is awarded', () => {
      test('THEN the error propagates', async () => {
        const { client } = primeSupabase([], { user: { id: 'user-1' } });
        vi.mocked(client.auth.updateUser).mockResolvedValue({
          data: { user: null },
          error: new Error('auth down'),
        } as never);

        await expect(addUserBadge('initiate')).rejects.toThrow('auth down');
      });
    });
  });
});
