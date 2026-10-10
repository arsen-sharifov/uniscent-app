import type { IUserMetadata, IUserProfileUpdate, TBadgeId } from '@interfaces';

import { event } from '@/lib/events';
import { createClient } from '@/lib/supabase';
import { resolveEarnedBadges } from '@/lib/utils';

import { signOut } from './auth';
import { getCurrentUser, toResponseError } from './utils';

export const getUser = () => {
  const supabase = createClient();

  return supabase.auth.getUser();
};

export const updateUserMetadata = (data: IUserProfileUpdate) => {
  const supabase = createClient();

  return supabase.auth.updateUser({ data });
};

export const addUserBadge = async (badge: TBadgeId): Promise<void> => {
  const supabase = createClient();
  const user = await getCurrentUser();
  const earned = resolveEarnedBadges((user.user_metadata as IUserMetadata | undefined)?.badges);

  if (earned.includes(badge)) return;

  const { error } = await supabase.auth.updateUser({ data: { badges: [...earned, badge] } });

  if (error) throw error;
};

export const updateEmail = (email: string) => {
  const supabase = createClient();

  return supabase.auth.updateUser({ email });
};

export const updatePassword = async (currentPassword: string, newPassword: string): Promise<boolean> => {
  const response = await fetch('/auth/change-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentPassword, newPassword }),
  });

  if (response.ok) return true;

  const error = await toResponseError(response, 'Failed to update password');

  if (error.code === 'invalid_credentials') return false;

  throw error;
};

export const deleteAccount = async (password: string): Promise<void> => {
  const response = await fetch('/auth/delete-account', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });

  if (!response.ok) throw await toResponseError(response, 'Failed to delete account');

  await signOut().catch((error: unknown) => event.error(error, { toast: false, context: 'auth.signOut' }));
};
