import type { LucideIcon } from 'lucide-react';

import type { IWorkspaceRole, IWorkspaceRolePermissions, TTranslations } from '@interfaces';

export type TWorkspaceSettingsSection = 'general' | 'members' | 'roles';

export type TRoleEditorState = { mode: 'create' } | { mode: 'edit'; role: IWorkspaceRole } | null;

export type TWorkspaceSettingsGroupLabel = 'workspace' | 'access';

export type TRolePermissionKey = keyof IWorkspaceRolePermissions;

export type TRoleIconKey = keyof TTranslations['platform']['workspaceSettings']['roleIcons'];

export interface IWorkspaceSettingsSidebarItem {
  id: TWorkspaceSettingsSection;
  icon: LucideIcon;
}

export interface IWorkspaceSettingsSidebarGroup {
  labelKey: TWorkspaceSettingsGroupLabel;
  items: IWorkspaceSettingsSidebarItem[];
}

export interface IPermissionDefinition {
  key: TRolePermissionKey;
  icon: LucideIcon;
}

export interface IRoleIconOption {
  key: TRoleIconKey;
  icon: LucideIcon;
}
