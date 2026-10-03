import { randomUUID } from 'node:crypto';

import type { SupabaseClient } from '@supabase/supabase-js';

import { CUSTOM_ROLE_POSITION, INTEGRATION_ACCOUNT_DOMAIN, INTEGRATION_ACCOUNT_PASSWORD } from '../consts';
import type {
  IIntegrationAccount,
  IIntegrationEdgeRow,
  IIntegrationFolderRow,
  IIntegrationInvitationRow,
  IIntegrationNodeCommentRow,
  IIntegrationNodeRow,
  IIntegrationOnboardingRow,
  IIntegrationRoleFlags,
  IIntegrationThread,
  IIntegrationThreadRow,
  IIntegrationWorkspace,
  IIntegrationWorkspaceRow,
  TIntegrationRoleKey,
} from '../interfaces';
import { createUserClient, getAdminClient } from './clients';

const userClients = new Map<string, Promise<SupabaseClient>>();

export const uniqueLabel = (prefix: string): string => `${prefix}-${randomUUID().slice(0, 8)}`;

export const seedAccount = async (label: string): Promise<IIntegrationAccount> => {
  const email = `${uniqueLabel(label)}@${INTEGRATION_ACCOUNT_DOMAIN}`;
  const { data, error } = await getAdminClient().auth.admin.createUser({
    email,
    password: INTEGRATION_ACCOUNT_PASSWORD,
    email_confirm: true,
    user_metadata: { name: `Integration ${label}` },
  });

  if (error || !data.user) {
    throw new Error(`Could not create the integration account ${email}: ${error?.message ?? 'no user returned'}`);
  }

  return { id: data.user.id, email, password: INTEGRATION_ACCOUNT_PASSWORD };
};

export const setAccountMetadata = async (userId: string, metadata: Record<string, string>): Promise<void> => {
  const { error } = await getAdminClient().auth.admin.updateUserById(userId, { user_metadata: metadata });

  if (error) throw new Error(`Could not update the metadata of ${userId}: ${error.message}`);
};

const deleteAccount = async (userId: string): Promise<void> => {
  const { error } = await getAdminClient().auth.admin.deleteUser(userId);

  if (error) throw new Error(`Could not delete the integration account ${userId}: ${error.message}`);
};

export const deleteAccounts = async (...accounts: Array<IIntegrationAccount | undefined>): Promise<void> => {
  const failures: string[] = [];

  await accounts
    .filter((account) => account !== undefined)
    .reduce(
      (chain, account) =>
        chain.then(() =>
          deleteAccount(account.id).catch((error: unknown) => {
            failures.push(error instanceof Error ? error.message : String(error));
          }),
        ),
      Promise.resolve(),
    );

  if (failures.length > 0) throw new Error(failures.join('; '));
};

export const getUserClient = (account: IIntegrationAccount): Promise<SupabaseClient> => {
  const cached = userClients.get(account.email) ?? createUserClient(account.email, account.password);
  userClients.set(account.email, cached);

  return cached;
};

export const seedWorkspace = async (ownerId: string, name: string): Promise<IIntegrationWorkspace> => {
  const { data, error } = await getAdminClient()
    .from('workspaces')
    .insert({ name, owner_id: ownerId })
    .select('id, name')
    .single<IIntegrationWorkspace>();

  if (error || !data) throw new Error(`Could not seed the workspace "${name}": ${error?.message ?? 'no row returned'}`);

  return data;
};

export const getRoleId = async (workspaceId: string, key: TIntegrationRoleKey): Promise<string> => {
  const { data, error } = await getAdminClient()
    .from('workspace_roles')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('key', key)
    .single<{ id: string }>();

  if (error || !data) {
    throw new Error(`Could not read the "${key}" role of ${workspaceId}: ${error?.message ?? 'no row returned'}`);
  }

  return data.id;
};

export const seedRole = async (workspaceId: string, name: string, flags: IIntegrationRoleFlags): Promise<string> => {
  const { data, error } = await getAdminClient()
    .from('workspace_roles')
    .insert({
      workspace_id: workspaceId,
      name,
      can_edit_canvas: flags.canEditCanvas ?? false,
      can_comment: flags.canComment ?? false,
      can_manage_structure: flags.canManageStructure ?? false,
      can_manage_members: flags.canManageMembers ?? false,
      can_manage_roles: flags.canManageRoles ?? false,
      can_manage_workspace: flags.canManageWorkspace ?? false,
      position: CUSTOM_ROLE_POSITION,
    })
    .select('id')
    .single<{ id: string }>();

  if (error || !data) throw new Error(`Could not seed the role "${name}": ${error?.message ?? 'no row returned'}`);

  return data.id;
};

export const seedMemberWithRole = async (workspaceId: string, userId: string, roleId: string): Promise<void> => {
  const { error } = await getAdminClient()
    .from('workspace_members')
    .insert({ workspace_id: workspaceId, user_id: userId, role_id: roleId, position: 0 });

  if (error) throw new Error(`Could not add ${userId} to ${workspaceId}: ${error.message}`);
};

export const seedMember = async (
  workspaceId: string,
  userId: string,
  key: Exclude<TIntegrationRoleKey, 'owner'>,
): Promise<void> => {
  const roleId = await getRoleId(workspaceId, key);
  await seedMemberWithRole(workspaceId, userId, roleId);
};

export const setMemberRole = async (workspaceId: string, userId: string, roleId: string): Promise<void> => {
  const { error } = await getAdminClient()
    .from('workspace_members')
    .update({ role_id: roleId })
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId);

  if (error) throw new Error(`Could not set the role of ${userId} in ${workspaceId}: ${error.message}`);
};

export const readMemberRole = async (workspaceId: string, userId: string): Promise<string> => {
  const { data, error } = await getAdminClient()
    .from('workspace_members')
    .select('role_id')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .single<{ role_id: string }>();

  if (error || !data) throw new Error(`Could not read the membership of ${userId}: ${error?.message ?? 'no row'}`);

  return data.role_id;
};

export const readMemberRoleKey = async (workspaceId: string, userId: string): Promise<string | null> => {
  const { data, error } = await getAdminClient()
    .from('workspace_members')
    .select('workspace_roles(key)')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .maybeSingle<{ workspace_roles: { key: string | null } | null }>();

  if (error) throw new Error(`Could not read the role key of ${userId} in ${workspaceId}: ${error.message}`);

  return data?.workspace_roles?.key ?? null;
};

export const readRoleHolders = async (workspaceId: string, roleId: string): Promise<string[]> => {
  const { data, error } = await getAdminClient()
    .from('workspace_members')
    .select('user_id')
    .eq('workspace_id', workspaceId)
    .eq('role_id', roleId)
    .returns<{ user_id: string }[]>();

  if (error) throw new Error(`Could not read the holders of the role ${roleId}: ${error.message}`);

  return data.map((row) => row.user_id);
};

export const isMember = async (workspaceId: string, userId: string): Promise<boolean> => {
  const { data, error } = await getAdminClient()
    .from('workspace_members')
    .select('user_id')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .maybeSingle<{ user_id: string }>();

  if (error) throw new Error(`Could not read the membership of ${userId}: ${error.message}`);

  return data !== null;
};

export const removeMember = async (workspaceId: string, userId: string): Promise<void> => {
  const { error } = await getAdminClient()
    .from('workspace_members')
    .delete()
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId);

  if (error) throw new Error(`Could not remove ${userId} from ${workspaceId}: ${error.message}`);
};

export const seedInvitation = async (
  workspaceId: string,
  email: string,
  roleId: string,
  options: { expiresAt?: Date; invitedBy?: string } = {},
): Promise<string> => {
  const { data, error } = await getAdminClient()
    .from('workspace_invitations')
    .insert({
      workspace_id: workspaceId,
      email: email.toLowerCase(),
      role_id: roleId,
      ...(options.expiresAt && { expires_at: options.expiresAt.toISOString() }),
      ...(options.invitedBy && { invited_by: options.invitedBy }),
    })
    .select('id')
    .single<{ id: string }>();

  if (error || !data) throw new Error(`Could not seed an invitation for ${email}: ${error?.message ?? 'no row'}`);

  return data.id;
};

export const seedInvitations = async (workspaceId: string, count: number, roleId: string): Promise<void> => {
  const { error } = await getAdminClient()
    .from('workspace_invitations')
    .insert(
      Array.from({ length: count }, () => ({
        workspace_id: workspaceId,
        email: `${uniqueLabel('pending')}@${INTEGRATION_ACCOUNT_DOMAIN}`,
        role_id: roleId,
      })),
    );

  if (error) throw new Error(`Could not seed ${count} invitations on ${workspaceId}: ${error.message}`);
};

export const countPendingInvitations = async (workspaceId: string): Promise<number> => {
  const { count, error } = await getAdminClient()
    .from('workspace_invitations')
    .select('id', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString());

  if (error) throw new Error(`Could not count the pending invitations of ${workspaceId}: ${error.message}`);

  return count ?? 0;
};

export const deleteInvitations = async (workspaceId: string, email: string): Promise<void> => {
  const { error } = await getAdminClient()
    .from('workspace_invitations')
    .delete()
    .eq('workspace_id', workspaceId)
    .eq('email', email.toLowerCase());

  if (error) throw new Error(`Could not delete the invitations of ${email}: ${error.message}`);
};

export const readInvitation = async (invitationId: string): Promise<IIntegrationInvitationRow | null> => {
  const { data, error } = await getAdminClient()
    .from('workspace_invitations')
    .select('status, role_id')
    .eq('id', invitationId)
    .maybeSingle<IIntegrationInvitationRow>();

  if (error) throw new Error(`Could not read the invitation ${invitationId}: ${error.message}`);

  return data;
};

export const readInvitationExpiry = async (invitationId: string): Promise<number> => {
  const { data, error } = await getAdminClient()
    .from('workspace_invitations')
    .select('expires_at')
    .eq('id', invitationId)
    .single<{ expires_at: string }>();

  if (error || !data) {
    throw new Error(`Could not read the expiry of the invitation ${invitationId}: ${error?.message ?? 'no row'}`);
  }

  return Date.parse(data.expires_at);
};

export const readInvitationByEmail = async (
  workspaceId: string,
  email: string,
): Promise<IIntegrationInvitationRow | null> => {
  const { data, error } = await getAdminClient()
    .from('workspace_invitations')
    .select('status, role_id')
    .eq('workspace_id', workspaceId)
    .eq('email', email.toLowerCase())
    .maybeSingle<IIntegrationInvitationRow>();

  if (error) throw new Error(`Could not read the invitation of ${email}: ${error.message}`);

  return data;
};

export const seedFolder = async (workspaceId: string, parentFolderId: string | null = null): Promise<string> => {
  const { data, error } = await getAdminClient()
    .from('folders')
    .insert({ workspace_id: workspaceId, parent_folder_id: parentFolderId, name: uniqueLabel('folder') })
    .select('id')
    .single<{ id: string }>();

  if (error || !data) {
    throw new Error(`Could not seed a folder on ${workspaceId}: ${error?.message ?? 'no row returned'}`);
  }

  return data.id;
};

export const readFolder = async (folderId: string): Promise<IIntegrationFolderRow | null> => {
  const { data, error } = await getAdminClient()
    .from('folders')
    .select('workspace_id, parent_folder_id, position')
    .eq('id', folderId)
    .maybeSingle<IIntegrationFolderRow>();

  if (error) throw new Error(`Could not read the folder ${folderId}: ${error.message}`);

  return data;
};

export const readThread = async (threadId: string): Promise<IIntegrationThreadRow | null> => {
  const { data, error } = await getAdminClient()
    .from('threads')
    .select('workspace_id, folder_id, name')
    .eq('id', threadId)
    .maybeSingle<IIntegrationThreadRow>();

  if (error) throw new Error(`Could not read the thread ${threadId}: ${error.message}`);

  return data;
};

export const seedThread = async (workspaceId: string, createdBy: string): Promise<IIntegrationThread> => {
  const { data, error } = await getAdminClient()
    .from('threads')
    .insert({ workspace_id: workspaceId, name: uniqueLabel('thread') })
    .select('id')
    .single<{ id: string }>();

  if (error || !data) {
    throw new Error(`Could not seed a thread on ${workspaceId}: ${error?.message ?? 'no row returned'}`);
  }

  const questionNodeId = await seedNode(data.id, createdBy, { type: 'question-node' });

  return { id: data.id, questionNodeId };
};

export const seedNode = async (
  threadId: string,
  createdBy: string,
  options: { type?: string; label?: string } = {},
): Promise<string> => {
  const { data, error } = await getAdminClient()
    .from('canvas_nodes')
    .insert({
      thread_id: threadId,
      type: options.type ?? 'canvas-node',
      position_x: 0,
      position_y: 0,
      label: options.label ?? '',
      created_by: createdBy,
    })
    .select('id')
    .single<{ id: string }>();

  if (error || !data) {
    throw new Error(`Could not seed a node on ${threadId}: ${error?.message ?? 'no row returned'}`);
  }

  return data.id;
};

export const seedEdge = async (
  threadId: string,
  sourceNodeId: string,
  targetNodeId: string,
  createdBy: string,
): Promise<string> => {
  const { data, error } = await getAdminClient()
    .from('canvas_edges')
    .insert({
      thread_id: threadId,
      source_node_id: sourceNodeId,
      target_node_id: targetNodeId,
      source_handle: 'bottom',
      target_handle: 'top',
      created_by: createdBy,
    })
    .select('id')
    .single<{ id: string }>();

  if (error || !data) {
    throw new Error(`Could not seed an edge on ${threadId}: ${error?.message ?? 'no row returned'}`);
  }

  return data.id;
};

export const readNode = async (nodeId: string): Promise<IIntegrationNodeRow | null> => {
  const { data, error } = await getAdminClient()
    .from('canvas_nodes')
    .select('thread_id, type, label, status, is_answer, position_x, position_y, source_node_id, created_by')
    .eq('id', nodeId)
    .maybeSingle<IIntegrationNodeRow>();

  if (error) throw new Error(`Could not read the node ${nodeId}: ${error.message}`);

  return data;
};

export const readEdge = async (edgeId: string): Promise<IIntegrationEdgeRow | null> => {
  const { data, error } = await getAdminClient()
    .from('canvas_edges')
    .select('source_node_id, target_node_id')
    .eq('id', edgeId)
    .maybeSingle<IIntegrationEdgeRow>();

  if (error) throw new Error(`Could not read the edge ${edgeId}: ${error.message}`);

  return data;
};

export const readWorkspaceRole = async (roleId: string, columns: string): Promise<Record<string, unknown> | null> => {
  const { data, error } = await getAdminClient()
    .from('workspace_roles')
    .select(columns)
    .eq('id', roleId)
    .maybeSingle<Record<string, unknown>>();

  if (error) throw new Error(`Could not read the role ${roleId}: ${error.message}`);

  return data;
};

export const readWorkspace = async (workspaceId: string): Promise<IIntegrationWorkspaceRow | null> => {
  const { data, error } = await getAdminClient()
    .from('workspaces')
    .select('name, owner_id')
    .eq('id', workspaceId)
    .maybeSingle<IIntegrationWorkspaceRow>();

  if (error) throw new Error(`Could not read the workspace ${workspaceId}: ${error.message}`);

  return data;
};

export const readOnboarding = async (userId: string): Promise<IIntegrationOnboardingRow | null> => {
  const { data, error } = await getAdminClient()
    .from('user_onboarding')
    .select('offer_answered, completed_guides')
    .eq('user_id', userId)
    .maybeSingle<IIntegrationOnboardingRow>();

  if (error) throw new Error(`Could not read the onboarding of ${userId}: ${error.message}`);

  return data;
};

export const seedNodeComment = async (nodeId: string, authorId: string, text: string): Promise<string> => {
  const { data, error } = await getAdminClient()
    .from('node_comments')
    .insert({ node_id: nodeId, author_id: authorId, text })
    .select('id')
    .single<{ id: string }>();

  if (error || !data) throw new Error(`Could not seed a comment on ${nodeId}: ${error?.message ?? 'no row returned'}`);

  return data.id;
};

export const readNodeComment = async (commentId: string): Promise<IIntegrationNodeCommentRow | null> => {
  const { data, error } = await getAdminClient()
    .from('node_comments')
    .select('node_id, text')
    .eq('id', commentId)
    .maybeSingle<IIntegrationNodeCommentRow>();

  if (error) throw new Error(`Could not read the comment ${commentId}: ${error.message}`);

  return data;
};

export const seedSignupAllowance = async (email: string, expiresAt: Date): Promise<void> => {
  const { error } = await getAdminClient()
    .from('signup_allowances')
    .upsert({ email: email.toLowerCase(), expires_at: expiresAt.toISOString() });

  if (error) throw new Error(`Could not seed a sign-up allowance for ${email}: ${error.message}`);
};

export const hasSignupAllowance = async (email: string): Promise<boolean> => {
  const { data, error } = await getAdminClient()
    .from('signup_allowances')
    .select('email')
    .eq('email', email.toLowerCase())
    .maybeSingle<{ email: string }>();

  if (error) throw new Error(`Could not read the sign-up allowance of ${email}: ${error.message}`);

  return data !== null;
};

export const deleteSignupAllowance = async (email: string): Promise<void> => {
  const { error } = await getAdminClient().from('signup_allowances').delete().eq('email', email.toLowerCase());

  if (error) throw new Error(`Could not delete the sign-up allowance of ${email}: ${error.message}`);
};

export const readAccountId = async (email: string): Promise<string | null> => {
  const { data, error } = await getAdminClient().auth.admin.listUsers({ page: 1, perPage: 1000 });

  if (error) throw new Error(`Could not list the accounts: ${error.message}`);

  return data.users.find((user) => user.email === email.toLowerCase())?.id ?? null;
};

export const deleteAccountByEmail = async (email: string): Promise<void> => {
  const accountId = await readAccountId(email);

  if (accountId) await deleteAccount(accountId);
};
