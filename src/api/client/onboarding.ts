import type { IOnboardingProgress, IOnboardingRow } from '@interfaces';

import { createClient } from '@/lib/supabase';

import { ONBOARDING_SELECT } from './consts';
import { getCurrentUserId, toOnboardingProgress } from './utils';

export const getOnboarding = async (): Promise<IOnboardingProgress | null> => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('user_onboarding')
    .select(ONBOARDING_SELECT)
    .maybeSingle<IOnboardingRow>();

  if (error) throw error;

  return data ? toOnboardingProgress(data) : null;
};

export const upsertOnboarding = async (progress: IOnboardingProgress): Promise<void> => {
  const supabase = createClient();
  const userId = await getCurrentUserId();

  const { error } = await supabase.from('user_onboarding').upsert({
    user_id: userId,
    offer_answered: progress.offerAnswered,
    completed_guides: progress.completedGuides,
  });

  if (error) throw error;
};
