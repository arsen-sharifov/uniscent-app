import { NextResponse } from 'next/server';

import { createClient as createServerClient } from '@/lib/supabase/server';

export const getClientIp = (request: Request): string => {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]!.trim();

  const real = request.headers.get('x-real-ip');
  if (real) return real.trim();

  return 'unknown';
};

export const isSameOriginRequest = (request: Request): boolean => {
  const fetchSite = request.headers.get('sec-fetch-site');
  if (fetchSite) return fetchSite === 'same-origin';

  const origin = request.headers.get('origin');
  if (!origin) return true;

  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? new URL(request.url).host;

  return URL.canParse(origin) && new URL(origin).host === host;
};

export const authenticateRequest = async (request: Request) => {
  if (!isSameOriginRequest(request)) {
    return { rejection: NextResponse.json({ error: { message: 'Forbidden' } }, { status: 403 }) };
  }

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { rejection: NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 }) };
  }

  return { supabase, user };
};
