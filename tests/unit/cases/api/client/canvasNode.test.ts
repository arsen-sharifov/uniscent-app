import { describe, expect, test, vi } from 'vitest';

import { ECanvasNodeType } from '@interfaces';
import {
  createCanvasNode,
  deleteCanvasNode,
  getCanvasNodes,
  ROWS_PER_PAGE,
  updateCanvasNodeAnswer,
  updateCanvasNodeLabel,
  updateCanvasNodePositions,
  updateCanvasNodeStatus,
} from '@api/client';
import { canvasNodeRow } from '@mocks/rows';
import { NO_ROW_ERROR, primeSupabase } from '@mocks/supabase';

vi.mock('@/lib/supabase', () => import('@mocks/supabase'));

describe('createCanvasNode', () => {
  describe('GIVEN a new node input', () => {
    describe('WHEN the node is created', () => {
      test('THEN the payload maps to snake case columns', async () => {
        const { queries } = primeSupabase([{ data: null }]);

        await createCanvasNode({
          id: 'n1',
          threadId: 'th-1',
          type: ECanvasNodeType.Canvas,
          x: 10,
          y: 20,
          label: 'Node',
          sourceNodeId: null,
        });

        expect(queries[0]!.insert).toHaveBeenCalledExactlyOnceWith({
          id: 'n1',
          thread_id: 'th-1',
          type: ECanvasNodeType.Canvas,
          position_x: 10,
          position_y: 20,
          label: 'Node',
          source_node_id: null,
        });
      });
    });
  });

  describe('GIVEN a failing insert', () => {
    describe('WHEN the node is created', () => {
      test('THEN the error propagates', async () => {
        primeSupabase([{ error: new Error('db down') }]);

        await expect(
          createCanvasNode({
            id: 'n1',
            threadId: 'th-1',
            type: ECanvasNodeType.Canvas,
            x: 10,
            y: 20,
            label: 'Node',
            sourceNodeId: null,
          }),
        ).rejects.toThrow('db down');
      });
    });
  });
});

describe('updateCanvasNodePositions', () => {
  describe('GIVEN no position updates', () => {
    describe('WHEN the batch is sent', () => {
      test('THEN the rpc is skipped entirely', async () => {
        const { client } = primeSupabase([]);

        await updateCanvasNodePositions([]);

        expect(client.rpc).not.toHaveBeenCalled();
      });
    });
  });

  describe('GIVEN updates with a non-finite coordinate', () => {
    describe('WHEN the batch is sent', () => {
      test('THEN the payload clamps the bad coordinate to zero', async () => {
        const { client } = primeSupabase([]);
        vi.mocked(client.rpc).mockResolvedValue({ data: 2, error: null });

        await updateCanvasNodePositions([
          { id: 'n1', x: Number.NaN, y: 20 },
          { id: 'n2', x: 30, y: Number.POSITIVE_INFINITY },
        ]);

        expect(client.rpc).toHaveBeenCalledExactlyOnceWith('update_canvas_node_positions', {
          updates: [
            { id: 'n1', position_x: 0, position_y: 20 },
            { id: 'n2', position_x: 30, position_y: 0 },
          ],
        });
      });
    });
  });

  describe('GIVEN an rpc that updates fewer rows than requested', () => {
    describe('WHEN the batch is sent', () => {
      test('THEN the row count mismatch throws', async () => {
        const { client } = primeSupabase([]);
        vi.mocked(client.rpc).mockResolvedValue({ data: 1, error: null });

        await expect(
          updateCanvasNodePositions([
            { id: 'n1', x: 1, y: 1 },
            { id: 'n2', x: 2, y: 2 },
          ]),
        ).rejects.toThrow('update_canvas_node_positions: expected 2 rows, updated 1');
      });
    });
  });

  describe('GIVEN a failing rpc', () => {
    describe('WHEN the batch is sent', () => {
      test('THEN the error propagates', async () => {
        const { client } = primeSupabase([]);
        vi.mocked(client.rpc).mockResolvedValue({ data: null, error: new Error('rpc down') });

        await expect(updateCanvasNodePositions([{ id: 'n1', x: 1, y: 1 }])).rejects.toThrow('rpc down');
      });
    });
  });
});

describe('updateCanvasNodeLabel', () => {
  describe('GIVEN an existing node', () => {
    describe('WHEN the label is updated', () => {
      test('THEN the update targets the node id with the new label', async () => {
        const { queries } = primeSupabase([{ data: null }]);
        const eq = vi.spyOn(queries[0]!, 'eq');

        await updateCanvasNodeLabel('n1', 'Renamed');

        expect(queries[0]!.update).toHaveBeenCalledExactlyOnceWith({ label: 'Renamed' });
        expect(eq).toHaveBeenCalledExactlyOnceWith('id', 'n1');
      });
    });
  });

  describe('GIVEN a failing update', () => {
    describe('WHEN the label is updated', () => {
      test('THEN the error propagates', async () => {
        primeSupabase([{ error: new Error('db down') }]);

        await expect(updateCanvasNodeLabel('n1', 'Renamed')).rejects.toThrow('db down');
      });
    });
  });

  describe('GIVEN a label update the database applies to no row', () => {
    describe('WHEN the label is updated', () => {
      test('THEN the missing row is reported instead of a silent success', async () => {
        const { queries } = primeSupabase([{ data: [] }]);
        vi.spyOn(queries[0]!, 'single').mockResolvedValue({ data: null, error: NO_ROW_ERROR, count: null });

        await expect(updateCanvasNodeLabel('n1', 'Renamed')).rejects.toMatchObject({ code: 'PGRST116' });
      });
    });
  });
});

describe('updateCanvasNodeStatus', () => {
  describe('GIVEN a node status change', () => {
    describe('WHEN the status is updated', () => {
      test('THEN the status rpc receives the node id and status', async () => {
        const { client } = primeSupabase([]);

        await updateCanvasNodeStatus('n1', 'valid');

        expect(client.rpc).toHaveBeenCalledExactlyOnceWith('set_canvas_node_status', {
          p_node_id: 'n1',
          p_status: 'valid',
        });
      });
    });
  });

  describe('GIVEN a failing status rpc', () => {
    describe('WHEN the status is updated', () => {
      test('THEN the error propagates', async () => {
        const { client } = primeSupabase([]);
        vi.mocked(client.rpc).mockResolvedValue({ data: null, error: new Error('db down') });

        await expect(updateCanvasNodeStatus('n1', 'valid')).rejects.toThrow('db down');
      });
    });
  });
});

describe('updateCanvasNodeAnswer', () => {
  describe('GIVEN a node answer flag change', () => {
    describe('WHEN the answer flag is updated', () => {
      test('THEN the answer rpc receives the node id and flag', async () => {
        const { client } = primeSupabase([]);

        await updateCanvasNodeAnswer('n1', true);

        expect(client.rpc).toHaveBeenCalledExactlyOnceWith('set_canvas_node_answer', {
          p_node_id: 'n1',
          p_is_answer: true,
        });
      });
    });
  });

  describe('GIVEN a failing answer rpc', () => {
    describe('WHEN the answer flag is updated', () => {
      test('THEN the error propagates', async () => {
        const { client } = primeSupabase([]);
        vi.mocked(client.rpc).mockResolvedValue({ data: null, error: new Error('db down') });

        await expect(updateCanvasNodeAnswer('n1', true)).rejects.toThrow('db down');
      });
    });
  });
});

describe('deleteCanvasNode', () => {
  describe('GIVEN an existing node', () => {
    describe('WHEN the node is deleted', () => {
      test('THEN the delete targets the node id', async () => {
        const { queries } = primeSupabase([{ data: null }]);
        const eq = vi.spyOn(queries[0]!, 'eq');

        await deleteCanvasNode('n1');

        expect(queries[0]!.delete).toHaveBeenCalledTimes(1);
        expect(eq).toHaveBeenCalledExactlyOnceWith('id', 'n1');
      });
    });
  });

  describe('GIVEN a failing delete', () => {
    describe('WHEN the node is deleted', () => {
      test('THEN the error propagates', async () => {
        primeSupabase([{ error: new Error('db down') }]);

        await expect(deleteCanvasNode('n1')).rejects.toThrow('db down');
      });
    });
  });
});

describe('getCanvasNodes', () => {
  describe('GIVEN stored nodes for two threads', () => {
    describe('WHEN the nodes of both threads are fetched', () => {
      test('THEN one query in a stable order reads both threads and returns the rows as is', async () => {
        const rows = [canvasNodeRow(), canvasNodeRow({ id: 'n2', thread_id: 'th-2' })];
        const { client, queries } = primeSupabase([{ data: rows }]);
        const threadFilter = vi.spyOn(queries[0]!, 'in');
        const order = vi.spyOn(queries[0]!, 'order');

        await expect(getCanvasNodes(['th-1', 'th-2'])).resolves.toEqual(rows);
        expect(client.from).toHaveBeenCalledExactlyOnceWith('canvas_nodes');
        expect(threadFilter).toHaveBeenCalledExactlyOnceWith('thread_id', ['th-1', 'th-2']);
        expect(order.mock.calls).toEqual([['created_at'], ['id']]);
      });
    });
  });

  describe('GIVEN a canvas larger than one page', () => {
    describe('WHEN the nodes are fetched', () => {
      test('THEN the next page is read as well', async () => {
        const firstPage = Array.from({ length: ROWS_PER_PAGE }, (_, index) => canvasNodeRow({ id: `n-${index}` }));
        const { queries } = primeSupabase([{ data: firstPage }, { data: [canvasNodeRow({ id: 'n-last' })] }]);
        const secondRange = vi.spyOn(queries[1]!, 'range');

        await expect(getCanvasNodes(['th-1'])).resolves.toHaveLength(ROWS_PER_PAGE + 1);
        expect(secondRange).toHaveBeenCalledExactlyOnceWith(ROWS_PER_PAGE, 2 * ROWS_PER_PAGE - 1);
      });
    });
  });

  describe('GIVEN no thread ids', () => {
    describe('WHEN the nodes are fetched', () => {
      test('THEN the query is skipped', async () => {
        const { client } = primeSupabase([]);

        await expect(getCanvasNodes([])).resolves.toEqual([]);
        expect(client.from).not.toHaveBeenCalled();
      });
    });
  });

  describe('GIVEN no stored nodes', () => {
    describe('WHEN the nodes are fetched', () => {
      test('THEN an empty list is returned', async () => {
        primeSupabase([{ data: [] }]);

        await expect(getCanvasNodes(['th-1'])).resolves.toEqual([]);
      });
    });
  });

  describe('GIVEN a failing query', () => {
    describe('WHEN the nodes are fetched', () => {
      test('THEN the error propagates', async () => {
        primeSupabase([{ error: new Error('db down') }]);

        await expect(getCanvasNodes(['th-1'])).rejects.toThrow('db down');
      });
    });
  });
});
