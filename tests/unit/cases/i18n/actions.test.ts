import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { TLocale } from '@interfaces';

import { LOCALE_COOKIE, setLocale } from '@/i18n';

const { cookieStore } = vi.hoisted(() => ({ cookieStore: { set: vi.fn(), delete: vi.fn() } }));

vi.mock('next/headers', () => ({ cookies: async () => cookieStore }));

describe('setLocale', () => {
  describe('GIVEN a supported language', () => {
    describe('WHEN it is picked', () => {
      beforeEach(async () => {
        await setLocale('uk');
      });

      test('THEN the locale cookie remembers it', () => {
        expect(cookieStore.set).toHaveBeenCalledExactlyOnceWith(
          LOCALE_COOKIE,
          'uk',
          expect.objectContaining({ httpOnly: true, sameSite: 'lax', path: '/' }),
        );
      });
    });
  });

  describe('GIVEN a forged value outside the supported languages', () => {
    describe('WHEN the action is called with it', () => {
      beforeEach(async () => {
        await setLocale('../en' as TLocale);
      });

      test('THEN no cookie is written', () => {
        expect(cookieStore.set).not.toHaveBeenCalled();
      });
    });
  });
});
