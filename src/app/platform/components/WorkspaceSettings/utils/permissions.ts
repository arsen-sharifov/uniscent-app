import type {
  IWorkspaceAccess,
  IWorkspaceInvitation,
  IWorkspaceRole,
  IWorkspaceRolePermissions,
  TRolePermissionKey,
} from '@interfaces';

import { PERMISSION_DEFINITIONS } from '../consts';

export const canGrantPermission = (key: TRolePermissionKey, granter: IWorkspaceAccess | null): boolean =>
  granter !== null && (granter.isOwner || granter[key]);

export const canGrantRole = (role: IWorkspaceRolePermissions, granter: IWorkspaceAccess | null): boolean =>
  granter !== null && PERMISSION_DEFINITIONS.every(({ key }) => !role[key] || canGrantPermission(key, granter));

export const canReassignRoleHolders = (
  role: IWorkspaceRole,
  fallbackRole: IWorkspaceRolePermissions | undefined,
  invitations: IWorkspaceInvitation[],
  granter: IWorkspaceAccess | null,
): boolean => {
  const mayHaveHolders =
    role.memberCount > 0 ||
    !granter?.canManageMembers ||
    invitations.some((invitation) => invitation.roleId === role.id);

  return !mayHaveHolders || (fallbackRole !== undefined && canGrantRole(fallbackRole, granter));
};
