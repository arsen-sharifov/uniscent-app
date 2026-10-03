import type {
  ICanvasNodeWithThreadRow,
  IComment,
  IFolder,
  IFolderRow,
  IMyInvitation,
  IMyInvitationRow,
  IMyWorkspaceRow,
  INodeCommentRow,
  INodeReference,
  IOnboardingProgress,
  IOnboardingRow,
  IReferenceTargetMeta,
  IThread,
  IThreadRow,
  IWorkspace,
  IWorkspaceAccess,
  IWorkspaceAccessRow,
  IWorkspaceInvitation,
  IWorkspaceInvitationRow,
  IWorkspaceItem,
  IWorkspaceMember,
  IWorkspaceMemberRow,
  IWorkspaceRole,
  IWorkspaceRolePermissions,
  IWorkspaceRoleRow,
  IWorkspaceRow,
} from '@interfaces';

import { isAvatarIcon, isGuideId } from '@/lib/utils';

export const toWorkspace = (row: IWorkspaceRow): IWorkspace => ({
  id: row.id,
  name: row.name,
  ownerId: row.owner_id,
  createdAt: row.created_at,
});

export const toMyWorkspace = (row: IMyWorkspaceRow): IWorkspaceItem => ({
  id: row.id,
  name: row.name,
  canManageWorkspace: row.can_manage_workspace,
});

export const toWorkspaceAccess = (row: IWorkspaceAccessRow): IWorkspaceAccess => ({
  isOwner: row.is_owner,
  canEditCanvas: row.can_edit_canvas,
  canComment: row.can_comment,
  canManageStructure: row.can_manage_structure,
  canManageMembers: row.can_manage_members,
  canManageRoles: row.can_manage_roles,
  canManageWorkspace: row.can_manage_workspace,
});

export const toFolder = (row: IFolderRow): IFolder => ({
  id: row.id,
  workspaceId: row.workspace_id,
  parentFolderId: row.parent_folder_id ?? null,
  name: row.name,
  position: row.position,
});

export const toThread = (row: IThreadRow): IThread => ({
  id: row.id,
  workspaceId: row.workspace_id,
  folderId: row.folder_id ?? null,
  name: row.name,
  position: row.position,
  resolved: false,
});

export const toComment = (row: INodeCommentRow): IComment => ({
  id: row.id,
  text: row.text,
  authorId: row.author_id,
});

const toNodeThreadMeta = (row: ICanvasNodeWithThreadRow): Omit<INodeReference, 'id' | 'label'> => ({
  threadId: row.threads?.id ?? row.thread_id,
  threadName: row.threads?.name ?? '',
  workspaceId: row.threads?.workspace_id ?? '',
  workspaceName: row.threads?.workspaces?.name ?? '',
});

export const toReferenceTargetMeta = (row: ICanvasNodeWithThreadRow): IReferenceTargetMeta => ({
  nodeLabel: row.label,
  ...toNodeThreadMeta(row),
});

export const toNodeReference = (row: ICanvasNodeWithThreadRow): INodeReference => ({
  id: row.id,
  label: row.label,
  ...toNodeThreadMeta(row),
});

export const toWorkspaceRole = (row: IWorkspaceRoleRow): IWorkspaceRole => ({
  id: row.id,
  key: row.key,
  name: row.name,
  icon: row.icon,
  isSystem: row.is_system,
  ...toWorkspaceAccess(row),
  memberCount: Number(row.member_count),
});

export const toRolePermissionParams = (permissions: IWorkspaceRolePermissions) => ({
  p_can_edit_canvas: permissions.canEditCanvas,
  p_can_comment: permissions.canComment,
  p_can_manage_structure: permissions.canManageStructure,
  p_can_manage_members: permissions.canManageMembers,
  p_can_manage_roles: permissions.canManageRoles,
  p_can_manage_workspace: permissions.canManageWorkspace,
});

export const toWorkspaceMember = (row: IWorkspaceMemberRow): IWorkspaceMember => ({
  userId: row.user_id,
  roleId: row.role_id,
  roleKey: row.role_key,
  roleName: row.role_name,
  isOwner: row.is_owner,
  name: row.name ?? '',
  email: row.email,
  avatarIcon: isAvatarIcon(row.avatar_icon) ? row.avatar_icon : null,
  joinedAt: row.joined_at,
});

export const toWorkspaceInvitation = (row: IWorkspaceInvitationRow): IWorkspaceInvitation => ({
  id: row.id,
  email: row.email,
  roleId: row.role_id,
  roleKey: row.role_key,
  roleName: row.role_name,
  createdAt: row.created_at,
});

export const toMyInvitation = (row: IMyInvitationRow): IMyInvitation => ({
  id: row.id,
  workspaceId: row.workspace_id,
  workspaceName: row.workspace_name,
  roleKey: row.role_key,
  roleName: row.role_name,
  invitedByName: row.invited_by_name,
  createdAt: row.created_at,
});

export const toOnboardingProgress = (row: IOnboardingRow): IOnboardingProgress => ({
  offerAnswered: row.offer_answered,
  completedGuides: row.completed_guides.filter(isGuideId),
});
