export interface IIntegrationSupabaseEnv {
  url: string;
  anonKey: string;
  serviceRoleKey: string;
}

export interface IIntegrationError {
  code?: string;
  message?: string;
  status?: number;
}

export interface IIntegrationResponse<TData = unknown> {
  error: IIntegrationError | null;
  data: TData | null;
}

export interface IIntegrationAccount {
  id: string;
  email: string;
  password: string;
}

export interface IIntegrationWorkspace {
  id: string;
  name: string;
}

export interface IIntegrationThread {
  id: string;
  questionNodeId: string;
}

export interface IIntegrationWorkspaceRow {
  name: string;
  owner_id: string;
}

export interface IIntegrationFolderRow {
  workspace_id: string;
  parent_folder_id: string | null;
  position: number;
}

export interface IIntegrationThreadRow {
  workspace_id: string;
  folder_id: string | null;
  name: string;
}

export interface IIntegrationNodeRow {
  thread_id: string;
  type: string;
  label: string;
  status: string | null;
  is_answer: boolean;
  position_x: number;
  position_y: number;
  source_node_id: string | null;
  created_by: string | null;
}

export interface IIntegrationEdgeRow {
  source_node_id: string;
  target_node_id: string;
}

export interface IIntegrationNodeCommentRow {
  node_id: string;
  text: string;
}

export interface IIntegrationInvitationRow {
  status: string;
  role_id: string;
}

export interface IIntegrationOnboardingRow {
  offer_answered: boolean;
  completed_guides: string[];
}

export interface IIntegrationRoleFlags {
  canEditCanvas?: boolean;
  canComment?: boolean;
  canManageStructure?: boolean;
  canManageMembers?: boolean;
  canManageRoles?: boolean;
  canManageWorkspace?: boolean;
}

export type TIntegrationRoleKey = 'owner' | 'member' | 'viewer';
