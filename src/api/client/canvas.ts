import {
  ECanvasNodeType,
  type ICanvasNodeWithThreadRow,
  type ICanvasSnapshot,
  type INodeReference,
  type IReferenceTargetMeta,
} from '@interfaces';

import { createClient } from '@/lib/supabase';
import { groupBy } from '@/lib/utils';

import { getCanvasEdges } from './canvasEdge';
import { getCanvasNodes } from './canvasNode';
import { REFERENCE_SEARCH_LIMIT, REFERENCE_TARGET_COUNT_SELECT, REFERENCE_TARGET_SELECT } from './consts';
import { getNodeComments } from './nodeComment';
import { readRowsByIds, rowToEdge, rowToNode, toNodeReference, toReferenceTargetMeta } from './utils';

const getReferenceTargetsByIds = async (nodeIds: string[]): Promise<Record<string, IReferenceTargetMeta>> => {
  const supabase = createClient();

  const rows = await readRowsByIds(nodeIds, (chunk, from, to) =>
    supabase
      .from('canvas_nodes')
      .select(REFERENCE_TARGET_SELECT)
      .in('id', chunk)
      .order('id')
      .range(from, to)
      .returns<ICanvasNodeWithThreadRow[]>(),
  );

  return Object.fromEntries(rows.map((row) => [row.id, toReferenceTargetMeta(row)]));
};

const assertWorkspaceThread = async (workspaceId: string, threadId: string): Promise<void> => {
  const supabase = createClient();

  const { error } = await supabase
    .from('threads')
    .select('id')
    .eq('id', threadId)
    .eq('workspace_id', workspaceId)
    .single();

  if (error) throw error;
};

export const getCanvasContent = async (workspaceId: string, threadId: string): Promise<ICanvasSnapshot> => {
  const [, nodeRows, edgeRows] = await Promise.all([
    assertWorkspaceThread(workspaceId, threadId),
    getCanvasNodes([threadId]),
    getCanvasEdges([threadId]),
  ]);

  const nodeIds = nodeRows.map((node) => node.id);
  const referenceTargetIds = nodeRows.flatMap((node) =>
    node.type === ECanvasNodeType.Reference && node.source_node_id ? [node.source_node_id] : [],
  );

  const [commentRows, referenceTargets] = await Promise.all([
    getNodeComments(nodeIds),
    getReferenceTargetsByIds(referenceTargetIds),
  ]);

  const commentsByNode = groupBy(commentRows, (comment) => comment.node_id);

  return {
    nodes: nodeRows.map((row) =>
      rowToNode(
        row,
        commentsByNode.get(row.id) ?? [],
        row.source_node_id ? referenceTargets[row.source_node_id] : undefined,
      ),
    ),
    edges: edgeRows.map(rowToEdge),
  };
};

export const searchReferenceTargets = async (
  workspaceId: string,
  excludeThreadId?: string,
): Promise<INodeReference[]> => {
  const supabase = createClient();

  let query = supabase
    .from('canvas_nodes')
    .select(REFERENCE_TARGET_SELECT)
    .eq('type', ECanvasNodeType.Canvas)
    .eq('threads.workspace_id', workspaceId)
    .order('created_at')
    .limit(REFERENCE_SEARCH_LIMIT);

  if (excludeThreadId) {
    query = query.neq('thread_id', excludeThreadId);
  }

  const { data, error } = await query.returns<ICanvasNodeWithThreadRow[]>();

  if (error) throw error;

  return (data ?? []).map(toNodeReference);
};

export const countReferenceTargets = async (workspaceId: string, excludeThreadId?: string): Promise<number> => {
  const supabase = createClient();

  let query = supabase
    .from('canvas_nodes')
    .select(REFERENCE_TARGET_COUNT_SELECT, { count: 'exact', head: true })
    .eq('type', ECanvasNodeType.Canvas)
    .eq('threads.workspace_id', workspaceId);

  if (excludeThreadId) {
    query = query.neq('thread_id', excludeThreadId);
  }

  const { count, error } = await query;

  if (error) throw error;

  return count ?? 0;
};
