import type { TAvatarIcon } from '@interfaces';

export interface IWorkspace {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
}

export interface IFolder {
  id: string;
  workspaceId: string;
  parentFolderId: string | null;
  name: string;
  position: number;
}

export interface IThread {
  id: string;
  workspaceId: string;
  folderId: string | null;
  name: string;
  position: number;
  resolved: boolean;
}

export interface IWorkspaceRow {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
}

export interface IMyWorkspaceRow {
  id: string;
  name: string;
  can_manage_workspace: boolean;
}

export interface IWorkspaceAccess extends IWorkspaceRolePermissions {
  isOwner: boolean;
}

export interface IWorkspaceAccessRow {
  is_owner: boolean;
  can_edit_canvas: boolean;
  can_comment: boolean;
  can_manage_structure: boolean;
  can_manage_members: boolean;
  can_manage_roles: boolean;
  can_manage_workspace: boolean;
}

export interface IFolderRow {
  id: string;
  workspace_id: string;
  parent_folder_id: string | null;
  name: string;
  position: number;
}

export interface IThreadRow {
  id: string;
  workspace_id: string;
  folder_id: string | null;
  name: string;
  position: number;
}

export type TWorkspaceRoleKey = 'owner' | 'member' | 'viewer';

export interface IWorkspaceRolePermissions {
  canEditCanvas: boolean;
  canComment: boolean;
  canManageStructure: boolean;
  canManageMembers: boolean;
  canManageRoles: boolean;
  canManageWorkspace: boolean;
}

export interface IWorkspaceRole extends IWorkspaceRolePermissions {
  id: string;
  key: TWorkspaceRoleKey | null;
  name: string;
  icon: string | null;
  isSystem: boolean;
  isOwner: boolean;
  memberCount: number;
}

export interface IWorkspaceMember {
  userId: string;
  roleId: string;
  roleKey: TWorkspaceRoleKey | null;
  roleName: string;
  isOwner: boolean;
  name: string;
  email: string;
  avatarIcon: TAvatarIcon | null;
  joinedAt: string;
}

export interface IWorkspaceInvitation {
  id: string;
  email: string;
  roleId: string;
  roleKey: TWorkspaceRoleKey | null;
  roleName: string;
  createdAt: string;
}

export interface IMyInvitation {
  id: string;
  workspaceId: string;
  workspaceName: string;
  roleKey: TWorkspaceRoleKey | null;
  roleName: string;
  invitedByName: string | null;
  createdAt: string;
}

export interface IWorkspaceRoleRow {
  id: string;
  key: TWorkspaceRoleKey | null;
  name: string;
  icon: string | null;
  is_system: boolean;
  is_owner: boolean;
  can_edit_canvas: boolean;
  can_comment: boolean;
  can_manage_structure: boolean;
  can_manage_members: boolean;
  can_manage_roles: boolean;
  can_manage_workspace: boolean;
  member_count: number;
}

export interface IWorkspaceMemberRow {
  user_id: string;
  role_id: string;
  role_key: TWorkspaceRoleKey | null;
  role_name: string;
  is_owner: boolean;
  joined_at: string;
  name: string | null;
  email: string;
  avatar_icon: string | null;
}

export interface IWorkspaceInvitationRow {
  id: string;
  email: string;
  role_id: string;
  role_key: TWorkspaceRoleKey | null;
  role_name: string;
  created_at: string;
}

export interface IMyInvitationRow {
  id: string;
  workspace_id: string;
  workspace_name: string;
  role_key: TWorkspaceRoleKey | null;
  role_name: string;
  invited_by_name: string | null;
  created_at: string;
}

export interface INodeEditAccess extends Pick<IWorkspaceAccess, 'isOwner' | 'canEditCanvas'> {
  userId: string | null;
}
