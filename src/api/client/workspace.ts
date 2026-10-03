import type {
  IMyWorkspaceRow,
  IWorkspace,
  IWorkspaceAccess,
  IWorkspaceAccessRow,
  IWorkspaceItem,
  IWorkspaceRow,
} from '@interfaces';

import { createClient } from '@/lib/supabase';

import { WORKSPACE_SELECT } from './consts';
import { deleteRowsByIds, getCurrentUserId, toMyWorkspace, toWorkspace, toWorkspaceAccess } from './utils';

export const getMyWorkspaces = async (): Promise<IWorkspaceItem[]> => {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('get_my_workspaces');

  if (error) throw error;

  return ((data ?? []) as IMyWorkspaceRow[]).map(toMyWorkspace);
};

export const getMyWorkspacePermissions = async (workspaceId: string): Promise<IWorkspaceAccess | null> => {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('get_my_workspace_permissions', { p_workspace_id: workspaceId });

  if (error) throw error;

  const [row] = (data ?? []) as IWorkspaceAccessRow[];

  return row ? toWorkspaceAccess(row) : null;
};

export const getMyOwnedSharedWorkspaces = async (): Promise<Pick<IWorkspace, 'id' | 'name'>[]> => {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('get_my_owned_shared_workspaces');

  if (error) throw error;

  return (data ?? []) as Pick<IWorkspace, 'id' | 'name'>[];
};

export const getWorkspace = async (id: string): Promise<IWorkspace | null> => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('workspaces')
    .select(WORKSPACE_SELECT)
    .eq('id', id)
    .maybeSingle<IWorkspaceRow>();

  if (error) throw error;

  return data ? toWorkspace(data) : null;
};

export const createWorkspace = async (name: string): Promise<IWorkspace | null> => {
  const ownerId = await getCurrentUserId();
  const supabase = createClient();

  const { data, error } = await supabase
    .from('workspaces')
    .insert({ name, owner_id: ownerId })
    .select(WORKSPACE_SELECT)
    .single<IWorkspaceRow>();

  if (error) throw error;

  return data ? toWorkspace(data) : null;
};

export const updateWorkspaceName = async (id: string, name: string): Promise<void> => {
  const supabase = createClient();
  const { error } = await supabase.from('workspaces').update({ name }).eq('id', id).select('id').single();

  if (error) throw error;
};

export const deleteWorkspace = async (id: string): Promise<void> => {
  const supabase = createClient();
  const { error } = await supabase.from('workspaces').delete().eq('id', id);

  if (error) throw error;
};

export const deleteWorkspaces = async (ids: string[]): Promise<void> => {
  const supabase = createClient();

  return deleteRowsByIds(ids, (chunk) => supabase.from('workspaces').delete().in('id', chunk));
};

export const moveWorkspace = async (id: string, position: number): Promise<void> => {
  const supabase = createClient();
  const { error } = await supabase
    .from('workspace_members')
    .update({ position })
    .eq('workspace_id', id)
    .select('workspace_id')
    .single();

  if (error) throw error;
};
