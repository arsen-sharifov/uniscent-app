import type { ICreateNodeCommentInput, INodeCommentRow } from '@interfaces';

import { createClient } from '@/lib/supabase';

import { NODE_COMMENT_SELECT } from './consts';
import { getCurrentUserId, readRowsByIds } from './utils';

export const createNodeComment = async (input: ICreateNodeCommentInput): Promise<void> => {
  const authorId = await getCurrentUserId();
  const supabase = createClient();

  const { error } = await supabase.from('node_comments').insert({
    id: input.id,
    node_id: input.nodeId,
    author_id: authorId,
    text: input.text,
  });

  if (error) throw error;
};

export const deleteNodeComment = async (id: string): Promise<void> => {
  const supabase = createClient();

  const { error } = await supabase.from('node_comments').delete().eq('id', id);

  if (error) throw error;
};

export const getNodeComments = async (nodeIds: string[]): Promise<INodeCommentRow[]> => {
  const supabase = createClient();

  return readRowsByIds(nodeIds, (chunk, from, to) =>
    supabase
      .from('node_comments')
      .select(NODE_COMMENT_SELECT)
      .in('node_id', chunk)
      .order('created_at')
      .order('id')
      .range(from, to)
      .returns<INodeCommentRow[]>(),
  );
};
