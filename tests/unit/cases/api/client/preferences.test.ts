import { describe, expect, test, vi } from 'vitest';

import type { IPreferences } from '@interfaces';
import { getPreferences, upsertPreferences } from '@api/client';
import { PREFERENCES, PREFERENCE_COLUMNS } from '@mocks/preferences';
import { createClient, primeSupabase } from '@mocks/supabase';

vi.mock('@/lib/supabase', () => import('@mocks/supabase'));

describe('getPreferences', () => {
  describe('GIVEN stored preference columns', () => {
    describe('WHEN preferences are fetched', () => {
      test('THEN the columns map to camel case keys', async () => {
        primeSupabase([{ data: PREFERENCE_COLUMNS }]);

        await expect(getPreferences()).resolves.toEqual(PREFERENCES);
      });
    });
  });

  describe('GIVEN no stored row', () => {
    describe('WHEN preferences are fetched', () => {
      test('THEN nothing is returned', async () => {
        primeSupabase([{ data: null }]);

        await expect(getPreferences()).resolves.toBeNull();
      });
    });
  });

  describe('GIVEN a failing query', () => {
    describe('WHEN preferences are fetched', () => {
      test('THEN the error propagates', async () => {
        primeSupabase([{ error: new Error('db down') }]);

        await expect(getPreferences()).rejects.toThrow('db down');
      });
    });
  });
});

describe('upsertPreferences', () => {
  describe('GIVEN a signed-in user', () => {
    describe('WHEN preferences are saved', () => {
      test('THEN the payload maps to columns with the user id', async () => {
        const { queries } = primeSupabase([{ data: null }]);

        await upsertPreferences(PREFERENCES);

        expect(queries[0]!.upsert).toHaveBeenCalledExactlyOnceWith({ user_id: 'user-1', ...PREFERENCE_COLUMNS });
      });
    });
  });

  describe('GIVEN no signed-in user', () => {
    describe('WHEN preferences are saved', () => {
      test('THEN nothing is written', async () => {
        const { queries } = primeSupabase([{ data: null }], { user: null });

        await upsertPreferences(PREFERENCES);

        expect(queries[0]!.upsert).not.toHaveBeenCalled();
      });
    });
  });

  describe('GIVEN a failing auth check', () => {
    describe('WHEN preferences are saved', () => {
      test('THEN the auth error propagates', async () => {
        vi.mocked(createClient).mockReturnValue({
          auth: { getUser: vi.fn(async () => ({ data: { user: null }, error: new Error('auth down') })) },
        } as never);

        await expect(upsertPreferences(PREFERENCES)).rejects.toThrow('auth down');
      });
    });
  });

  describe('GIVEN a preferences object with an unknown extra key', () => {
    describe('WHEN preferences are saved', () => {
      test('THEN the extra key is filtered from the upsert payload', async () => {
        const { queries } = primeSupabase([{ data: null }]);

        await upsertPreferences({ ...PREFERENCES, extra: 'nope' } as IPreferences);

        expect(queries[0]!.upsert).toHaveBeenCalledExactlyOnceWith({ user_id: 'user-1', ...PREFERENCE_COLUMNS });
      });
    });
  });
});
