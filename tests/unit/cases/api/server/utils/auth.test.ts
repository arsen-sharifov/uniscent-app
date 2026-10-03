import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { verifyPassword } from '@api/server/utils';
import { event } from '@mocks/events';
import { createClient } from '@mocks/supabaseJs';

vi.mock('@supabase/supabase-js', () => import('@mocks/supabaseJs'));
vi.mock('@/lib/events', () => import('@mocks/events'));

const signInWithPassword = vi.fn();
const signOut = vi.fn();

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('verifyPassword', () => {
  describe('GIVEN the public Supabase project settings', () => {
    beforeEach(() => {
      vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://project.supabase.co');
      vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key');
      signInWithPassword.mockResolvedValue({ data: { user: null, session: null }, error: null });
      signOut.mockResolvedValue({ error: null });
      vi.mocked(createClient).mockReturnValue({ auth: { signInWithPassword, signOut } } as never);
    });

    describe('WHEN a password is verified', () => {
      test('THEN a fresh anon client that keeps no session signs in with those credentials', async () => {
        await expect(verifyPassword('user@uniscept.dev', 'secret')).resolves.toEqual({ error: null });
        expect(createClient).toHaveBeenCalledExactlyOnceWith('https://project.supabase.co', 'anon-key', {
          auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
        });
        expect(signInWithPassword).toHaveBeenCalledExactlyOnceWith({ email: 'user@uniscept.dev', password: 'secret' });
      });

      test('THEN the session the check opened is signed out locally', async () => {
        await verifyPassword('user@uniscept.dev', 'secret');

        expect(signOut).toHaveBeenCalledExactlyOnceWith({ scope: 'local' });
      });
    });
  });

  describe('GIVEN a wrong password', () => {
    const failure = { code: 'invalid_credentials', status: 400 };

    beforeEach(() => {
      signInWithPassword.mockResolvedValue({ data: { user: null, session: null }, error: failure });
      vi.mocked(createClient).mockReturnValue({ auth: { signInWithPassword, signOut } } as never);
    });

    describe('WHEN the password is verified', () => {
      test('THEN the sign-in error is returned and no session is signed out', async () => {
        await expect(verifyPassword('user@uniscept.dev', 'wrong')).resolves.toEqual({ error: failure });
        expect(signOut).not.toHaveBeenCalled();
      });
    });
  });

  describe('GIVEN the sign-out of the checked session fails', () => {
    const failure = { message: 'network down', status: 0 };

    beforeEach(() => {
      signInWithPassword.mockResolvedValue({ data: { user: null, session: null }, error: null });
      signOut.mockResolvedValue({ error: failure });
      vi.mocked(createClient).mockReturnValue({ auth: { signInWithPassword, signOut } } as never);
    });

    describe('WHEN a password is verified', () => {
      test('THEN the check still passes and the failure is logged without a toast', async () => {
        await expect(verifyPassword('user@uniscept.dev', 'secret')).resolves.toEqual({ error: null });
        expect(event.error).toHaveBeenCalledExactlyOnceWith(failure, {
          toast: false,
          context: 'auth.endPasswordCheckSession',
        });
      });
    });
  });
});
