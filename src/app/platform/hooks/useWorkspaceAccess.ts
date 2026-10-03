'use client';

import { useEffect } from 'react';

import { getMyWorkspacePermissions, getUser } from '@api/client';
import { useTranslations } from '@/i18n';
import { event } from '@/lib/events';
import { usePermissionsStore } from '@/lib/stores';

export const useWorkspaceAccess = (workspaceId: string | null) => {
  const t = useTranslations();

  useEffect(() => {
    usePermissionsStore.getState().clearAccess(workspaceId);
  }, [workspaceId]);

  useEffect(() => {
    const access = usePermissionsStore.getState();
    if (!workspaceId || (access.workspaceId === workspaceId && access.resolved)) return;

    let cancelled = false;

    Promise.all([getUser(), getMyWorkspacePermissions(workspaceId)])
      .then(([{ data }, workspaceAccess]) => {
        if (cancelled) return;
        usePermissionsStore.getState().setAccess(workspaceId, data.user?.id ?? null, workspaceAccess);
      })
      .catch((error) => {
        if (cancelled) return;
        usePermissionsStore.getState().setAccess(workspaceId, null, null);
        event.error(error, { title: t.common.errorTitles.loadFailed, context: 'sidebar.loadPermissions' });
      });

    return () => {
      cancelled = true;
    };
  }, [workspaceId, t]);
};
