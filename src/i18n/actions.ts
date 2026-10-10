'use server';

import { cookies } from 'next/headers';

import type { TLocale } from '@interfaces';

import { LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE } from './consts';
import { isLocale } from './utils';

export const setLocale = async (locale: TLocale): Promise<void> => {
  if (!isLocale(locale)) return;

  (await cookies()).set(LOCALE_COOKIE, locale, {
    maxAge: LOCALE_COOKIE_MAX_AGE,
    sameSite: 'lax',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });
};

export const clearLocale = async (): Promise<void> => {
  (await cookies()).delete(LOCALE_COOKIE);
};
