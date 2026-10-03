import type { SignOut } from '@supabase/supabase-js';

import { createClient } from '@/lib/supabase';

import { toResponseError } from './utils';

export const signIn = (email: string, password: string) => {
  const supabase = createClient();

  return supabase.auth.signInWithPassword({ email, password });
};

export const signUp = (email: string, password: string, name: string) => {
  const supabase = createClient();

  return supabase.auth.signUp({
    email,
    password,
    options: { data: { name, plan: 'beta' } },
  });
};

export const getSession = () => {
  const supabase = createClient();

  return supabase.auth.getSession();
};

export const verifyInvitation = (tokenHash: string) => {
  const supabase = createClient();

  return supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'invite' });
};

export const completeInvitedAccount = (name: string, password: string) => {
  const supabase = createClient();

  return supabase.auth.updateUser({ password, data: { name, plan: 'beta' } });
};

export const signOut = async (options?: SignOut): Promise<void> => {
  const supabase = createClient();
  const { error } = await supabase.auth.signOut(options);

  if (error) throw error;
};

export const verifyInviteCode = async (code: string, email: string) => {
  const response = await fetch('/auth/verify-invite', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, email }),
  });

  if (response.ok) return true;
  if (response.status === 403) return false;

  throw await toResponseError(response, 'Invite code check failed');
};
