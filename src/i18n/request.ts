import { cookies, headers } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';

import type { TLocale } from '@interfaces';

import { createClient } from '@/lib/supabase/server';

import { LOCALE_COOKIE, PUBLIC_PATHS } from './consts';
import { isLocale, negotiateLocale } from './utils';

const readStoredLocale = async (): Promise<TLocale | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase.from('user_preferences').select('language').eq('user_id', user.id).maybeSingle();

  return isLocale(data?.language) ? data.language : null;
};

const resolveLocale = async (): Promise<TLocale> => {
  const cookieLocale = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(cookieLocale)) return cookieLocale;

  const requestHeaders = await headers();
  const browserLocale = negotiateLocale(requestHeaders.get('accept-language'));

  const pathname = requestHeaders.get('x-pathname');
  if (pathname && (PUBLIC_PATHS.includes(pathname) || pathname.startsWith('/auth/'))) return browserLocale;

  const storedLocale = await readStoredLocale().catch(() => null);

  return storedLocale ?? browserLocale;
};

export default getRequestConfig(async () => {
  const locale = await resolveLocale();

  return {
    locale,
    messages: (await import(`@/locales/${locale}.json`)).default,
  };
});
