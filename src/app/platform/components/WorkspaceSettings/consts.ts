import {
  Award,
  Compass,
  Crown,
  Eye,
  Files,
  Flag,
  MessageSquare,
  PenTool,
  Rocket,
  Settings,
  Shield,
  SlidersHorizontal,
  Sparkles,
  SquarePen,
  Star,
  Target,
  Users,
  Zap,
  type LucideIcon,
} from 'lucide-react';

import type {
  IPermissionDefinition,
  IRoleIconOption,
  IWorkspaceRolePermissions,
  IWorkspaceSettingsSidebarGroup,
  TTourAnchor,
  TWorkspaceRoleKey,
  TWorkspaceSettingsSection,
} from '@interfaces';

export const WORKSPACE_SECTION_ANCHORS: Record<TWorkspaceSettingsSection, TTourAnchor> = {
  general: 'workspaceSettingsGeneral',
  members: 'workspaceSettingsMembers',
  roles: 'workspaceSettingsRoles',
};

export const WORKSPACE_SECTION_NAV_ANCHORS: Record<TWorkspaceSettingsSection, TTourAnchor> = {
  general: 'workspaceSettingsGeneralNav',
  members: 'workspaceSettingsMembersNav',
  roles: 'workspaceSettingsRolesNav',
};

export const WORKSPACE_SETTINGS_GROUPS = [
  {
    labelKey: 'workspace',
    items: [{ id: 'general', icon: SlidersHorizontal }],
  },
  {
    labelKey: 'access',
    items: [
      { id: 'members', icon: Users },
      { id: 'roles', icon: Shield },
    ],
  },
] as const satisfies readonly IWorkspaceSettingsSidebarGroup[];

export const PERMISSION_DEFINITIONS = [
  { key: 'canEditCanvas', icon: SquarePen },
  { key: 'canComment', icon: MessageSquare },
  { key: 'canManageStructure', icon: Files },
  { key: 'canManageMembers', icon: Users },
  { key: 'canManageRoles', icon: Shield },
  { key: 'canManageWorkspace', icon: Settings },
] as const satisfies readonly IPermissionDefinition[];

export const EMPTY_PERMISSIONS: IWorkspaceRolePermissions = {
  canEditCanvas: false,
  canComment: false,
  canManageStructure: false,
  canManageMembers: false,
  canManageRoles: false,
  canManageWorkspace: false,
};

export const SYSTEM_ROLE_ICONS: Record<TWorkspaceRoleKey, LucideIcon> = {
  owner: Crown,
  member: SquarePen,
  viewer: Eye,
};

export const CUSTOM_ROLE_ICON: LucideIcon = Shield;

export const DEFAULT_ROLE_ICON_KEY = 'shield';

export const ROLE_ICONS: readonly IRoleIconOption[] = [
  { key: 'shield', icon: Shield },
  { key: 'star', icon: Star },
  { key: 'flag', icon: Flag },
  { key: 'sparkles', icon: Sparkles },
  { key: 'target', icon: Target },
  { key: 'zap', icon: Zap },
  { key: 'rocket', icon: Rocket },
  { key: 'award', icon: Award },
  { key: 'compass', icon: Compass },
  { key: 'crown', icon: Crown },
  { key: 'penTool', icon: PenTool },
  { key: 'eye', icon: Eye },
];

export const ROLE_ICON_MAP: Record<string, LucideIcon> = Object.fromEntries(
  ROLE_ICONS.map((option) => [option.key, option.icon]),
);

export const WORKSPACE_SKELETON_META_ROWS: readonly string[] = ['w-36', 'w-24', 'w-28'];

export const WORKSPACE_SKELETON_PEOPLE: readonly string[] = ['w-36', 'w-28', 'w-44'];

export const WORKSPACE_SKELETON_ROLES: readonly string[] = ['w-24', 'w-32', 'w-28'];
