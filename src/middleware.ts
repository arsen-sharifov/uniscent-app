import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';

export const middleware = async (request: NextRequest) => {
  const { pathname } = request.nextUrl;
  const isAuthRoute = pathname === '/login' || pathname === '/signup';
  const isAuthApi = pathname.startsWith('/auth/');
  const isPublicRoute = isAuthRoute || pathname === '/' || pathname === '/join';

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', pathname);

  const response = NextResponse.next({ request: { headers: requestHeaders } });

  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const code = request.nextUrl.searchParams.get('code');

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    const url = request.nextUrl.clone();

    if (error) {
      url.pathname = '/login';
      url.search = '';
      url.searchParams.set('error', 'invalid_code');

      return NextResponse.redirect(url);
    }

    url.pathname = pathname === '/join' ? '/join' : '/auth/confirmed';
    url.searchParams.delete('code');

    const redirect = NextResponse.redirect(url);
    response.cookies.getAll().forEach((cookie) => {
      redirect.cookies.set(cookie);
    });

    return redirect;
  }

  if (isAuthApi) {
    return response;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';

    return NextResponse.redirect(url);
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/platform';
    url.search = '';

    return NextResponse.redirect(url);
  }

  return response;
};

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*[.](?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
