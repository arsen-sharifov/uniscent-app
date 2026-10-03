import { createHash, timingSafeEqual } from 'node:crypto';

import type { AuthError, User } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

import {
  INVITE_RATE_LIMIT_MAX_ATTEMPTS,
  INVITE_RATE_LIMIT_WINDOW_MS,
  PASSWORD_CHECK_RATE_LIMIT_MAX_ATTEMPTS,
  PASSWORD_CHECK_RATE_LIMIT_WINDOW_MS,
} from '@constants';
import { event } from '@/lib/events';

import {
  authenticateRequest,
  createRateLimiter,
  getAdminClient,
  getClientIp,
  isSameOriginRequest,
  normalizeEmail,
  verifyPassword,
} from './utils';

const allowInviteAttempt = createRateLimiter({
  maxAttempts: INVITE_RATE_LIMIT_MAX_ATTEMPTS,
  windowMs: INVITE_RATE_LIMIT_WINDOW_MS,
});

const allowPasswordCheck = createRateLimiter({
  maxAttempts: PASSWORD_CHECK_RATE_LIMIT_MAX_ATTEMPTS,
  windowMs: PASSWORD_CHECK_RATE_LIMIT_WINDOW_MS,
});

const digest = (value: string) => createHash('sha256').update(value, 'utf8').digest();

const toFailureStatus = (error: AuthError) => (error.status && error.status >= 400 ? error.status : 500);

const checkCurrentPassword = async (user: User, password: unknown): Promise<NextResponse | null> => {
  if (typeof password !== 'string' || !password || !user.email) {
    return NextResponse.json({ error: { message: 'Invalid request' } }, { status: 400 });
  }

  if (!allowPasswordCheck(user.id)) {
    return NextResponse.json({ error: { message: 'Too many attempts, try again later' } }, { status: 429 });
  }

  const { error } = await verifyPassword(user.email, password);

  if (!error) return null;

  if (error.code === 'invalid_credentials') {
    return NextResponse.json({ error: { message: 'Invalid credentials', code: error.code } }, { status: 400 });
  }

  event.error(error, { toast: false, context: 'auth.verifyPassword' });

  return NextResponse.json(
    { error: { message: 'Password check failed', code: error.code } },
    { status: toFailureStatus(error) },
  );
};

export const handleVerifyInvite = async (request: Request) => {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ valid: false }, { status: 403 });
  }

  if (!allowInviteAttempt(getClientIp(request))) {
    return NextResponse.json({ valid: false }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const code = body?.code;
  const email = normalizeEmail(body?.email);
  const expected = process.env.INVITE_CODE;

  if (!email) {
    return NextResponse.json({ valid: false }, { status: 400 });
  }

  if (typeof code !== 'string' || !expected || !timingSafeEqual(digest(code), digest(expected))) {
    return NextResponse.json({ valid: false }, { status: 403 });
  }

  const { error } = await getAdminClient().rpc('grant_signup_allowance', { p_email: email });

  if (error) {
    event.error(error, { toast: false, context: 'auth.grantSignupAllowance' });

    return NextResponse.json({ valid: false }, { status: 500 });
  }

  return NextResponse.json({ valid: true });
};

export const handleChangePassword = async (request: Request) => {
  const { rejection, supabase, user } = await authenticateRequest(request);

  if (rejection) return rejection;

  const body = await request.json().catch(() => null);
  const currentPassword = body?.currentPassword;
  const newPassword = body?.newPassword;

  if (typeof newPassword !== 'string' || !newPassword) {
    return NextResponse.json({ error: { message: 'Invalid request' } }, { status: 400 });
  }

  const passwordRejection = await checkCurrentPassword(user, currentPassword);

  if (passwordRejection) return passwordRejection;

  const { error } = await supabase.auth.updateUser({ password: newPassword, current_password: currentPassword });

  if (error) {
    event.error(error, { toast: false, context: 'auth.changePassword' });

    return NextResponse.json(
      { error: { message: 'Password update failed', code: error.code } },
      { status: toFailureStatus(error) },
    );
  }

  return NextResponse.json({ success: true });
};

export const handleDeleteAccount = async (request: Request) => {
  const { rejection, supabase, user } = await authenticateRequest(request);

  if (rejection) return rejection;

  const body = await request.json().catch(() => null);
  const passwordRejection = await checkCurrentPassword(user, body?.password);

  if (passwordRejection) return passwordRejection;

  const { data: sharedWorkspaces, error: checkError } = await supabase.rpc('get_my_owned_shared_workspaces');

  if (checkError) {
    event.error(checkError, { toast: false, context: 'auth.checkSharedWorkspaces' });

    return NextResponse.json({ error: { message: 'Account deletion failed' } }, { status: 500 });
  }

  if (sharedWorkspaces?.length) {
    return NextResponse.json(
      { error: { message: 'Account owns shared workspaces', code: 'owns_shared_workspaces' } },
      { status: 409 },
    );
  }

  const { error } = await getAdminClient().auth.admin.deleteUser(user.id);

  if (error) {
    event.error(error, { toast: false, context: 'auth.deleteAccount' });

    return NextResponse.json({ error: { message: 'Account deletion failed' } }, { status: 500 });
  }

  return NextResponse.json({ success: true });
};
