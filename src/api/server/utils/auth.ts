import { createClient } from '@supabase/supabase-js';

import { event } from '@/lib/events';

export const verifyPassword = async (email: string, password: string) => {
  const { auth } = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { error } = await auth.signInWithPassword({ email, password });

  if (error) return { error };

  const { error: signOutError } = await auth.signOut({ scope: 'local' });

  if (signOutError) event.error(signOutError, { toast: false, context: 'auth.endPasswordCheckSession' });

  return { error: null };
};
