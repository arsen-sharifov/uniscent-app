import type { IPreferences } from '@interfaces';

import { createClient } from '@/lib/supabase';

import { PREFERENCE_COLUMN_BY_KEY, PREFERENCE_KEY_BY_COLUMN, PREFERENCES_SELECT } from './consts';

export const getPreferences = async (): Promise<IPreferences | null> => {
  const supabase = createClient();
  const { data, error } = await supabase.from('user_preferences').select(PREFERENCES_SELECT).maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return Object.fromEntries(
    Object.entries(data).map(([column, value]) => [PREFERENCE_KEY_BY_COLUMN[column], value]),
  ) as IPreferences;
};

export const upsertPreferences = async (preferences: IPreferences): Promise<void> => {
  const supabase = createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) throw authError;
  if (!user) return;

  const { error } = await supabase.from('user_preferences').upsert({
    user_id: user.id,
    ...Object.fromEntries(
      Object.entries(PREFERENCE_COLUMN_BY_KEY).map(([key, column]) => [column, preferences[key as keyof IPreferences]]),
    ),
  });

  if (error) throw error;
};
