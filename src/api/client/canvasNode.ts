import type { ICanvasNodeRow, ICreateCanvasNodeInput, INodePositionUpdate, TNodeStatus } from '@interfaces';

import { createClient } from '@/lib/supabase';

import { CANVAS_NODE_SELECT } from './consts';
import { readRowsByIds } from './utils';

export const createCanvasNode = async (input: ICreateCanvasNodeInput): Promise<void> => {
  const supabase = createClient();

  const { error } = await supabase.from('canvas_nodes').insert({
    id: input.id,
    thread_id: input.threadId,
    type: input.type,
    position_x: input.x,
    position_y: input.y,
    label: input.label,
    source_node_id: input.sourceNodeId,
  });

  if (error) throw error;
};

export const updateCanvasNodePositions = async (updates: INodePositionUpdate[]): Promise<void> => {
  if (updates.length === 0) return;

  const supabase = createClient();

  const payload = updates.map((update) => ({
    id: update.id,
    position_x: Number.isFinite(update.x) ? update.x : 0,
    position_y: Number.isFinite(update.y) ? update.y : 0,
  }));

  const { data, error } = await supabase.rpc('update_canvas_node_positions', {
    updates: payload,
  });

  if (error) throw error;

  if (typeof data === 'number' && data !== updates.length) {
    throw new Error(`update_canvas_node_positions: expected ${updates.length} rows, updated ${data}`);
  }
};

export const updateCanvasNodeLabel = async (id: string, label: string): Promise<void> => {
  const supabase = createClient();

  const { error } = await supabase.from('canvas_nodes').update({ label }).eq('id', id).select('id').single();

  if (error) throw error;
};

export const updateCanvasNodeStatus = async (id: string, status: TNodeStatus): Promise<void> => {
  const supabase = createClient();

  const { error } = await supabase.rpc('set_canvas_node_status', { p_node_id: id, p_status: status });

  if (error) throw error;
};

export const updateCanvasNodeAnswer = async (id: string, isAnswer: boolean): Promise<void> => {
  const supabase = createClient();

  const { error } = await supabase.rpc('set_canvas_node_answer', { p_node_id: id, p_is_answer: isAnswer });

  if (error) throw error;
};

export const deleteCanvasNode = async (id: string): Promise<void> => {
  const supabase = createClient();

  const { error } = await supabase.from('canvas_nodes').delete().eq('id', id);

  if (error) throw error;
};

export const getCanvasNodes = async (threadIds: string[]): Promise<ICanvasNodeRow[]> => {
  const supabase = createClient();

  return readRowsByIds(threadIds, (chunk, from, to) =>
    supabase
      .from('canvas_nodes')
      .select(CANVAS_NODE_SELECT)
      .in('thread_id', chunk)
      .order('created_at')
      .order('id')
      .range(from, to)
      .returns<ICanvasNodeRow[]>(),
  );
};
