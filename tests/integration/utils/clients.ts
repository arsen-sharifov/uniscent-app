import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { CLIENT_OPTIONS } from '../consts';
import { getSupabaseEnv } from './env';

let adminClient: SupabaseClient | null = null;

export const getAdminClient = (): SupabaseClient => {
  if (!adminClient) {
    const { url, serviceRoleKey } = getSupabaseEnv();
    adminClient = createClient(url, serviceRoleKey, CLIENT_OPTIONS);
  }

  return adminClient;
};

export const createAnonClient = (): SupabaseClient => {
  const { url, anonKey } = getSupabaseEnv();

  return createClient(url, anonKey, CLIENT_OPTIONS);
};

export const createUserClient = async (email: string, password: string): Promise<SupabaseClient> => {
  const client = createAnonClient();
  const { error } = await client.auth.signInWithPassword({ email, password });

  if (error) throw new Error(`Could not sign in ${email}: ${error.message}`);

  return client;
};
