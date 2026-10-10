import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import type { IWorkspace, IWorkspaceAccess, IWorkspaceMember, IWorkspaceRole } from '@interfaces';
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
import { TRANSLATIONS } from '@mocks/i18n';
import {
  EDIT_ACCESS,
  FULL_ACCESS,
  ROLE_PERMISSIONS,
  workspaceInvitation,
  workspaceMember,
  workspaceRole,
} from '@mocks/roles';
import { useWorkspaceSettings } from '@/app/platform/components/WorkspaceSettings/hooks';
import { event } from '@/lib/events';
import { usePermissionsStore } from '@/lib/stores';

vi.mock('@api/client', async () => ({
  ...(await import('@mocks/canvasApi')),
  ...(await import('@mocks/userApi')),
  ...(await import('@mocks/workspaceApi')),
}));
vi.mock('@/i18n', () => import('@mocks/i18n'));
vi.mock('@/lib/events', () => import('@mocks/events'));

const onWorkspacesChanged = vi.fn();

const USER_RESPONSE = { data: { user: { id: 'user-1' } }, error: null } as never;
const OUTSIDER_RESPONSE = { data: { user: { id: 'user-3' } }, error: null } as never;

const WORKSPACE: IWorkspace = { id: 'ws-1', name: 'Product Lab', ownerId: 'user-1', createdAt: '2026-01-01T00:00:00Z' };

const roleList = (): IWorkspaceRole[] => [
  workspaceRole('role-owner', {
    key: 'owner',
    name: 'Owner',
    isSystem: true,
    isOwner: true,
    canManageMembers: true,
    canManageRoles: true,
    canManageWorkspace: true,
  }),
  workspaceRole('role-member', { key: 'member', name: 'Member' }),
  workspaceRole('role-custom', { name: 'Custom role' }),
];

const memberList = (): IWorkspaceMember[] => [
  workspaceMember('user-1', 'role-owner', { roleKey: 'owner', roleName: 'Owner', isOwner: true }),
  workspaceMember('user-2', 'role-member', { roleKey: 'member', roleName: 'Member' }),
];

const primeApi = () => {
  vi.mocked(getUser).mockResolvedValue(USER_RESPONSE);
  vi.mocked(getWorkspace).mockResolvedValue(WORKSPACE);
  vi.mocked(getWorkspaceRoles).mockResolvedValue(roleList());
  vi.mocked(getWorkspaceMembers).mockResolvedValue(memberList());
  vi.mocked(getWorkspaceInvitations).mockResolvedValue([workspaceInvitation('inv-1')]);
};

let settings: { current: ReturnType<typeof useWorkspaceSettings> };

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(async () => {
  cleanup();
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
  usePermissionsStore.getState().clearAccess();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('useWorkspaceSettings', () => {
  describe('GIVEN a member who manages members behind the api', () => {
    beforeEach(() => {
      primeApi();
      usePermissionsStore.getState().setAccess('ws-1', 'user-1', FULL_ACCESS);

      settings = renderHook(() => useWorkspaceSettings('ws-1', onWorkspacesChanged)).result;
    });

    describe('WHEN the initial load is still in flight', () => {
      test('THEN the settings report loading with empty state', () => {
        expect(settings.current.loading).toBe(true);
        expect(settings.current.workspace).toBeNull();
        expect(settings.current.members).toEqual([]);
        expect(settings.current.roles).toEqual([]);
        expect(settings.current.invitations).toEqual([]);
        expect(settings.current.currentUserId).toBeNull();
      });
    });

    describe('WHEN the initial load settles', () => {
      beforeEach(async () => {
        await act(async () => {
          await vi.advanceTimersByTimeAsync(0);
        });
      });

      test('THEN the workspace snapshot is exposed', () => {
        expect(settings.current.loading).toBe(false);
        expect(settings.current.workspace).toEqual(WORKSPACE);
        expect(settings.current.members).toEqual(memberList());
        expect(settings.current.roles).toEqual(roleList());
        expect(settings.current.currentUserId).toBe('user-1');
        expect(getWorkspace).toHaveBeenCalledExactlyOnceWith('ws-1');
      });

      test('THEN the capabilities and role name derive from their role', () => {
        expect(settings.current.canManageMembers).toBe(true);
        expect(settings.current.canManageRoles).toBe(true);
        expect(settings.current.canManageWorkspace).toBe(true);
        expect(settings.current.currentRoleName).toBe(TRANSLATIONS.platform.workspaceSettings.roleNames.owner);
        expect(settings.current.currentRole).toEqual(roleList()[0]);
      });

      test('THEN the pending invitations are loaded', () => {
        expect(settings.current.invitations).toEqual([workspaceInvitation('inv-1')]);
        expect(getWorkspaceInvitations).toHaveBeenCalledExactlyOnceWith('ws-1');
      });
    });
  });

  describe('GIVEN a member without member management', () => {
    beforeEach(() => {
      primeApi();
      vi.mocked(getUser).mockResolvedValue(OUTSIDER_RESPONSE);
      vi.mocked(getWorkspaceMembers).mockResolvedValue([
        ...memberList(),
        workspaceMember('user-3', 'role-custom', { roleName: 'Custom role' }),
      ]);
      usePermissionsStore.getState().setAccess('ws-1', 'user-3', EDIT_ACCESS);

      settings = renderHook(() => useWorkspaceSettings('ws-1', onWorkspacesChanged)).result;
    });

    describe('WHEN the initial load settles', () => {
      beforeEach(async () => {
        await act(async () => {
          await vi.advanceTimersByTimeAsync(0);
        });
      });

      test('THEN the invitations are never requested', () => {
        expect(settings.current.loading).toBe(false);
        expect(settings.current.invitations).toEqual([]);
        expect(getWorkspaceInvitations).not.toHaveBeenCalled();
      });

      test('THEN the capabilities stay off with the custom role name', () => {
        expect(settings.current.canManageMembers).toBe(false);
        expect(settings.current.canManageRoles).toBe(false);
        expect(settings.current.canManageWorkspace).toBe(false);
        expect(settings.current.currentRoleName).toBe('Custom role');
        expect(settings.current.currentRole?.id).toBe('role-custom');
      });
    });
  });

  describe('GIVEN an initial load that fails on the api', () => {
    beforeEach(() => {
      primeApi();
      vi.mocked(getWorkspace).mockRejectedValue(new Error('db down'));

      settings = renderHook(() => useWorkspaceSettings('ws-1', onWorkspacesChanged)).result;
    });

    describe('WHEN the initial load settles', () => {
      beforeEach(async () => {
        await act(async () => {
          await vi.advanceTimersByTimeAsync(0);
        });
      });

      test('THEN the failure surfaces and loading ends', () => {
        expect(settings.current.loading).toBe(false);
        expect(settings.current.workspace).toBeNull();
        expect(settings.current.members).toEqual([]);
        expect(event.error).toHaveBeenCalledExactlyOnceWith(expect.any(Error), {
          title: TRANSLATIONS.common.errorTitles.loadFailed,
          context: 'workspaceSettings.load',
        });
      });
    });
  });

  describe('GIVEN an invitation list that fails to load', () => {
    beforeEach(() => {
      primeApi();
      vi.mocked(getWorkspaceInvitations).mockRejectedValue(new Error('db down'));
      usePermissionsStore.getState().setAccess('ws-1', 'user-1', FULL_ACCESS);

      settings = renderHook(() => useWorkspaceSettings('ws-1', onWorkspacesChanged)).result;
    });

    describe('WHEN the initial load settles', () => {
      beforeEach(async () => {
        await act(async () => {
          await vi.advanceTimersByTimeAsync(0);
        });
      });

      test('THEN the members load and the invitation failure stays silent', () => {
        expect(settings.current.loading).toBe(false);
        expect(settings.current.members).toEqual(memberList());
        expect(settings.current.invitations).toEqual([]);
        expect(event.error).toHaveBeenCalledExactlyOnceWith(expect.any(Error), {
          toast: false,
          context: 'workspaceSettings.loadInvitations',
        });
      });
    });
  });

  describe('GIVEN loaded settings for a managing owner', () => {
    beforeEach(async () => {
      primeApi();
      vi.mocked(getMyWorkspacePermissions).mockResolvedValue(EDIT_ACCESS);
      vi.mocked(setMemberRole).mockResolvedValue(undefined);
      vi.mocked(removeWorkspaceMember).mockResolvedValue(undefined);
      vi.mocked(transferWorkspaceOwnership).mockResolvedValue(undefined);
      vi.mocked(createWorkspaceInvitation).mockResolvedValue(undefined);
      vi.mocked(revokeWorkspaceInvitation).mockResolvedValue(undefined);
      vi.mocked(createWorkspaceRole).mockResolvedValue('role-new');
      vi.mocked(updateWorkspaceRole).mockResolvedValue(undefined);
      vi.mocked(deleteWorkspaceRole).mockResolvedValue(undefined);
      usePermissionsStore.getState().setAccess('ws-1', 'user-1', FULL_ACCESS);

      settings = renderHook(() => useWorkspaceSettings('ws-1', onWorkspacesChanged)).result;
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
    });

    describe('WHEN they assign the custom role to another member', () => {
      beforeEach(async () => {
        await act(async () => {
          await settings.current.assignRole('user-2', 'role-custom');
          await vi.advanceTimersByTimeAsync(0);
        });
      });

      test('THEN the member shows the new role optimistically and persists', () => {
        expect(settings.current.members).toEqual([
          workspaceMember('user-1', 'role-owner', { roleKey: 'owner', roleName: 'Owner', isOwner: true }),
          workspaceMember('user-2', 'role-custom', { roleName: 'Custom role' }),
        ]);
        expect(setMemberRole).toHaveBeenCalledExactlyOnceWith('ws-1', 'user-2', 'role-custom');
        expect(getWorkspaceRoles).toHaveBeenCalledTimes(2);
        expect(event.success).toHaveBeenCalledExactlyOnceWith(
          TRANSLATIONS.platform.workspaceSettings.members.roleChanged,
        );
      });

      test('THEN their own access stays untouched', () => {
        expect(getMyWorkspacePermissions).not.toHaveBeenCalled();
        expect(onWorkspacesChanged).not.toHaveBeenCalled();
      });
    });

    describe('WHEN they assign the member role to themselves', () => {
      beforeEach(async () => {
        await act(async () => {
          await settings.current.assignRole('user-1', 'role-member');
          await vi.advanceTimersByTimeAsync(0);
        });
      });

      test('THEN the refreshed access lands in the permissions store', () => {
        expect(getMyWorkspacePermissions).toHaveBeenCalledExactlyOnceWith('ws-1');
        expect(usePermissionsStore.getState()).toMatchObject({
          workspaceId: 'ws-1',
          userId: 'user-1',
          isOwner: false,
          canManageMembers: false,
        });
        expect(onWorkspacesChanged).toHaveBeenCalledTimes(1);
        expect(event.success).toHaveBeenCalledExactlyOnceWith(
          TRANSLATIONS.platform.workspaceSettings.members.roleChanged,
        );
      });
    });

    describe('WHEN they remove the other member', () => {
      beforeEach(async () => {
        await act(async () => {
          await settings.current.removeMember('user-2');
          await vi.advanceTimersByTimeAsync(0);
        });
      });

      test('THEN the member leaves and the removal persists', () => {
        expect(settings.current.members).toEqual([
          workspaceMember('user-1', 'role-owner', { roleKey: 'owner', roleName: 'Owner', isOwner: true }),
        ]);
        expect(removeWorkspaceMember).toHaveBeenCalledExactlyOnceWith('ws-1', 'user-2');
        expect(getWorkspaceRoles).toHaveBeenCalledTimes(2);
        expect(event.success).toHaveBeenCalledExactlyOnceWith(TRANSLATIONS.platform.workspaceSettings.members.removed);
      });
    });

    describe('WHEN they transfer ownership to the other member', () => {
      beforeEach(async () => {
        await act(async () => {
          await settings.current.transferOwnership('user-2');
          await vi.advanceTimersByTimeAsync(0);
        });
      });

      test('THEN the transfer persists and the roster refreshes', () => {
        expect(transferWorkspaceOwnership).toHaveBeenCalledExactlyOnceWith('ws-1', 'user-2');
        expect(getWorkspaceMembers).toHaveBeenCalledTimes(2);
        expect(getWorkspaceRoles).toHaveBeenCalledTimes(2);
        expect(event.success).toHaveBeenCalledExactlyOnceWith(
          TRANSLATIONS.platform.workspaceSettings.members.transferred,
        );
      });

      test('THEN their own access refreshes and the workspaces reload', () => {
        expect(getMyWorkspacePermissions).toHaveBeenCalledExactlyOnceWith('ws-1');
        expect(usePermissionsStore.getState()).toMatchObject({ workspaceId: 'ws-1', isOwner: false });
        expect(onWorkspacesChanged).toHaveBeenCalledTimes(1);
      });
    });

    describe('WHEN they invite a teammate', () => {
      let invited: boolean;

      beforeEach(async () => {
        await act(async () => {
          invited = await settings.current.invite('new@uniscept.dev', 'role-member');
          await vi.advanceTimersByTimeAsync(0);
        });
      });

      test('THEN the invitation is created and the list refetches', () => {
        expect(invited).toBe(true);
        expect(createWorkspaceInvitation).toHaveBeenCalledExactlyOnceWith('ws-1', 'new@uniscept.dev', 'role-member');
        expect(getWorkspaceInvitations).toHaveBeenCalledTimes(2);
        expect(event.success).toHaveBeenCalledExactlyOnceWith(TRANSLATIONS.platform.workspaceSettings.members.invited);
      });
    });

    describe('WHEN they revoke the pending invitation', () => {
      beforeEach(async () => {
        await act(async () => {
          await settings.current.revokeInvitation('inv-1');
          await vi.advanceTimersByTimeAsync(0);
        });
      });

      test('THEN the invitation leaves without a refetch', () => {
        expect(settings.current.invitations).toEqual([]);
        expect(revokeWorkspaceInvitation).toHaveBeenCalledExactlyOnceWith('inv-1');
        expect(getWorkspaceInvitations).toHaveBeenCalledTimes(1);
        expect(event.success).toHaveBeenCalledExactlyOnceWith(TRANSLATIONS.platform.workspaceSettings.members.revoked);
      });
    });

    describe('WHEN they create a role', () => {
      let created: boolean;

      beforeEach(async () => {
        await act(async () => {
          created = await settings.current.createRole('Reviewers', 'sparkles', ROLE_PERMISSIONS);
          await vi.advanceTimersByTimeAsync(0);
        });
      });

      test('THEN the role is created and the list refetches', () => {
        expect(created).toBe(true);
        expect(createWorkspaceRole).toHaveBeenCalledExactlyOnceWith('ws-1', 'Reviewers', 'sparkles', ROLE_PERMISSIONS);
        expect(getWorkspaceRoles).toHaveBeenCalledTimes(2);
        expect(event.success).toHaveBeenCalledExactlyOnceWith(TRANSLATIONS.platform.workspaceSettings.roles.created);
      });
    });

    describe('WHEN they update their own role', () => {
      let updated: boolean;

      beforeEach(async () => {
        await act(async () => {
          updated = await settings.current.updateRole('role-owner', 'Owners', 'crown', ROLE_PERMISSIONS);
          await vi.advanceTimersByTimeAsync(0);
        });
      });

      test('THEN the update persists and their access refreshes', () => {
        expect(updated).toBe(true);
        expect(updateWorkspaceRole).toHaveBeenCalledExactlyOnceWith('role-owner', 'Owners', 'crown', ROLE_PERMISSIONS);
        expect(getMyWorkspacePermissions).toHaveBeenCalledExactlyOnceWith('ws-1');
        expect(onWorkspacesChanged).toHaveBeenCalledTimes(1);
        expect(event.success).toHaveBeenCalledExactlyOnceWith(TRANSLATIONS.platform.workspaceSettings.roles.updated);
      });
    });

    describe('WHEN they update a role they do not hold', () => {
      let updated: boolean;

      beforeEach(async () => {
        await act(async () => {
          updated = await settings.current.updateRole('role-custom', 'Reviewers', 'sparkles', ROLE_PERMISSIONS);
          await vi.advanceTimersByTimeAsync(0);
        });
      });

      test('THEN the update persists without touching their access', () => {
        expect(updated).toBe(true);
        expect(updateWorkspaceRole).toHaveBeenCalledExactlyOnceWith(
          'role-custom',
          'Reviewers',
          'sparkles',
          ROLE_PERMISSIONS,
        );
        expect(getMyWorkspacePermissions).not.toHaveBeenCalled();
        expect(onWorkspacesChanged).not.toHaveBeenCalled();
        expect(event.success).toHaveBeenCalledExactlyOnceWith(TRANSLATIONS.platform.workspaceSettings.roles.updated);
      });
    });

    describe('WHEN they delete a role they do not hold', () => {
      beforeEach(async () => {
        await act(async () => {
          await settings.current.deleteRole('role-custom');
          await vi.advanceTimersByTimeAsync(0);
        });
      });

      test('THEN the deletion persists and the lists refetch', () => {
        expect(deleteWorkspaceRole).toHaveBeenCalledExactlyOnceWith('role-custom');
        expect(getWorkspaceRoles).toHaveBeenCalledTimes(2);
        expect(getWorkspaceMembers).toHaveBeenCalledTimes(2);
        expect(getMyWorkspacePermissions).not.toHaveBeenCalled();
        expect(event.success).toHaveBeenCalledExactlyOnceWith(TRANSLATIONS.platform.workspaceSettings.roles.deleted);
      });
    });
  });

  describe('GIVEN workspace mutations that fail on the api', () => {
    beforeEach(async () => {
      primeApi();
      vi.mocked(getMyWorkspacePermissions).mockResolvedValue(EDIT_ACCESS);
      vi.mocked(setMemberRole).mockRejectedValue(new Error('db down'));
      vi.mocked(removeWorkspaceMember).mockRejectedValue(new Error('db down'));
      vi.mocked(transferWorkspaceOwnership).mockRejectedValue(new Error('db down'));
      vi.mocked(createWorkspaceInvitation).mockRejectedValue(new Error('db down'));
      vi.mocked(revokeWorkspaceInvitation).mockRejectedValue(new Error('db down'));
      vi.mocked(createWorkspaceRole).mockRejectedValue(new Error('db down'));
      vi.mocked(updateWorkspaceRole).mockRejectedValue(new Error('db down'));
      vi.mocked(deleteWorkspaceRole).mockRejectedValue(new Error('db down'));
      usePermissionsStore.getState().setAccess('ws-1', 'user-1', FULL_ACCESS);

      settings = renderHook(() => useWorkspaceSettings('ws-1', onWorkspacesChanged)).result;
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
    });

    describe('WHEN they assign the custom role to another member', () => {
      beforeEach(async () => {
        await act(async () => {
          await settings.current.assignRole('user-2', 'role-custom');
          await vi.advanceTimersByTimeAsync(0);
        });
      });

      test('THEN the roster rolls back and the failure surfaces', () => {
        expect(settings.current.members).toEqual(memberList());
        expect(getWorkspaceMembers).toHaveBeenCalledTimes(2);
        expect(event.success).not.toHaveBeenCalled();
        expect(event.error).toHaveBeenCalledExactlyOnceWith(expect.any(Error), {
          title: TRANSLATIONS.platform.workspaceSettings.members.roleChangeFailed,
          context: 'workspaceSettings.assignRole',
        });
      });
    });

    describe('WHEN they remove the other member', () => {
      beforeEach(async () => {
        await act(async () => {
          await settings.current.removeMember('user-2');
          await vi.advanceTimersByTimeAsync(0);
        });
      });

      test('THEN the roster rolls back and the failure surfaces', () => {
        expect(settings.current.members).toEqual(memberList());
        expect(getWorkspaceMembers).toHaveBeenCalledTimes(2);
        expect(event.success).not.toHaveBeenCalled();
        expect(event.error).toHaveBeenCalledExactlyOnceWith(expect.any(Error), {
          title: TRANSLATIONS.platform.workspaceSettings.members.removeFailed,
          context: 'workspaceSettings.removeMember',
        });
      });
    });

    describe('WHEN they transfer ownership to the other member', () => {
      beforeEach(async () => {
        await act(async () => {
          await settings.current.transferOwnership('user-2');
          await vi.advanceTimersByTimeAsync(0);
        });
      });

      test('THEN nothing refreshes and the failure surfaces', () => {
        expect(getWorkspaceMembers).toHaveBeenCalledTimes(1);
        expect(getMyWorkspacePermissions).not.toHaveBeenCalled();
        expect(onWorkspacesChanged).not.toHaveBeenCalled();
        expect(event.success).not.toHaveBeenCalled();
        expect(event.error).toHaveBeenCalledExactlyOnceWith(expect.any(Error), {
          title: TRANSLATIONS.platform.workspaceSettings.members.transferFailed,
          context: 'workspaceSettings.transferOwnership',
        });
      });
    });

    describe('WHEN they invite a teammate', () => {
      let invited: boolean;

      beforeEach(async () => {
        await act(async () => {
          invited = await settings.current.invite('new@uniscept.dev', 'role-member');
          await vi.advanceTimersByTimeAsync(0);
        });
      });

      test('THEN the invite reports failure and the list stays', () => {
        expect(invited).toBe(false);
        expect(settings.current.invitations).toEqual([workspaceInvitation('inv-1')]);
        expect(getWorkspaceInvitations).toHaveBeenCalledTimes(1);
        expect(event.success).not.toHaveBeenCalled();
        expect(event.error).toHaveBeenCalledExactlyOnceWith(expect.any(Error), {
          title: TRANSLATIONS.platform.workspaceSettings.members.inviteFailed,
          context: 'workspaceSettings.invite',
        });
      });
    });

    describe('WHEN they revoke the pending invitation', () => {
      beforeEach(async () => {
        await act(async () => {
          await settings.current.revokeInvitation('inv-1');
          await vi.advanceTimersByTimeAsync(0);
        });
      });

      test('THEN the invitation is restored and the failure surfaces', () => {
        expect(settings.current.invitations).toEqual([workspaceInvitation('inv-1')]);
        expect(getWorkspaceInvitations).toHaveBeenCalledTimes(2);
        expect(event.success).not.toHaveBeenCalled();
        expect(event.error).toHaveBeenCalledExactlyOnceWith(expect.any(Error), {
          title: TRANSLATIONS.platform.workspaceSettings.members.revokeFailed,
          context: 'workspaceSettings.revokeInvitation',
        });
      });
    });

    describe('WHEN they create a role', () => {
      let created: boolean;

      beforeEach(async () => {
        await act(async () => {
          created = await settings.current.createRole('Reviewers', 'sparkles', ROLE_PERMISSIONS);
          await vi.advanceTimersByTimeAsync(0);
        });
      });

      test('THEN the creation reports failure without a refetch', () => {
        expect(created).toBe(false);
        expect(getWorkspaceRoles).toHaveBeenCalledTimes(1);
        expect(event.success).not.toHaveBeenCalled();
        expect(event.error).toHaveBeenCalledExactlyOnceWith(expect.any(Error), {
          title: TRANSLATIONS.platform.workspaceSettings.roles.createFailed,
          context: 'workspaceSettings.createRole',
        });
      });
    });

    describe('WHEN they update their own role', () => {
      let updated: boolean;

      beforeEach(async () => {
        await act(async () => {
          updated = await settings.current.updateRole('role-owner', 'Owners', 'crown', ROLE_PERMISSIONS);
          await vi.advanceTimersByTimeAsync(0);
        });
      });

      test('THEN the update reports failure without touching their access', () => {
        expect(updated).toBe(false);
        expect(getMyWorkspacePermissions).not.toHaveBeenCalled();
        expect(event.success).not.toHaveBeenCalled();
        expect(event.error).toHaveBeenCalledExactlyOnceWith(expect.any(Error), {
          title: TRANSLATIONS.platform.workspaceSettings.roles.updateFailed,
          context: 'workspaceSettings.updateRole',
        });
      });
    });

    describe('WHEN they delete a role', () => {
      beforeEach(async () => {
        await act(async () => {
          await settings.current.deleteRole('role-custom');
          await vi.advanceTimersByTimeAsync(0);
        });
      });

      test('THEN the roles stay and the failure surfaces', () => {
        expect(settings.current.roles).toEqual(roleList());
        expect(getWorkspaceRoles).toHaveBeenCalledTimes(1);
        expect(event.success).not.toHaveBeenCalled();
        expect(event.error).toHaveBeenCalledExactlyOnceWith(expect.any(Error), {
          title: TRANSLATIONS.platform.workspaceSettings.roles.deleteFailed,
          context: 'workspaceSettings.deleteRole',
        });
      });
    });
  });

  describe('GIVEN permissions loaded for a different workspace', () => {
    beforeEach(async () => {
      primeApi();
      vi.mocked(getWorkspaceInvitations).mockResolvedValue([]);
      vi.mocked(setMemberRole).mockResolvedValue(undefined);
      usePermissionsStore.getState().setAccess('ws-2', 'user-1', FULL_ACCESS);

      settings = renderHook(() => useWorkspaceSettings('ws-1', onWorkspacesChanged)).result;
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
    });

    describe('WHEN they assign the member role to themselves', () => {
      beforeEach(async () => {
        await act(async () => {
          await settings.current.assignRole('user-1', 'role-member');
          await vi.advanceTimersByTimeAsync(0);
        });
      });

      test('THEN the foreign access stays untouched while the workspaces reload', () => {
        expect(getMyWorkspacePermissions).not.toHaveBeenCalled();
        expect(usePermissionsStore.getState().workspaceId).toBe('ws-2');
        expect(onWorkspacesChanged).toHaveBeenCalledTimes(1);
        expect(event.success).toHaveBeenCalledExactlyOnceWith(
          TRANSLATIONS.platform.workspaceSettings.members.roleChanged,
        );
      });
    });
  });

  describe('GIVEN an access refresh still in flight when another workspace becomes active', () => {
    let resolveAccess: (access: IWorkspaceAccess) => void;

    beforeEach(async () => {
      const pendingAccess = Promise.withResolvers<IWorkspaceAccess>();

      resolveAccess = pendingAccess.resolve;
      primeApi();
      vi.mocked(getWorkspaceInvitations).mockResolvedValue([]);
      vi.mocked(setMemberRole).mockResolvedValue(undefined);
      vi.mocked(getMyWorkspacePermissions).mockReturnValue(pendingAccess.promise);
      usePermissionsStore.getState().setAccess('ws-1', 'user-1', FULL_ACCESS);

      settings = renderHook(() => useWorkspaceSettings('ws-1', onWorkspacesChanged)).result;
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
      await act(async () => {
        settings.current.assignRole('user-1', 'role-member');
        await vi.advanceTimersByTimeAsync(0);
      });
      usePermissionsStore.getState().setAccess('ws-2', 'user-1', FULL_ACCESS);
    });

    describe('WHEN the stale refresh settles', () => {
      beforeEach(async () => {
        await act(async () => {
          resolveAccess(EDIT_ACCESS);
          await vi.advanceTimersByTimeAsync(0);
        });
      });

      test('THEN the access of the newly active workspace stays in the store', () => {
        expect(usePermissionsStore.getState()).toMatchObject({ workspaceId: 'ws-2', ...FULL_ACCESS });
      });
    });
  });
});
