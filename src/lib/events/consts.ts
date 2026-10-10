import type { TErrorCategory } from '@interfaces';

export const FETCH_FAILURE_PATTERN = /failed to fetch|networkerror|load failed/i;

export const MAX_VISIBLE_TOASTS = 4;

export const CATEGORY_BY_HTTP_STATUS: Record<number, TErrorCategory> = {
  400: 'validation',
  401: 'auth',
  403: 'permission',
  404: 'notFound',
  408: 'network',
  429: 'rateLimit',
};

export const CATEGORY_BY_CODE: Record<string, TErrorCategory> = {
  '23505': 'validation',
  '23503': 'validation',
  '23514': 'validation',
  '23502': 'validation',
  '22023': 'validation',
  '42501': 'permission',
  '54000': 'limitReached',
  P0002: 'notFound',
  PGRST116: 'notFound',
  PGRST301: 'auth',
  PGRST303: 'auth',
  invalid_credentials: 'invalidCredentials',
  current_password_required: 'invalidCredentials',
  current_password_mismatch: 'invalidCredentials',
  email_not_confirmed: 'emailNotConfirmed',
  user_already_exists: 'emailTaken',
  email_exists: 'emailTaken',
  email_address_invalid: 'invalidEmail',
  weak_password: 'weakPassword',
  same_password: 'samePassword',
  owns_shared_workspaces: 'ownsSharedWorkspaces',
  validation_failed: 'validation',
  session_not_found: 'auth',
  session_expired: 'auth',
  refresh_token_not_found: 'auth',
  refresh_token_already_used: 'auth',
  bad_jwt: 'auth',
  user_not_found: 'auth',
  request_timeout: 'network',
  over_request_rate_limit: 'rateLimit',
  over_email_send_rate_limit: 'rateLimit',
};
