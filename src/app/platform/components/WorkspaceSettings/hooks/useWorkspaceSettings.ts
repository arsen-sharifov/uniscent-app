'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import type {
  IWorkspace,
  IWorkspaceInvitation,
  IWorkspaceMember,
  IWorkspaceRole,
  IWorkspaceRolePermissions,
} from '@interfaces';
import {
  createWorkspaceInvitation,
  createWorkspaceRole,
  deleteWorkspaceRole,
  getMyWorkspacePermissions,
  getUser,
  getWorkspace,
  getWorkspaceInvitations,
  getWorkspaceMembers,
  getWorkspaceRoles,
  removeWorkspaceMember,
  revokeWorkspaceInvitation,
  setMemberRole,
  transferWorkspaceOwnership,
  updateWorkspaceRole,
} from '@api/client';
import { useTranslations } from '@/i18n';
import { event } from '@/lib/events';
import { usePermissionsStore } from '@/lib/stores';
import { roleLabel } from '@/lib/utils';

const runAction = (action: Promise<unknown>, title: string, context: string): Promise<boolean> =>
  action
    .then(() => true)
    .catch((error: unknown) => {
      event.error(error, { title, context });

      return false;
    });

export const useWorkspaceSettings = (workspaceId: string, onWorkspacesChanged?: () => void) => {
  const t = useTranslations();

  const [loading, setLoading] = useState(true);
  const [workspace, setWorkspace] = useState<IWorkspace | null>(null);
  const [members, setMembers] = useState<IWorkspaceMember[]>([]);
  const [roles, setRoles] = useState<IWorkspaceRole[]>([]);
  const [invitations, setInvitations] = useState<IWorkspaceInvitation[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const currentMember = useMemo(
    () => members.find((member) => member.userId === currentUserId) ?? null,
    [members, currentUserId],
  );
  const currentRole = useMemo(
    () => roles.find((role) => role.id === currentMember?.roleId) ?? null,
    [roles, currentMember],
  );

  const canManageMembers = currentRole?.canManageMembers ?? false;
  const canManageRoles = currentRole?.canManageRoles ?? false;
  const canManageWorkspace = currentRole?.canManageWorkspace ?? false;
  const currentRoleName = currentMember ? roleLabel(currentMember.roleKey, currentMember.roleName, t) : null;

  const refreshMembers = useCallback(
    () =>
      getWorkspaceMembers(workspaceId)
        .then(setMembers)
        .catch((error) => event.error(error, { toast: false, context: 'workspaceSettings.refreshMembers' })),
    [workspaceId],
  );

  const refreshRoles = useCallback(
    () =>
      getWorkspaceRoles(workspaceId)
        .then(setRoles)
        .catch((error) => event.error(error, { toast: false, context: 'workspaceSettings.refreshRoles' })),
    [workspaceId],
  );

  const refreshInvitations = useCallback(
    () =>
      getWorkspaceInvitations(workspaceId)
        .then(setInvitations)
        .catch((error) => event.error(error, { toast: false, context: 'workspaceSettings.refreshInvitations' })),
    [workspaceId],
  );

  const refreshMyAccess = useCallback(async () => {
    if (usePermissionsStore.getState().workspaceId !== workspaceId) return;

    await Promise.all([getUser(), getMyWorkspacePermissions(workspaceId)])
      .then(([{ data }, access]) => {
        if (usePermissionsStore.getState().workspaceId !== workspaceId) return;

        usePermissionsStore.getState().setAccess(workspaceId, data.user?.id ?? null, access);
      })
      .catch((error) => event.error(error, { toast: false, context: 'workspaceSettings.refreshAccess' }));
  }, [workspaceId]);

  const syncMyAccess = useCallback(
    async (affectsMe: boolean) => {
      if (!affectsMe) return;

      await refreshMyAccess();
      onWorkspacesChanged?.();
    },
    [refreshMyAccess, onWorkspacesChanged],
  );

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const [{ data }, workspaceData, roleList, memberList] = await Promise.all([
        getUser(),
        getWorkspace(workspaceId),
        getWorkspaceRoles(workspaceId),
        getWorkspaceMembers(workspaceId),
      ]);

      if (cancelled) return;

      const loadedUserId = data.user?.id ?? null;
      setCurrentUserId(loadedUserId);
      setWorkspace(workspaceData);
      setRoles(roleList);
      setMembers(memberList);

      const loadedRole = roleList.find(
        (role) => role.id === memberList.find((member) => member.userId === loadedUserId)?.roleId,
      );
      if (loadedRole?.canManageMembers) {
        const inviteList = await getWorkspaceInvitations(workspaceId).catch((error) => {
          event.error(error, { toast: false, context: 'workspaceSettings.loadInvitations' });

          return [];
        });
        if (!cancelled) setInvitations(inviteList);
      }

      setLoading(false);
    };

    load().catch((error) => {
      if (cancelled) return;
      setLoading(false);
      event.error(error, { title: t.common.errorTitles.loadFailed, context: 'workspaceSettings.load' });
    });

    return () => {
      cancelled = true;
    };
  }, [workspaceId, t]);

  const assignRole = useCallback(
    async (userId: string, roleId: string) => {
      const target = roles.find((role) => role.id === roleId);
      setMembers((previous) =>
        previous.map((member) =>
          member.userId === userId
            ? { ...member, roleId, roleKey: target?.key ?? null, roleName: target?.name ?? member.roleName }
            : member,
        ),
      );

      const assigned = await runAction(
        setMemberRole(workspaceId, userId, roleId),
        t.platform.workspaceSettings.members.roleChangeFailed,
        'workspaceSettings.assignRole',
      );
      if (!assigned) {
        await Promise.all([refreshMembers(), refreshRoles()]);

        return;
      }

      await refreshRoles();
      await syncMyAccess(userId === currentUserId);
      event.success(t.platform.workspaceSettings.members.roleChanged);
    },
    [workspaceId, roles, currentUserId, refreshMembers, refreshRoles, syncMyAccess, t],
  );

  const removeMember = useCallback(
    async (userId: string) => {
      setMembers((previous) => previous.filter((member) => member.userId !== userId));

      const removed = await runAction(
        removeWorkspaceMember(workspaceId, userId),
        t.platform.workspaceSettings.members.removeFailed,
        'workspaceSettings.removeMember',
      );
      if (!removed) {
        await refreshMembers();

        return;
      }

      await refreshRoles();
      event.success(t.platform.workspaceSettings.members.removed);
    },
    [workspaceId, refreshMembers, refreshRoles, t],
  );

  const transferOwnership = useCallback(
    async (userId: string) => {
      const transferred = await runAction(
        transferWorkspaceOwnership(workspaceId, userId),
        t.platform.workspaceSettings.members.transferFailed,
        'workspaceSettings.transferOwnership',
      );
      if (!transferred) return;

      await Promise.all([refreshMembers(), refreshRoles(), refreshMyAccess()]);
      onWorkspacesChanged?.();
      event.success(t.platform.workspaceSettings.members.transferred);
    },
    [workspaceId, refreshMembers, refreshRoles, refreshMyAccess, onWorkspacesChanged, t],
  );

  const invite = useCallback(
    async (email: string, roleId: string): Promise<boolean> => {
      const invited = await runAction(
        createWorkspaceInvitation(workspaceId, email, roleId),
        t.platform.workspaceSettings.members.inviteFailed,
        'workspaceSettings.invite',
      );
      if (!invited) return false;

      await refreshInvitations();
      event.success(t.platform.workspaceSettings.members.invited);

      return true;
    },
    [workspaceId, refreshInvitations, t],
  );

  const revokeInvitation = useCallback(
    async (invitationId: string) => {
      setInvitations((previous) => previous.filter((invitation) => invitation.id !== invitationId));

      const revoked = await runAction(
        revokeWorkspaceInvitation(invitationId),
        t.platform.workspaceSettings.members.revokeFailed,
        'workspaceSettings.revokeInvitation',
      );
      if (!revoked) {
        await refreshInvitations();

        return;
      }

      event.success(t.platform.workspaceSettings.members.revoked);
    },
    [refreshInvitations, t],
  );

  const createRole = useCallback(
    async (name: string, icon: string, permissions: IWorkspaceRolePermissions): Promise<boolean> => {
      const created = await runAction(
        createWorkspaceRole(workspaceId, name, icon, permissions),
        t.platform.workspaceSettings.roles.createFailed,
        'workspaceSettings.createRole',
      );
      if (!created) return false;

      await refreshRoles();
      event.success(t.platform.workspaceSettings.roles.created);

      return true;
    },
    [workspaceId, refreshRoles, t],
  );

  const updateRole = useCallback(
    async (roleId: string, name: string, icon: string, permissions: IWorkspaceRolePermissions): Promise<boolean> => {
      const updated = await runAction(
        updateWorkspaceRole(roleId, name, icon, permissions),
        t.platform.workspaceSettings.roles.updateFailed,
        'workspaceSettings.updateRole',
      );
      if (!updated) return false;

      await refreshRoles();
      await syncMyAccess(roleId === currentMember?.roleId);
      event.success(t.platform.workspaceSettings.roles.updated);

      return true;
    },
    [refreshRoles, syncMyAccess, currentMember, t],
  );

  const deleteRole = useCallback(
    async (roleId: string) => {
      const deleted = await runAction(
        deleteWorkspaceRole(roleId),
        t.platform.workspaceSettings.roles.deleteFailed,
        'workspaceSettings.deleteRole',
      );
      if (!deleted) return;

      await Promise.all([refreshRoles(), refreshMembers()]);
      await syncMyAccess(roleId === currentMember?.roleId);
      event.success(t.platform.workspaceSettings.roles.deleted);
    },
    [refreshRoles, refreshMembers, syncMyAccess, currentMember, t],
  );

  return {
    loading,
    workspace,
    members,
    roles,
    invitations,
    currentUserId,
    currentRole,
    canManageMembers,
    canManageRoles,
    canManageWorkspace,
    currentRoleName,
    assignRole,
    removeMember,
    transferOwnership,
    invite,
    revokeInvitation,
    createRole,
    updateRole,
    deleteRole,
  };
};
