import { describe, expect, test, vi } from 'vitest';

import { ECanvasNodeType } from '@interfaces';
import {
  ANSWERED_THREAD_SELECT,
  createThread,
  deleteThread,
  deleteThreads,
  getThreads,
  IDS_PER_REQUEST,
  moveThread,
  ROWS_PER_PAGE,
  updateThreadName,
} from '@api/client';
import { canvasEdgeRow, canvasNodeRow, threadRow } from '@mocks/rows';
import { NO_ROW_ERROR, primeSupabase } from '@mocks/supabase';

vi.mock('@/lib/supabase', () => import('@mocks/supabase'));

describe('getThreads', () => {
  describe('GIVEN two threads where only one holds an answer backed by valid claims', () => {
    describe('WHEN the threads are fetched', () => {
      test('THEN only that thread is resolved and only its canvas is loaded', async () => {
        const { queries } = primeSupabase([
          { data: [threadRow(), threadRow({ id: 'th-2', name: 'Second', position: 1 })] },
          { data: [{ thread_id: 'th-2' }, { thread_id: 'th-2' }] },
          {
            data: [
              canvasNodeRow({ id: 'q', thread_id: 'th-2', type: ECanvasNodeType.Question }),
              canvasNodeRow({ id: 'p', thread_id: 'th-2', status: 'valid' }),
              canvasNodeRow({ id: 'a', thread_id: 'th-2', is_answer: true }),
            ],
          },
          {
            data: [
              canvasEdgeRow({ id: 'q-p', thread_id: 'th-2', source_node_id: 'q', target_node_id: 'p' }),
              canvasEdgeRow({ id: 'p-a', thread_id: 'th-2', source_node_id: 'p', target_node_id: 'a' }),
            ],
          },
        ]);
        const nodesFilter = vi.spyOn(queries[2]!, 'in');
        const edgesFilter = vi.spyOn(queries[3]!, 'in');

        await expect(getThreads('ws-1')).resolves.toEqual([
          expect.objectContaining({ id: 'th-1', resolved: false }),
          expect.objectContaining({ id: 'th-2', name: 'Second', resolved: true }),
        ]);
        expect(nodesFilter).toHaveBeenCalledExactlyOnceWith('thread_id', ['th-2']);
        expect(edgesFilter).toHaveBeenCalledExactlyOnceWith('thread_id', ['th-2']);
      });
    });
  });

  describe('GIVEN several answered threads whose canvas rows arrive interleaved', () => {
    describe('WHEN the threads are fetched', () => {
      test('THEN one node read and one edge read serve every thread and each thread is judged on its own canvas', async () => {
        const { client } = primeSupabase([
          { data: [threadRow(), threadRow({ id: 'th-2' }), threadRow({ id: 'th-3' }), threadRow({ id: 'th-4' })] },
          { data: [{ thread_id: 'th-1' }, { thread_id: 'th-2' }, { thread_id: 'th-3' }, { thread_id: 'th-1' }] },
          {
            data: [
              canvasNodeRow({ id: 'q1', thread_id: 'th-1', type: ECanvasNodeType.Question }),
              canvasNodeRow({ id: 'q2', thread_id: 'th-2', type: ECanvasNodeType.Question }),
              canvasNodeRow({ id: 'q3', thread_id: 'th-3', type: ECanvasNodeType.Question }),
              canvasNodeRow({ id: 'p1', thread_id: 'th-1', status: 'valid' }),
              canvasNodeRow({ id: 'a2', thread_id: 'th-2', status: 'invalid', is_answer: true }),
              canvasNodeRow({ id: 'x3', thread_id: 'th-3', status: 'invalid' }),
              canvasNodeRow({ id: 'a1', thread_id: 'th-1', is_answer: true }),
              canvasNodeRow({ id: 'a3', thread_id: 'th-3', is_answer: true }),
            ],
          },
          {
            data: [
              canvasEdgeRow({ id: 'x3-a3', thread_id: 'th-3', source_node_id: 'x3', target_node_id: 'a3' }),
              canvasEdgeRow({ id: 'q1-p1', thread_id: 'th-1', source_node_id: 'q1', target_node_id: 'p1' }),
              canvasEdgeRow({ id: 'q2-a2', thread_id: 'th-2', source_node_id: 'q2', target_node_id: 'a2' }),
              canvasEdgeRow({ id: 'p1-a1', thread_id: 'th-1', source_node_id: 'p1', target_node_id: 'a1' }),
              canvasEdgeRow({ id: 'q3-x3', thread_id: 'th-3', source_node_id: 'q3', target_node_id: 'x3' }),
            ],
          },
        ]);

        await expect(getThreads('ws-1')).resolves.toEqual([
          expect.objectContaining({ id: 'th-1', resolved: true }),
          expect.objectContaining({ id: 'th-2', resolved: false }),
          expect.objectContaining({ id: 'th-3', resolved: false }),
          expect.objectContaining({ id: 'th-4', resolved: false }),
        ]);
        expect(client.from).toHaveBeenCalledTimes(4);
      });
    });
  });

  describe('GIVEN a workspace whose answer lookup must not carry its thread ids', () => {
    describe('WHEN the threads are fetched', () => {
      test('THEN the answered threads are read through the workspace join without an id list', async () => {
        const { queries } = primeSupabase([{ data: [threadRow(), threadRow({ id: 'th-2' })] }, { data: [] }]);
        const select = vi.spyOn(queries[1]!, 'select');
        const equals = vi.spyOn(queries[1]!, 'eq');
        const idFilter = vi.spyOn(queries[1]!, 'in');

        await getThreads('ws-1');

        expect(select).toHaveBeenCalledExactlyOnceWith(ANSWERED_THREAD_SELECT);
        expect(equals.mock.calls).toEqual([
          ['is_answer', true],
          ['threads.workspace_id', 'ws-1'],
        ]);
        expect(idFilter).not.toHaveBeenCalled();
      });
    });
  });

  describe('GIVEN more answered threads than one request may carry ids for', () => {
    describe('WHEN the threads are fetched', () => {
      test('THEN the canvas reads split into bounded requests and every thread is still judged on its own canvas', async () => {
        const threadIds = Array.from({ length: IDS_PER_REQUEST + 1 }, (_, index) => `th-${index}`);
        const lastId = `th-${IDS_PER_REQUEST}`;
        const { client, queries } = primeSupabase([
          { data: threadIds.map((id) => threadRow({ id })) },
          { data: threadIds.map((id) => ({ thread_id: id })) },
          {
            data: threadIds.slice(0, IDS_PER_REQUEST).map((id, index) =>
              canvasNodeRow({
                id: `a-${id}`,
                thread_id: id,
                is_answer: true,
                status: index === 0 ? 'invalid' : null,
              }),
            ),
          },
          { data: [canvasNodeRow({ id: `a-${lastId}`, thread_id: lastId, is_answer: true })] },
          { data: [] },
          { data: [] },
        ]);
        const nodeFilters = [vi.spyOn(queries[2]!, 'in'), vi.spyOn(queries[3]!, 'in')];
        const edgeFilters = [vi.spyOn(queries[4]!, 'in'), vi.spyOn(queries[5]!, 'in')];
        const chunkCalls = [[['thread_id', threadIds.slice(0, IDS_PER_REQUEST)]], [['thread_id', [lastId]]]];

        const threads = await getThreads('ws-1');

        expect(threads.filter((thread) => !thread.resolved).map((thread) => thread.id)).toEqual(['th-0']);
        expect(client.from).toHaveBeenCalledTimes(6);
        expect(nodeFilters.map((filter) => filter.mock.calls)).toEqual(chunkCalls);
        expect(edgeFilters.map((filter) => filter.mock.calls)).toEqual(chunkCalls);
      });
    });
  });

  describe('GIVEN an answered thread whose canvas spans more than one page', () => {
    describe('WHEN the threads are fetched', () => {
      test('THEN the answer on the second page still resolves the thread', async () => {
        const firstPage = [
          canvasNodeRow({ id: 'q', type: ECanvasNodeType.Question }),
          ...Array.from({ length: ROWS_PER_PAGE - 1 }, (_, index) => canvasNodeRow({ id: `n-${index}` })),
        ];

        primeSupabase([
          { data: [threadRow()] },
          { data: [{ thread_id: 'th-1' }] },
          { data: firstPage },
          { data: [canvasEdgeRow({ id: 'q-a', source_node_id: 'q', target_node_id: 'a' })] },
          { data: [canvasNodeRow({ id: 'a', is_answer: true })] },
        ]);

        await expect(getThreads('ws-1')).resolves.toEqual([expect.objectContaining({ id: 'th-1', resolved: true })]);
      });
    });
  });

  describe('GIVEN an answered thread whose answer was refuted', () => {
    describe('WHEN the threads are fetched', () => {
      test('THEN the thread is not resolved', async () => {
        primeSupabase([
          { data: [threadRow()] },
          { data: [{ thread_id: 'th-1' }] },
          {
            data: [
              canvasNodeRow({ id: 'q', type: ECanvasNodeType.Question }),
              canvasNodeRow({ id: 'a', status: 'invalid', is_answer: true }),
            ],
          },
          { data: [canvasEdgeRow({ id: 'q-a', source_node_id: 'q', target_node_id: 'a' })] },
        ]);

        await expect(getThreads('ws-1')).resolves.toEqual([expect.objectContaining({ id: 'th-1', resolved: false })]);
      });
    });
  });

  describe('GIVEN an answered thread whose answer rests on a refuted claim', () => {
    describe('WHEN the threads are fetched', () => {
      test('THEN the affected answer leaves the thread unresolved', async () => {
        primeSupabase([
          { data: [threadRow()] },
          { data: [{ thread_id: 'th-1' }] },
          {
            data: [
              canvasNodeRow({ id: 'q', type: ECanvasNodeType.Question }),
              canvasNodeRow({ id: 'p', status: 'invalid' }),
              canvasNodeRow({ id: 'a', is_answer: true }),
            ],
          },
          {
            data: [
              canvasEdgeRow({ id: 'q-p', source_node_id: 'q', target_node_id: 'p' }),
              canvasEdgeRow({ id: 'p-a', source_node_id: 'p', target_node_id: 'a' }),
            ],
          },
        ]);

        await expect(getThreads('ws-1')).resolves.toEqual([expect.objectContaining({ id: 'th-1', resolved: false })]);
      });
    });
  });

  describe('GIVEN threads without any answer node', () => {
    describe('WHEN the threads are fetched', () => {
      test('THEN no thread is resolved and no canvas is loaded', async () => {
        const { client } = primeSupabase([{ data: [threadRow(), threadRow({ id: 'th-2' })] }, { data: [] }]);

        await expect(getThreads('ws-1')).resolves.toEqual([
          expect.objectContaining({ id: 'th-1', resolved: false }),
          expect.objectContaining({ id: 'th-2', resolved: false }),
        ]);
        expect(client.from).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('GIVEN a workspace without threads', () => {
    describe('WHEN the threads are fetched', () => {
      test('THEN the answer lookup is skipped', async () => {
        const { client } = primeSupabase([{ data: [] }]);

        await expect(getThreads('ws-1')).resolves.toEqual([]);
        expect(client.from).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('GIVEN a failing threads query', () => {
    describe('WHEN the threads are fetched', () => {
      test('THEN the error propagates', async () => {
        primeSupabase([{ error: new Error('db down') }]);

        await expect(getThreads('ws-1')).rejects.toThrow('db down');
      });
    });
  });

  describe('GIVEN a failing answer lookup', () => {
    describe('WHEN the threads are fetched', () => {
      test('THEN the error propagates', async () => {
        primeSupabase([{ data: [threadRow()] }, { error: new Error('answers down') }]);

        await expect(getThreads('ws-1')).rejects.toThrow('answers down');
      });
    });
  });

  describe('GIVEN a failing canvas node lookup for an answered thread', () => {
    describe('WHEN the threads are fetched', () => {
      test('THEN the error propagates', async () => {
        primeSupabase([
          { data: [threadRow()] },
          { data: [{ thread_id: 'th-1' }] },
          { error: new Error('nodes down') },
          { data: [] },
        ]);

        await expect(getThreads('ws-1')).rejects.toThrow('nodes down');
      });
    });
  });

  describe('GIVEN a failing canvas edge lookup for an answered thread', () => {
    describe('WHEN the threads are fetched', () => {
      test('THEN the error propagates', async () => {
        primeSupabase([
          { data: [threadRow()] },
          { data: [{ thread_id: 'th-1' }] },
          { data: [canvasNodeRow({ is_answer: true })] },
          { error: new Error('edges down') },
        ]);

        await expect(getThreads('ws-1')).rejects.toThrow('edges down');
      });
    });
  });
});

describe('createThread', () => {
  describe('GIVEN a root thread in a workspace whose root holds folders and threads', () => {
    describe('WHEN the thread is created', () => {
      test('THEN the thread follows the last root item of either kind and a question node is seeded for it', async () => {
        const { queries } = primeSupabase([
          { data: { position: 1 } },
          { data: { position: 2 } },
          { data: threadRow() },
          { data: null },
        ]);
        const is = vi.spyOn(queries[1]!, 'is');

        await expect(createThread('ws-1')).resolves.toEqual({
          id: 'th-1',
          workspaceId: 'ws-1',
          folderId: null,
          name: 'Thread',
          position: 0,
          resolved: false,
        });
        expect(is).toHaveBeenCalledExactlyOnceWith('folder_id', null);
        expect(queries[2]!.insert).toHaveBeenCalledExactlyOnceWith({
          workspace_id: 'ws-1',
          folder_id: null,
          position: 3,
        });
        expect(queries[3]!.insert).toHaveBeenCalledExactlyOnceWith(
          expect.objectContaining({
            thread_id: 'th-1',
            type: ECanvasNodeType.Question,
            position_x: 0,
            position_y: 0,
            label: '',
          }),
        );
      });
    });
  });

  describe('GIVEN a nested thread under a folder', () => {
    describe('WHEN the thread is created', () => {
      test('THEN the thread takes the position after the last item of the folder', async () => {
        const { queries } = primeSupabase([
          { data: null },
          { data: { position: 4 } },
          { data: threadRow({ folder_id: 'folder-1' }) },
          { data: null },
        ]);
        const eq = vi.spyOn(queries[1]!, 'eq');

        await createThread('ws-1', 'folder-1');

        expect(eq).toHaveBeenCalledWith('folder_id', 'folder-1');
        expect(queries[2]!.insert).toHaveBeenCalledExactlyOnceWith({
          workspace_id: 'ws-1',
          folder_id: 'folder-1',
          position: 5,
        });
      });
    });
  });

  describe('GIVEN a name chosen up front', () => {
    describe('WHEN the thread is created', () => {
      test('THEN the name is written with the row instead of the default', async () => {
        const { queries } = primeSupabase([
          { data: null },
          { data: null },
          { data: threadRow({ name: 'Example' }) },
          { data: null },
        ]);

        await expect(createThread('ws-1', undefined, 'Example')).resolves.toMatchObject({ name: 'Example' });
        expect(queries[2]!.insert).toHaveBeenCalledExactlyOnceWith({
          workspace_id: 'ws-1',
          folder_id: null,
          position: 0,
          name: 'Example',
        });
      });
    });
  });

  describe('GIVEN a question node insert that fails', () => {
    describe('WHEN the thread is created', () => {
      test('THEN the failure is swallowed and the thread is still returned', async () => {
        const { client } = primeSupabase([
          { data: null },
          { data: { position: 1 } },
          { data: threadRow() },
          { error: new Error('node down') },
        ]);

        await expect(createThread('ws-1')).resolves.toEqual({
          id: 'th-1',
          workspaceId: 'ws-1',
          folderId: null,
          name: 'Thread',
          position: 0,
          resolved: false,
        });
        expect(client.from).toHaveBeenCalledTimes(4);
      });
    });
  });

  describe('GIVEN a failing position read', () => {
    describe('WHEN the thread is created', () => {
      test('THEN the error propagates', async () => {
        primeSupabase([{ error: new Error('db down') }]);

        await expect(createThread('ws-1')).rejects.toThrow('db down');
      });
    });
  });

  describe('GIVEN a failing insert', () => {
    describe('WHEN the thread is created', () => {
      test('THEN the error propagates', async () => {
        primeSupabase([{ data: null }, { data: null }, { error: new Error('db down') }]);

        await expect(createThread('ws-1')).rejects.toThrow('db down');
      });
    });
  });

  describe('GIVEN an insert that returns no row', () => {
    describe('WHEN the thread is created', () => {
      test('THEN nothing is returned and no question node is seeded', async () => {
        const { client } = primeSupabase([{ data: null }, { data: null }, { data: null }]);

        await expect(createThread('ws-1')).resolves.toBeNull();
        expect(client.from).toHaveBeenCalledTimes(3);
      });
    });
  });
});

describe('updateThreadName', () => {
  describe('GIVEN an existing thread', () => {
    describe('WHEN the name is updated', () => {
      test('THEN the update targets the thread id with the new name', async () => {
        const { queries } = primeSupabase([{ data: null }]);
        const eq = vi.spyOn(queries[0]!, 'eq');

        await updateThreadName('th-1', 'Renamed');

        expect(queries[0]!.update).toHaveBeenCalledExactlyOnceWith({ name: 'Renamed' });
        expect(eq).toHaveBeenCalledExactlyOnceWith('id', 'th-1');
      });
    });
  });

  describe('GIVEN a failing update', () => {
    describe('WHEN the name is updated', () => {
      test('THEN the error propagates', async () => {
        primeSupabase([{ error: new Error('db down') }]);

        await expect(updateThreadName('th-1', 'Renamed')).rejects.toThrow('db down');
      });
    });
  });

  describe('GIVEN a rename the database applies to no row', () => {
    describe('WHEN the name is updated', () => {
      test('THEN the missing row is reported instead of a silent success', async () => {
        const { queries } = primeSupabase([{ data: [] }]);
        vi.spyOn(queries[0]!, 'single').mockResolvedValue({ data: null, error: NO_ROW_ERROR, count: null });

        await expect(updateThreadName('th-1', 'Renamed')).rejects.toMatchObject({ code: 'PGRST116' });
      });
    });
  });
});

describe('deleteThread', () => {
  describe('GIVEN an existing thread', () => {
    describe('WHEN the thread is deleted', () => {
      test('THEN the delete targets the thread id', async () => {
        const { queries } = primeSupabase([{ data: null }]);
        const eq = vi.spyOn(queries[0]!, 'eq');

        await deleteThread('th-1');

        expect(queries[0]!.delete).toHaveBeenCalledTimes(1);
        expect(eq).toHaveBeenCalledExactlyOnceWith('id', 'th-1');
      });
    });
  });

  describe('GIVEN a failing delete', () => {
    describe('WHEN the thread is deleted', () => {
      test('THEN the error propagates', async () => {
        primeSupabase([{ error: new Error('db down') }]);

        await expect(deleteThread('th-1')).rejects.toThrow('db down');
      });
    });
  });
});

describe('deleteThreads', () => {
  describe('GIVEN a set of thread ids', () => {
    describe('WHEN the threads are deleted', () => {
      test('THEN the delete targets the id set', async () => {
        const { queries } = primeSupabase([{ data: null }]);
        const inFilter = vi.spyOn(queries[0]!, 'in');

        await deleteThreads(['th-1', 'th-2']);

        expect(queries[0]!.delete).toHaveBeenCalledTimes(1);
        expect(inFilter).toHaveBeenCalledExactlyOnceWith('id', ['th-1', 'th-2']);
      });
    });
  });

  describe('GIVEN more thread ids than one request may carry', () => {
    describe('WHEN the threads are deleted', () => {
      test('THEN the ids are split into bounded delete requests', async () => {
        const threadIds = Array.from({ length: IDS_PER_REQUEST + 1 }, (_, index) => `th-${index}`);
        const { queries } = primeSupabase([{ data: null }, { data: null }]);
        const filters = [vi.spyOn(queries[0]!, 'in'), vi.spyOn(queries[1]!, 'in')];

        await deleteThreads(threadIds);

        expect(filters.map((filter) => filter.mock.calls)).toEqual([
          [['id', threadIds.slice(0, IDS_PER_REQUEST)]],
          [['id', [`th-${IDS_PER_REQUEST}`]]],
        ]);
      });
    });
  });

  describe('GIVEN a failing delete', () => {
    describe('WHEN the threads are deleted', () => {
      test('THEN the error propagates', async () => {
        primeSupabase([{ error: new Error('db down') }]);

        await expect(deleteThreads(['th-1', 'th-2'])).rejects.toThrow('db down');
      });
    });
  });
});

describe('moveThread', () => {
  describe('GIVEN a thread to relocate', () => {
    describe('WHEN the thread is moved', () => {
      test('THEN the update carries the new folder and position for the thread id', async () => {
        const { queries } = primeSupabase([{ data: null }]);
        const eq = vi.spyOn(queries[0]!, 'eq');

        await moveThread('th-1', 'folder-1', 5);

        expect(queries[0]!.update).toHaveBeenCalledExactlyOnceWith({ folder_id: 'folder-1', position: 5 });
        expect(eq).toHaveBeenCalledExactlyOnceWith('id', 'th-1');
      });
    });
  });

  describe('GIVEN a failing update', () => {
    describe('WHEN the thread is moved', () => {
      test('THEN the error propagates', async () => {
        primeSupabase([{ error: new Error('db down') }]);

        await expect(moveThread('th-1', 'folder-1', 5)).rejects.toThrow('db down');
      });
    });
  });

  describe('GIVEN a move the database applies to no row', () => {
    describe('WHEN the thread is moved', () => {
      test('THEN the missing row is reported instead of a silent success', async () => {
        const { queries } = primeSupabase([{ data: [] }]);
        vi.spyOn(queries[0]!, 'single').mockResolvedValue({ data: null, error: NO_ROW_ERROR, count: null });

        await expect(moveThread('th-1', null, 2)).rejects.toMatchObject({ code: 'PGRST116' });
      });
    });
  });
});
