import type { IAppError, TErrorCategory } from '@interfaces';

import { CATEGORY_BY_CODE, CATEGORY_BY_HTTP_STATUS, FETCH_FAILURE_PATTERN } from './consts';

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const isFetchFailure = (error: unknown): boolean =>
  isRecord(error) && typeof error.message === 'string' && FETCH_FAILURE_PATTERN.test(error.message);

const messageOf = (error: unknown): string => {
  if (isRecord(error) && typeof error.message === 'string') return error.message;

  return String(error);
};

const categoryOf = (error: unknown): TErrorCategory => {
  if (isRecord(error)) {
    const byCode =
      typeof error.code === 'string' && Object.hasOwn(CATEGORY_BY_CODE, error.code)
        ? CATEGORY_BY_CODE[error.code]
        : undefined;
    if (byCode) return byCode;

    const byStatus = typeof error.status === 'number' ? CATEGORY_BY_HTTP_STATUS[error.status] : undefined;
    if (byStatus) return byStatus;
  }

  if (isFetchFailure(error) || (typeof navigator !== 'undefined' && !navigator.onLine)) return 'network';

  return 'unknown';
};

export const normalizeError = (error: unknown): IAppError => ({
  category: categoryOf(error),
  message: messageOf(error),
  cause: error,
});
