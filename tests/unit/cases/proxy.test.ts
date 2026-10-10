import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { createServerClient } from '@mocks/supabaseSsr';
import { config, proxy } from '@/proxy';

vi.mock('@supabase/ssr', () => import('@mocks/supabaseSsr'));

const getUser = vi.fn();
const exchangeCodeForSession = vi.fn();

let response: Response;

const primeSession = (options: {
  user?: { id: string } | null;
  exchangeError?: Error | null;
  isRefreshed?: boolean;
}) => {
  vi.mocked(createServerClient).mockImplementation(
    (_url: string, _key: string, config: { cookies: { setAll: (cookies: unknown[]) => void } }) => {
      const storeFreshSession = () =>
        config.cookies.setAll([{ name: 'sb-session', value: 'fresh', options: { path: '/' } }]);

      getUser.mockImplementation(async () => {
        if (options.isRefreshed) storeFreshSession();

        return { data: { user: options.user ?? null } };
      });
      exchangeCodeForSession.mockImplementation(async () => {
        storeFreshSession();

        return { error: options.exchangeError ?? null };
      });

      return { auth: { getUser, exchangeCodeForSession } };
    },
  );
};

const location = () => new URL(response.headers.get('location') ?? '');

const nonceOf = (policy: string | null) => /'nonce-([^']+)'/.exec(policy ?? '')?.[1];

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://project.supabase.co');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('proxy', () => {
  describe('GIVEN a guest', () => {
    beforeEach(() => {
      primeSession({ user: null });
    });

    describe('WHEN they open the platform', () => {
      beforeEach(async () => {
        response = await proxy(new NextRequest('http://localhost:3000/platform/ws-1'));
      });

      test('THEN they are sent to the login page', () => {
        expect(response.status).toBe(307);
        expect(location().pathname).toBe('/login');
      });
    });

    describe('WHEN they open the landing page', () => {
      beforeEach(async () => {
        response = await proxy(new NextRequest('http://localhost:3000/'));
      });

      test('THEN the page renders with its path forwarded to the request config', () => {
        expect(response.headers.get('location')).toBeNull();
        expect(response.headers.get('x-middleware-request-x-pathname')).toBe('/');
      });
    });

    describe('WHEN they open the join page', () => {
      beforeEach(async () => {
        response = await proxy(new NextRequest('http://localhost:3000/join'));
      });

      test('THEN the public page renders without a redirect', () => {
        expect(response.headers.get('location')).toBeNull();
        expect(response.headers.get('x-middleware-request-x-pathname')).toBe('/join');
      });
    });

    describe('WHEN they call an auth route', () => {
      beforeEach(async () => {
        response = await proxy(new NextRequest('http://localhost:3000/auth/verify-invite'));
      });

      test('THEN the user check is skipped and the route runs', () => {
        expect(response.headers.get('location')).toBeNull();
        expect(getUser).not.toHaveBeenCalled();
      });
    });
  });

  describe('GIVEN a signed-in user', () => {
    beforeEach(() => {
      primeSession({ user: { id: 'user-1' } });
    });

    describe('WHEN they open the sign-in page with a query', () => {
      beforeEach(async () => {
        response = await proxy(new NextRequest('http://localhost:3000/login?emailSent=true'));
      });

      test('THEN they are sent to the platform without the query', () => {
        expect(response.status).toBe(307);
        expect(location().pathname).toBe('/platform');
        expect(location().search).toBe('');
      });
    });

    describe('WHEN they open the sign-up page', () => {
      beforeEach(async () => {
        response = await proxy(new NextRequest('http://localhost:3000/signup'));
      });

      test('THEN they are sent to the platform', () => {
        expect(location().pathname).toBe('/platform');
      });
    });

    describe('WHEN they open the platform', () => {
      beforeEach(async () => {
        response = await proxy(new NextRequest('http://localhost:3000/platform'));
      });

      test('THEN the page renders', () => {
        expect(response.headers.get('location')).toBeNull();
        expect(response.headers.get('x-middleware-request-x-pathname')).toBe('/platform');
      });
    });

    describe('WHEN they open an emailed invitation link', () => {
      beforeEach(async () => {
        response = await proxy(new NextRequest('http://localhost:3000/join?token_hash=abc'));
      });

      test('THEN the join page renders untouched so it can offer the account choice', () => {
        expect(response.headers.get('location')).toBeNull();
        expect(response.headers.get('x-middleware-request-x-pathname')).toBe('/join');
        expect(exchangeCodeForSession).not.toHaveBeenCalled();
      });
    });
  });

  describe('GIVEN a signed-in user whose expired session the proxy refreshes', () => {
    beforeEach(() => {
      primeSession({ user: { id: 'user-1' }, isRefreshed: true });
    });

    describe('WHEN they open the platform', () => {
      beforeEach(async () => {
        response = await proxy(
          new NextRequest('http://localhost:3000/platform', { headers: { cookie: 'sb-session=stale; theme=dark' } }),
        );
      });

      test('THEN the render reads the refreshed session and the browser stores it', () => {
        expect(response.headers.get('x-middleware-request-cookie')).toBe('sb-session=fresh; theme=dark');
        expect(response.headers.get('set-cookie')).toContain('sb-session=fresh');
      });

      test('THEN the nonce, policy and path are still forwarded to the render', () => {
        const policy = response.headers.get('content-security-policy');

        expect(response.headers.get('x-middleware-request-content-security-policy')).toBe(policy);
        expect(response.headers.get('x-middleware-request-x-nonce')).toBe(nonceOf(policy));
        expect(response.headers.get('x-middleware-request-x-pathname')).toBe('/platform');
      });
    });

    describe('WHEN they open the sign-in page', () => {
      beforeEach(async () => {
        response = await proxy(
          new NextRequest('http://localhost:3000/login', { headers: { cookie: 'sb-session=stale' } }),
        );
      });

      test('THEN the redirect to the platform still hands the refreshed session to the browser', () => {
        expect(location().pathname).toBe('/platform');
        expect(response.headers.get('set-cookie')).toContain('sb-session=fresh');
      });
    });
  });

  describe('GIVEN an email confirmation link carrying a valid code', () => {
    beforeEach(() => {
      primeSession({ user: null });
    });

    describe('WHEN the link is opened', () => {
      beforeEach(async () => {
        response = await proxy(new NextRequest('http://localhost:3000/?code=abc&next=1'));
      });

      test('THEN the code is exchanged and the visitor lands on the confirmation page with the session cookie', () => {
        expect(exchangeCodeForSession).toHaveBeenCalledExactlyOnceWith('abc');
        expect(location().pathname).toBe('/auth/confirmed');
        expect(location().searchParams.has('code')).toBe(false);
        expect(response.headers.get('set-cookie')).toContain('sb-session=fresh');
      });
    });
  });

  describe('GIVEN a link carrying an expired code', () => {
    beforeEach(() => {
      primeSession({ user: null, exchangeError: new Error('expired') });
    });

    describe('WHEN the link is opened', () => {
      beforeEach(async () => {
        response = await proxy(new NextRequest('http://localhost:3000/join?code=stale&foo=bar'));
      });

      test('THEN the visitor is sent to the login page flagged with the invalid code', () => {
        expect(location().pathname).toBe('/login');
        expect([...location().searchParams]).toEqual([['error', 'invalid_code']]);
      });
    });
  });

  describe('GIVEN any page request', () => {
    beforeEach(() => {
      primeSession({ user: null });
    });

    describe('WHEN the proxy prepares the response', () => {
      beforeEach(async () => {
        response = await proxy(new NextRequest('http://localhost:3000/login'));
      });

      test('THEN a nonce-based content security policy is sent to the browser', () => {
        const policy = response.headers.get('content-security-policy');

        expect(policy).toContain("script-src 'self' 'nonce-");
        expect(policy).toContain("'strict-dynamic'");
        expect(policy).toContain("frame-ancestors 'none'");
        expect(policy).toContain("connect-src 'self' https://project.supabase.co wss://project.supabase.co");
      });

      test('THEN the same nonce and policy are forwarded to the render', () => {
        const policy = response.headers.get('content-security-policy');

        expect(response.headers.get('x-middleware-request-content-security-policy')).toBe(policy);
        expect(response.headers.get('x-middleware-request-x-nonce')).toBe(nonceOf(policy));
      });
    });

    describe('WHEN two pages are requested', () => {
      let second: Response;

      beforeEach(async () => {
        response = await proxy(new NextRequest('http://localhost:3000/login'));
        second = await proxy(new NextRequest('http://localhost:3000/login'));
      });

      test('THEN every response carries a fresh nonce', () => {
        expect(nonceOf(response.headers.get('content-security-policy'))).not.toBe(
          nonceOf(second.headers.get('content-security-policy')),
        );
      });
    });
  });
});

describe('config', () => {
  describe('GIVEN the proxy matcher', () => {
    describe('WHEN a platform path that ends like an image and a static chunk are matched', () => {
      test('THEN the page path is still covered by the proxy and the chunk is skipped', () => {
        const matcher = new RegExp(`^${config.matcher[0]}$`);

        expect(matcher.test('/platform/ws-1/thread.png')).toBe(true);
        expect(matcher.test('/_next/static/chunk.js')).toBe(false);
      });
    });
  });
});
