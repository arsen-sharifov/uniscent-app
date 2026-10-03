import { ECanvasNodeType, type ICanvasNodeRow, type IThread, type IThreadRow } from '@interfaces';

import { isThreadResolved } from '@/lib/canvas/utils';
import { event } from '@/lib/events';
import { createClient } from '@/lib/supabase';
import { groupBy } from '@/lib/utils';

import { getCanvasEdges } from './canvasEdge';
import { createCanvasNode, getCanvasNodes } from './canvasNode';
import { ANSWERED_THREAD_SELECT, THREAD_SELECT } from './consts';
import { deleteRowsByIds, getNextPosition, readAllRows, rowToEdge, rowToNode, toThread } from './utils';

const getAnsweredThreadIds = async (workspaceId: string): Promise<string[]> => {
  const supabase = createClient();
  const rows = await readAllRows((from, to) =>
    supabase
      .from('canvas_nodes')
      .select(ANSWERED_THREAD_SELECT)
      .eq('is_answer', true)
      .eq('threads.workspace_id', workspaceId)
      .order('id')
      .range(from, to)
      .returns<Pick<ICanvasNodeRow, 'thread_id'>[]>(),
  );

  return [...new Set(rows.map((row) => row.thread_id))];
};

const getResolvedThreadIds = async (workspaceId: string): Promise<Set<string>> => {
  const answeredIds = await getAnsweredThreadIds(workspaceId);
  const [nodeRows, edgeRows] = await Promise.all([getCanvasNodes(answeredIds), getCanvasEdges(answeredIds)]);
  const nodesByThread = groupBy(nodeRows, (row) => row.thread_id);
  const edgesByThread = groupBy(edgeRows, (row) => row.thread_id);

  return new Set(
    answeredIds.filter((threadId) =>
      isThreadResolved(
        (nodesByThread.get(threadId) ?? []).map((row) => rowToNode(row)),
        (edgesByThread.get(threadId) ?? []).map(rowToEdge),
      ),
    ),
  );
};

export const getThreads = async (workspaceId: string): Promise<IThread[]> => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('threads')
    .select(THREAD_SELECT)
    .eq('workspace_id', workspaceId)
    .order('position')
    .returns<IThreadRow[]>();

  if (error) throw error;

  const rows = data ?? [];

  if (rows.length === 0) return [];

  const resolved = await getResolvedThreadIds(workspaceId);

  return rows.map((row) => ({ ...toThread(row), resolved: resolved.has(row.id) }));
};

export const createThread = async (workspaceId: string, folderId?: string, name?: string): Promise<IThread | null> => {
  const position = await getNextPosition(workspaceId, folderId);
  const supabase = createClient();

  const { data, error } = await supabase
    .from('threads')
    .insert({
      workspace_id: workspaceId,
      folder_id: folderId ?? null,
      position,
      ...(name && { name }),
    })
    .select(THREAD_SELECT)
    .single<IThreadRow>();

  if (error) throw error;
  if (!data) return null;

  const thread = toThread(data);

  await createCanvasNode({
    id: crypto.randomUUID(),
    threadId: thread.id,
    type: ECanvasNodeType.Question,
    x: 0,
    y: 0,
    label: '',
    sourceNodeId: null,
  }).catch((error: unknown) => event.error(error, { toast: false, context: `thread.createQuestionNode ${thread.id}` }));

  return thread;
};

export const updateThreadName = async (id: string, name: string): Promise<void> => {
  const supabase = createClient();
  const { error } = await supabase.from('threads').update({ name }).eq('id', id).select('id').single();

  if (error) throw error;
};

export const deleteThread = async (id: string): Promise<void> => {
  const supabase = createClient();
  const { error } = await supabase.from('threads').delete().eq('id', id);

  if (error) throw error;
};

export const deleteThreads = async (ids: string[]): Promise<void> => {
  const supabase = createClient();

  return deleteRowsByIds(ids, (chunk) => supabase.from('threads').delete().in('id', chunk));
};

export const moveThread = async (id: string, folderId: string | null, position: number): Promise<void> => {
  const supabase = createClient();
  const { error } = await supabase
    .from('threads')
    .update({ folder_id: folderId, position })
    .eq('id', id)
    .select('id')
    .single();

  if (error) throw error;
};
