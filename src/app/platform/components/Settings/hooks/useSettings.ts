'use client';

import type { User } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

import type { IChangePasswordPayload, IUserProfileUpdate, TChangePasswordResult } from '@interfaces';
import {
  deleteAccount,
  getMyOwnedSharedWorkspaces,
  getUser,
  updateEmail,
  updatePassword,
  updateUserMetadata,
} from '@api/client';
import { useTranslations } from '@/i18n';
import { event } from '@/lib/events';

export const useSettings = () => {
  const t = useTranslations();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    getUser()
      .then(({ data }) => {
        if (cancelled) return;

        setUser(data.user);
        setLoading(false);
      })
      .catch((error) => {
        if (cancelled) return;

        setLoading(false);
        event.error(error, { title: t.common.errorTitles.loadFailed, context: 'settings.loadUser' });
      });

    return () => {
      cancelled = true;
    };
  }, [t]);

  const updateProfile = async (update: IUserProfileUpdate) => {
    const { data, error } = await updateUserMetadata(update);
    if (error) throw error;

    setUser(data.user);
  };

  const changeEmail = async (email: string) => {
    const { error } = await updateEmail(email);
    if (error) throw error;
  };

  const changePassword = async ({
    currentPassword,
    newPassword,
  }: IChangePasswordPayload): Promise<TChangePasswordResult> =>
    (await updatePassword(currentPassword, newPassword)) ? 'updated' : 'incorrectCurrentPassword';

  return {
    user,
    loading,
    updateProfile,
    changeEmail,
    changePassword,
    getMyOwnedSharedWorkspaces,
    deleteAccount,
  };
};
