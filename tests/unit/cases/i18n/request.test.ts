import { beforeEach, describe, expect, test, vi } from 'vitest';

import { primeSupabase } from '@mocks/supabase';
import { createClient as createServerClient } from '@mocks/supabaseServer';
import requestConfig from '@/i18n/request';
import en from '@/locales/en.json';
import fr from '@/locales/fr.json';
import uk from '@/locales/uk.json';

const resolveConfig = requestConfig as unknown as () => Promise<{ locale: string; messages: unknown }>;

const { cookies, headers } = vi.hoisted(() => ({ cookies: vi.fn(), headers: vi.fn() }));

vi.mock('next-intl/server', () => ({
  getRequestConfig: (factory: () => Promise<unknown>) => factory,
}));

vi.mock('next/headers', () => ({ cookies, headers }));

vi.mock('@/lib/supabase/server', () => import('@mocks/supabaseServer'));

const primeRequest = (options: { pathname?: string; cookieLocale?: string; accepted?: string }) => {
  headers.mockResolvedValue(
    new Map<string, string>([
      ...(options.pathname ? ([['x-pathname', options.pathname]] as const) : []),
      ...(options.accepted ? ([['accept-language', options.accepted]] as const) : []),
    ]),
  );
  cookies.mockResolvedValue({
    get: () => (options.cookieLocale ? { value: options.cookieLocale } : undefined),
  });
};

describe('requestConfig', () => {
  describe('GIVEN a public page, a browser asking for french and ukrainian picked earlier', () => {
    beforeEach(() => {
      primeRequest({ pathname: '/login', cookieLocale: 'uk', accepted: 'fr-FR,fr;q=0.9' });
    });

    describe('WHEN the request locale is resolved', () => {
      test('THEN the picked language wins over the browser', async () => {
        await expect(resolveConfig()).resolves.toMatchObject({ locale: 'uk', messages: uk });
      });
    });
  });

  describe('GIVEN a visitor whose browser asks for ukrainian on a public page', () => {
    beforeEach(() => {
      primeRequest({ pathname: '/', accepted: 'uk-UA,uk;q=0.9,en-US;q=0.8' });
    });

    describe('WHEN the request locale is resolved', () => {
      test('THEN the landing speaks their language without an account', async () => {
        await expect(resolveConfig()).resolves.toMatchObject({ locale: 'uk', messages: uk });
      });
    });
  });

  describe('GIVEN a browser that ranks a supported language below an unsupported one', () => {
    beforeEach(() => {
      primeRequest({ pathname: '/signup', accepted: 'de-DE,de;q=0.9,fr;q=0.5,uk;q=0.2' });
    });

    describe('WHEN the request locale is resolved', () => {
      test('THEN the best supported language wins', async () => {
        await expect(resolveConfig()).resolves.toMatchObject({ locale: 'fr', messages: fr });
      });
    });
  });

  describe('GIVEN a browser asking only for unsupported languages', () => {
    beforeEach(() => {
      primeRequest({ pathname: '/', accepted: 'de-DE,de;q=0.9' });
    });

    describe('WHEN the request locale is resolved', () => {
      test('THEN english carries the page', async () => {
        await expect(resolveConfig()).resolves.toMatchObject({ locale: 'en', messages: en });
      });
    });
  });

  describe('GIVEN an auth callback from a browser asking for ukrainian', () => {
    beforeEach(() => {
      primeRequest({ pathname: '/auth/confirmed', accepted: 'uk-UA,uk;q=0.9' });
    });

    describe('WHEN the request locale is resolved', () => {
      test('THEN the browser language is served without looking up the account', async () => {
        await expect(resolveConfig()).resolves.toMatchObject({ locale: 'uk' });
        expect(createServerClient).not.toHaveBeenCalled();
      });
    });
  });

  describe('GIVEN a supported cookie locale on a regular pathname', () => {
    beforeEach(() => {
      primeRequest({ pathname: '/platform', cookieLocale: 'uk' });
    });

    describe('WHEN the request locale is resolved', () => {
      test('THEN the cookie locale is served with its dictionary', async () => {
        await expect(resolveConfig()).resolves.toMatchObject({ locale: 'uk', messages: uk });
      });
    });
  });

  describe('GIVEN an unsupported cookie locale and a stored user preference', () => {
    beforeEach(() => {
      primeRequest({ pathname: '/platform', cookieLocale: 'xx' });
      const { client } = primeSupabase([{ data: { language: 'fr' } }], { user: { id: 'user-1' } });
      vi.mocked(createServerClient).mockResolvedValue(client as never);
    });

    describe('WHEN the request locale is resolved', () => {
      test('THEN the database preference is served', async () => {
        await expect(resolveConfig()).resolves.toMatchObject({ locale: 'fr', messages: fr });
      });
    });
  });

  describe('GIVEN no cookie and no authenticated user', () => {
    beforeEach(() => {
      primeRequest({ pathname: '/platform', accepted: 'pt-PT,pt;q=0.9' });
      const { client } = primeSupabase([], { user: null });
      vi.mocked(createServerClient).mockResolvedValue(client as never);
    });

    describe('WHEN the request locale is resolved', () => {
      test('THEN the browser language is served', async () => {
        await expect(resolveConfig()).resolves.toMatchObject({ locale: 'pt' });
      });
    });
  });

  describe('GIVEN an authenticated user without a preferences row, browsing in french', () => {
    beforeEach(() => {
      primeRequest({ pathname: '/platform', accepted: 'fr-FR,fr;q=0.9' });
      const { client } = primeSupabase([{ data: null }], { user: { id: 'user-1' } });
      vi.mocked(createServerClient).mockResolvedValue(client as never);
    });

    describe('WHEN the request locale is resolved', () => {
      test('THEN the browser language is served', async () => {
        await expect(resolveConfig()).resolves.toMatchObject({ locale: 'fr', messages: fr });
      });
    });
  });

  describe('GIVEN a stored preference outside the supported languages, browsing in french', () => {
    beforeEach(() => {
      primeRequest({ pathname: '/platform', accepted: 'fr-FR,fr;q=0.9' });
      const { client } = primeSupabase([{ data: { language: '../en' } }], { user: { id: 'user-1' } });
      vi.mocked(createServerClient).mockResolvedValue(client as never);
    });

    describe('WHEN the request locale is resolved', () => {
      test('THEN the stored value is ignored and the browser language is served', async () => {
        await expect(resolveConfig()).resolves.toMatchObject({ locale: 'fr', messages: fr });
      });
    });
  });

  describe('GIVEN a failing supabase client and a browser asking for ukrainian', () => {
    beforeEach(() => {
      primeRequest({ pathname: '/platform', accepted: 'uk-UA,uk;q=0.9' });
      vi.mocked(createServerClient).mockRejectedValue(new Error('connection refused'));
    });

    describe('WHEN the request locale is resolved', () => {
      test('THEN the failure falls back to the browser language', async () => {
        await expect(resolveConfig()).resolves.toMatchObject({ locale: 'uk', messages: uk });
      });
    });
  });
});
