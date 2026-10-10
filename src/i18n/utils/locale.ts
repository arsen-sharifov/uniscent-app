import type { TLocale } from '@interfaces';

import { DEFAULT_LOCALE, LOCALES } from '../consts';

export const isLocale = (value: unknown): value is TLocale =>
  typeof value === 'string' && LOCALES.includes(value as TLocale);

export const negotiateLocale = (header: string | null): TLocale =>
  header
    ?.split(',')
    .map((entry) => entry.split(/[-;]/)[0]?.trim().toLowerCase())
    .find(isLocale) ?? DEFAULT_LOCALE;
