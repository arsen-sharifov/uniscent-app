import type { IFolderRow, IThreadRow } from '@interfaces';

import { createClient } from '@/lib/supabase';

export const getNextPosition = async (workspaceId: string, parentFolderId?: string): Promise<number> => {
  const supabase = createClient();

  const readLastPosition = async (table: string, parentColumn: string): Promise<number> => {
    const workspaceRows = supabase.from(table).select('position').eq('workspace_id', workspaceId);
    const { data, error } = await (
      parentFolderId ? workspaceRows.eq(parentColumn, parentFolderId) : workspaceRows.is(parentColumn, null)
    )
      .order('position', { ascending: false })
      .limit(1)
      .maybeSingle<Pick<IFolderRow | IThreadRow, 'position'>>();

    if (error) throw error;

    return data?.position ?? -1;
  };

  const lastPositions = await Promise.all([
    readLastPosition('folders', 'parent_folder_id'),
    readLastPosition('threads', 'folder_id'),
  ]);

  return Math.max(...lastPositions) + 1;
};
