import type { ICanvasEdgeRow, ICreateCanvasEdgeInput } from '@interfaces';

import { createClient } from '@/lib/supabase';

import { CANVAS_EDGE_SELECT } from './consts';
import { readRowsByIds } from './utils';

export const createCanvasEdge = async (input: ICreateCanvasEdgeInput): Promise<void> => {
  const supabase = createClient();

  const { error } = await supabase.from('canvas_edges').insert({
    id: input.id,
    thread_id: input.threadId,
    source_node_id: input.sourceNodeId,
    target_node_id: input.targetNodeId,
    source_handle: input.sourceHandle,
    target_handle: input.targetHandle,
  });

  if (error) throw error;
};

export const deleteCanvasEdge = async (id: string): Promise<void> => {
  const supabase = createClient();

  const { error } = await supabase.from('canvas_edges').delete().eq('id', id);

  if (error) throw error;
};

export const getCanvasEdges = async (threadIds: string[]): Promise<ICanvasEdgeRow[]> => {
  const supabase = createClient();

  return readRowsByIds(threadIds, (chunk, from, to) =>
    supabase
      .from('canvas_edges')
      .select(CANVAS_EDGE_SELECT)
      .in('thread_id', chunk)
      .order('created_at')
      .order('id')
      .range(from, to)
      .returns<ICanvasEdgeRow[]>(),
  );
};
