import { describe, expect, test, vi } from 'vitest';

import { createCanvasEdge, deleteCanvasEdge, getCanvasEdges, ROWS_PER_PAGE } from '@api/client';
import { canvasEdgeRow } from '@mocks/rows';
import { primeSupabase } from '@mocks/supabase';

vi.mock('@/lib/supabase', () => import('@mocks/supabase'));

describe('createCanvasEdge', () => {
  describe('GIVEN a new edge input', () => {
    describe('WHEN the edge is created', () => {
      test('THEN the payload maps to snake case columns', async () => {
        const { queries } = primeSupabase([{ data: null }]);

        await createCanvasEdge({
          id: 'e1',
          threadId: 'th-1',
          sourceNodeId: 'n1',
          targetNodeId: 'n2',
          sourceHandle: 'right',
          targetHandle: 'left',
        });

        expect(queries[0]!.insert).toHaveBeenCalledExactlyOnceWith({
          id: 'e1',
          thread_id: 'th-1',
          source_node_id: 'n1',
          target_node_id: 'n2',
          source_handle: 'right',
          target_handle: 'left',
        });
      });
    });
  });

  describe('GIVEN a failing insert', () => {
    describe('WHEN the edge is created', () => {
      test('THEN the error propagates', async () => {
        primeSupabase([{ error: new Error('db down') }]);

        await expect(
          createCanvasEdge({
            id: 'e1',
            threadId: 'th-1',
            sourceNodeId: 'n1',
            targetNodeId: 'n2',
            sourceHandle: 'right',
            targetHandle: 'left',
          }),
        ).rejects.toThrow('db down');
      });
    });
  });
});

describe('deleteCanvasEdge', () => {
  describe('GIVEN an existing edge', () => {
    describe('WHEN the edge is deleted', () => {
      test('THEN the delete targets the edge id', async () => {
        const { queries } = primeSupabase([{ data: null }]);
        const eq = vi.spyOn(queries[0]!, 'eq');

        await deleteCanvasEdge('e1');

        expect(queries[0]!.delete).toHaveBeenCalledTimes(1);
        expect(eq).toHaveBeenCalledExactlyOnceWith('id', 'e1');
      });
    });
  });

  describe('GIVEN a failing delete', () => {
    describe('WHEN the edge is deleted', () => {
      test('THEN the error propagates', async () => {
        primeSupabase([{ error: new Error('db down') }]);

        await expect(deleteCanvasEdge('e1')).rejects.toThrow('db down');
      });
    });
  });
});

describe('getCanvasEdges', () => {
  describe('GIVEN stored edges for two threads', () => {
    describe('WHEN the edges of both threads are fetched', () => {
      test('THEN one query in a stable order reads both threads and returns the rows as is', async () => {
        const rows = [canvasEdgeRow(), canvasEdgeRow({ id: 'e2', thread_id: 'th-2' })];
        const { client, queries } = primeSupabase([{ data: rows }]);
        const threadFilter = vi.spyOn(queries[0]!, 'in');
        const order = vi.spyOn(queries[0]!, 'order');

        await expect(getCanvasEdges(['th-1', 'th-2'])).resolves.toEqual(rows);
        expect(client.from).toHaveBeenCalledExactlyOnceWith('canvas_edges');
        expect(threadFilter).toHaveBeenCalledExactlyOnceWith('thread_id', ['th-1', 'th-2']);
        expect(order.mock.calls).toEqual([['created_at'], ['id']]);
      });
    });
  });

  describe('GIVEN a canvas with more edges than one page', () => {
    describe('WHEN the edges are fetched', () => {
      test('THEN the next page is read as well', async () => {
        const firstPage = Array.from({ length: ROWS_PER_PAGE }, (_, index) => canvasEdgeRow({ id: `e-${index}` }));
        const { queries } = primeSupabase([{ data: firstPage }, { data: [canvasEdgeRow({ id: 'e-last' })] }]);
        const secondRange = vi.spyOn(queries[1]!, 'range');

        await expect(getCanvasEdges(['th-1'])).resolves.toHaveLength(ROWS_PER_PAGE + 1);
        expect(secondRange).toHaveBeenCalledExactlyOnceWith(ROWS_PER_PAGE, 2 * ROWS_PER_PAGE - 1);
      });
    });
  });

  describe('GIVEN no thread ids', () => {
    describe('WHEN the edges are fetched', () => {
      test('THEN the query is skipped', async () => {
        const { client } = primeSupabase([]);

        await expect(getCanvasEdges([])).resolves.toEqual([]);
        expect(client.from).not.toHaveBeenCalled();
      });
    });
  });

  describe('GIVEN no stored edges', () => {
    describe('WHEN the edges are fetched', () => {
      test('THEN an empty list is returned', async () => {
        primeSupabase([{ data: [] }]);

        await expect(getCanvasEdges(['th-1'])).resolves.toEqual([]);
      });
    });
  });

  describe('GIVEN a failing query', () => {
    describe('WHEN the edges are fetched', () => {
      test('THEN the error propagates', async () => {
        primeSupabase([{ error: new Error('db down') }]);

        await expect(getCanvasEdges(['th-1'])).rejects.toThrow('db down');
      });
    });
  });
});
