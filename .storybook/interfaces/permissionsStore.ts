export interface IMockPermissionsState {
  userId?: string | null;
  workspaceId?: string | null;
  resolved?: boolean;
  isOwner?: boolean;
  canEditCanvas?: boolean;
  canComment?: boolean;
  canManageStructure?: boolean;
  canManageMembers?: boolean;
  canManageRoles?: boolean;
  canManageWorkspace?: boolean;
}
