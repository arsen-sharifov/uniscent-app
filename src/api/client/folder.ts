import type { IFolder, IFolderRow } from '@interfaces';

import { createClient } from '@/lib/supabase';

import { FOLDER_SELECT } from './consts';
import { deleteRowsByIds, getNextPosition, toFolder } from './utils';

export const getFolders = async (workspaceId: string): Promise<IFolder[]> => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('folders')
    .select(FOLDER_SELECT)
    .eq('workspace_id', workspaceId)
    .order('position')
    .returns<IFolderRow[]>();

  if (error) throw error;

  return (data ?? []).map(toFolder);
};

export const createFolder = async (
  workspaceId: string,
  parentFolderId?: string,
  name?: string,
): Promise<IFolder | null> => {
  const position = await getNextPosition(workspaceId, parentFolderId);
  const supabase = createClient();

  const { data, error } = await supabase
    .from('folders')
    .insert({
      workspace_id: workspaceId,
      parent_folder_id: parentFolderId ?? null,
      position,
      ...(name && { name }),
    })
    .select(FOLDER_SELECT)
    .single<IFolderRow>();

  if (error) throw error;

  return data ? toFolder(data) : null;
};

export const updateFolderName = async (id: string, name: string): Promise<void> => {
  const supabase = createClient();
  const { error } = await supabase.from('folders').update({ name }).eq('id', id).select('id').single();

  if (error) throw error;
};

export const deleteFolder = async (id: string): Promise<void> => {
  const supabase = createClient();
  const { error } = await supabase.from('folders').delete().eq('id', id);

  if (error) throw error;
};

export const deleteFolders = async (ids: string[]): Promise<void> => {
  const supabase = createClient();

  return deleteRowsByIds(ids, (chunk) => supabase.from('folders').delete().in('id', chunk));
};

export const moveFolder = async (id: string, parentFolderId: string | null, position: number): Promise<void> => {
  const supabase = createClient();
  const { error } = await supabase
    .from('folders')
    .update({ parent_folder_id: parentFolderId, position })
    .eq('id', id)
    .select('id')
    .single();

  if (error) throw error;
};
