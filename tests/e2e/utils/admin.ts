import { randomBytes } from 'node:crypto';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import {
  CANVAS_NODE_TYPE,
  E2E_ACCOUNT_DOMAIN,
  E2E_ACCOUNT_PASSWORD,
  E2E_ACCOUNT_PLAN,
  QUESTION_NODE_TYPE,
  QUESTION_POSITION,
  REFERENCE_NODE_TYPE,
} from '../consts';
import type {
  IE2EFolder,
  IE2ENodeSeed,
  IE2ERolePermissions,
  IE2ESeededAccount,
  IE2EThread,
  IE2EWorkspace,
  TE2ERoleKey,
} from '../interfaces';
import { getAppUrl, getSupabaseEnv } from './env';

let client: SupabaseClient | null = null;

export const uniqueLabel = (prefix: string): string => `${prefix}-${randomBytes(4).toString('hex')}`;

const getAdminClient = (): SupabaseClient => {
  if (!client) {
    const { url, serviceRoleKey } = getSupabaseEnv();
    client = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  }

  return client;
};

export const answerOnboardingOffer = async (userId: string, completedGuides: readonly string[] = []): Promise<void> => {
  const { error } = await getAdminClient()
    .from('user_onboarding')
    .upsert({ user_id: userId, offer_answered: true, completed_guides: completedGuides });

  if (error) throw new Error(`Could not answer the onboarding offer of ${userId}: ${error.message}`);
};

export const seedAccount = async (label: string): Promise<IE2ESeededAccount> => {
  const email = `${label}@${E2E_ACCOUNT_DOMAIN}`;
  const name = `E2E ${label}`;
  const { data, error } = await getAdminClient().auth.admin.createUser({
    email,
    password: E2E_ACCOUNT_PASSWORD,
    email_confirm: true,
    user_metadata: { name, plan: E2E_ACCOUNT_PLAN },
  });

  if (error || !data.user) {
    throw new Error(`Could not create the E2E account ${email}: ${error?.message ?? 'no user returned'}`);
  }

  await answerOnboardingOffer(data.user.id);

  return { id: data.user.id, email, name, password: E2E_ACCOUNT_PASSWORD };
};

export const deleteAccount = async (userId: string): Promise<void> => {
  const { error } = await getAdminClient().auth.admin.deleteUser(userId);

  if (error) throw new Error(`Could not delete the E2E account ${userId}: ${error.message}`);
};

export const deleteAccountByEmail = async (email: string): Promise<void> => {
  const { data, error } = await getAdminClient().auth.admin.listUsers({ page: 1, perPage: 1000 });

  if (error) throw new Error(`Could not look up ${email} for cleanup: ${error.message}`);

  const user = data.users.find((candidate) => candidate.email === email);

  if (user) await deleteAccount(user.id);
};

export const seedWorkspace = async (ownerId: string, name: string): Promise<IE2EWorkspace> => {
  const { data, error } = await getAdminClient()
    .from('workspaces')
    .insert({ name, owner_id: ownerId })
    .select('id, name')
    .single<IE2EWorkspace>();

  if (error || !data) throw new Error(`Could not seed the workspace "${name}": ${error?.message ?? 'no row returned'}`);

  return data;
};

export const deleteOwnedWorkspaces = async (ownerId: string): Promise<void> => {
  const { error } = await getAdminClient().from('workspaces').delete().eq('owner_id', ownerId);

  if (error) throw new Error(`Could not clean up the workspaces of ${ownerId}: ${error.message}`);
};

export const deletePreferences = async (userId: string): Promise<void> => {
  const { error } = await getAdminClient().from('user_preferences').delete().eq('user_id', userId);

  if (error) throw new Error(`Could not reset the preferences of ${userId}: ${error.message}`);
};

export const deleteOnboarding = async (userId: string): Promise<void> => {
  const { error } = await getAdminClient().from('user_onboarding').delete().eq('user_id', userId);

  if (error) throw new Error(`Could not reset the onboarding of ${userId}: ${error.message}`);
};

export const seedFolder = async (workspaceId: string, name: string): Promise<IE2EFolder> => {
  const { data, error } = await getAdminClient()
    .from('folders')
    .insert({ workspace_id: workspaceId, name })
    .select('id, name')
    .single<IE2EFolder>();

  if (error || !data) throw new Error(`Could not seed the folder "${name}": ${error?.message ?? 'no row returned'}`);

  return data;
};

const seedQuestionNode = async (threadId: string, createdBy: string, label = ''): Promise<string> => {
  const { data, error } = await getAdminClient()
    .from('canvas_nodes')
    .insert({
      thread_id: threadId,
      type: QUESTION_NODE_TYPE,
      position_x: QUESTION_POSITION.x,
      position_y: QUESTION_POSITION.y,
      label,
      created_by: createdBy,
    })
    .select('id')
    .single<{ id: string }>();

  if (error || !data) {
    throw new Error(`Could not seed the question node of ${threadId}: ${error?.message ?? 'no row returned'}`);
  }

  return data.id;
};

export const seedThread = async (
  workspaceId: string,
  name: string,
  createdBy: string,
  options: { folderId?: string; position?: number; question?: string } = {},
): Promise<IE2EThread> => {
  const { data, error } = await getAdminClient()
    .from('threads')
    .insert({
      workspace_id: workspaceId,
      folder_id: options.folderId ?? null,
      name,
      position: options.position ?? 0,
    })
    .select('id, name')
    .single<{ id: string; name: string }>();

  if (error || !data) throw new Error(`Could not seed the thread "${name}": ${error?.message ?? 'no row returned'}`);

  const questionNodeId = await seedQuestionNode(data.id, createdBy, options.question ?? '');

  return { ...data, questionNodeId };
};

export const seedNodes = async (threadId: string, createdBy: string, seeds: IE2ENodeSeed[]): Promise<string[]> => {
  const { data, error } = await getAdminClient()
    .from('canvas_nodes')
    .insert(
      seeds.map((seed) => ({
        thread_id: threadId,
        type: CANVAS_NODE_TYPE,
        position_x: seed.x,
        position_y: seed.y,
        label: seed.label,
        created_by: createdBy,
      })),
    )
    .select('id')
    .returns<{ id: string }[]>();

  if (error || !data) throw new Error(`Could not seed nodes on ${threadId}: ${error?.message ?? 'no rows returned'}`);

  return data.map((row) => row.id);
};

export const seedReferenceNode = async (
  threadId: string,
  createdBy: string,
  sourceNodeId: string,
  seed: IE2ENodeSeed,
): Promise<void> => {
  const { error } = await getAdminClient().from('canvas_nodes').insert({
    thread_id: threadId,
    type: REFERENCE_NODE_TYPE,
    position_x: seed.x,
    position_y: seed.y,
    label: seed.label,
    created_by: createdBy,
    source_node_id: sourceNodeId,
  });

  if (error) throw new Error(`Could not seed a reference node on ${threadId}: ${error.message}`);
};

export const seedEdge = async (threadId: string, sourceNodeId: string, targetNodeId: string): Promise<void> => {
  const { error } = await getAdminClient().from('canvas_edges').insert({
    thread_id: threadId,
    source_node_id: sourceNodeId,
    target_node_id: targetNodeId,
    source_handle: 'bottom',
    target_handle: 'top',
  });

  if (error) throw new Error(`Could not seed an edge on ${threadId}: ${error.message}`);
};

const getRoleId = async (workspaceId: string, key: TE2ERoleKey): Promise<string> => {
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

export const seedRole = async (
  workspaceId: string,
  name: string,
  permissions: IE2ERolePermissions,
): Promise<string> => {
  const { data, error } = await getAdminClient()
    .from('workspace_roles')
    .insert({
      workspace_id: workspaceId,
      name,
      can_edit_canvas: permissions.canEditCanvas ?? false,
      can_comment: permissions.canComment ?? false,
      position: 3,
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

export const seedMember = async (workspaceId: string, userId: string, key: TE2ERoleKey): Promise<void> => {
  const roleId = await getRoleId(workspaceId, key);
  await seedMemberWithRole(workspaceId, userId, roleId);
};

export const seedInvitation = async (workspaceId: string, email: string, key: TE2ERoleKey): Promise<void> => {
  const roleId = await getRoleId(workspaceId, key);
  const { error } = await getAdminClient()
    .from('workspace_invitations')
    .insert({ workspace_id: workspaceId, email, role_id: roleId });

  if (error) throw new Error(`Could not seed an invitation for ${email} to ${workspaceId}: ${error.message}`);
};

export const sendInviteEmail = async (email: string, workspaceName: string): Promise<void> => {
  const { error: allowanceError } = await getAdminClient().rpc('grant_signup_allowance', { p_email: email });

  if (allowanceError) throw new Error(`Could not allow the sign-up of ${email}: ${allowanceError.message}`);

  const { error } = await getAdminClient().auth.admin.inviteUserByEmail(email, {
    redirectTo: `${getAppUrl()}/join`,
    data: {
      name: email.split('@')[0],
      workspaceName,
      workspaceInitial: workspaceName.trim().charAt(0).toUpperCase(),
      invitedByName: 'E2E Host',
    },
  });

  if (error) throw new Error(`Could not send the invite email to ${email}: ${error.message}`);
};
