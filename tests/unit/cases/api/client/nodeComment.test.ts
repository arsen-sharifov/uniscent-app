import { describe, expect, test, vi } from 'vitest';

import { createNodeComment, deleteNodeComment, getNodeComments, IDS_PER_REQUEST, ROWS_PER_PAGE } from '@api/client';
import { nodeCommentRow } from '@mocks/rows';
import { primeSupabase } from '@mocks/supabase';

vi.mock('@/lib/supabase', () => import('@mocks/supabase'));

describe('createNodeComment', () => {
  describe('GIVEN a signed-in user', () => {
    describe('WHEN a comment is created', () => {
      test('THEN the insert carries the resolved author id', async () => {
        const { queries } = primeSupabase([{ data: null }]);

        await createNodeComment({ id: 'c1', nodeId: 'n1', text: 'Nice catch' });

        expect(queries[0]!.insert).toHaveBeenCalledExactlyOnceWith({
          id: 'c1',
          node_id: 'n1',
          author_id: 'user-1',
          text: 'Nice catch',
        });
      });
    });
  });

  describe('GIVEN no signed-in user', () => {
    describe('WHEN a comment is created', () => {
      test('THEN the auth requirement error propagates and nothing is inserted', async () => {
        const { queries } = primeSupabase([{ data: null }], { user: null });

        await expect(createNodeComment({ id: 'c1', nodeId: 'n1', text: 'Nice catch' })).rejects.toThrow(
          'Authenticated user required',
        );
        expect(queries[0]!.insert).not.toHaveBeenCalled();
      });
    });
  });

  describe('GIVEN a failing insert', () => {
    describe('WHEN a comment is created', () => {
      test('THEN the error propagates', async () => {
        primeSupabase([{ error: new Error('insert failed') }]);

        await expect(createNodeComment({ id: 'c1', nodeId: 'n1', text: 'Nice catch' })).rejects.toThrow(
          'insert failed',
        );
      });
    });
  });
});

describe('deleteNodeComment', () => {
  describe('GIVEN an existing comment', () => {
    describe('WHEN the comment is deleted', () => {
      test('THEN the delete targets the comment id', async () => {
        const { queries } = primeSupabase([{ data: null }]);
        const eq = vi.spyOn(queries[0]!, 'eq');

        await deleteNodeComment('c-1');

        expect(queries[0]!.delete).toHaveBeenCalledTimes(1);
        expect(eq).toHaveBeenCalledExactlyOnceWith('id', 'c-1');
      });
    });
  });

  describe('GIVEN a failing delete', () => {
    describe('WHEN the comment is deleted', () => {
      test('THEN the error propagates', async () => {
        primeSupabase([{ error: new Error('db down') }]);

        await expect(deleteNodeComment('c-1')).rejects.toThrow('db down');
      });
    });
  });
});

describe('getNodeComments', () => {
  describe('GIVEN comments stored for the nodes', () => {
    describe('WHEN the comments are fetched', () => {
      test('THEN the rows are returned as is in a stable order', async () => {
        const { queries } = primeSupabase([{ data: [nodeCommentRow()] }]);
        const order = vi.spyOn(queries[0]!, 'order');

        await expect(getNodeComments(['n1'])).resolves.toEqual([nodeCommentRow()]);
        expect(order.mock.calls).toEqual([['created_at'], ['id']]);
      });
    });
  });

  describe('GIVEN comments for more nodes than one request may carry ids for', () => {
    describe('WHEN the comments are fetched', () => {
      test('THEN the node ids are split into bounded requests and the merged comments are unchanged', async () => {
        const nodeIds = Array.from({ length: IDS_PER_REQUEST + 1 }, (_, index) => `n-${index}`);
        const lastId = `n-${IDS_PER_REQUEST}`;
        const comments = nodeIds.map((nodeId) => nodeCommentRow({ id: `c-${nodeId}`, node_id: nodeId }));
        const { queries } = primeSupabase([
          { data: comments.slice(0, IDS_PER_REQUEST) },
          { data: comments.slice(IDS_PER_REQUEST) },
        ]);
        const filters = [vi.spyOn(queries[0]!, 'in'), vi.spyOn(queries[1]!, 'in')];

        await expect(getNodeComments(nodeIds)).resolves.toEqual(comments);
        expect(filters.map((filter) => filter.mock.calls)).toEqual([
          [['node_id', nodeIds.slice(0, IDS_PER_REQUEST)]],
          [['node_id', [lastId]]],
        ]);
      });
    });
  });

  describe('GIVEN more comments than one page', () => {
    describe('WHEN the comments are fetched', () => {
      test('THEN the next page is read as well', async () => {
        const firstPage = Array.from({ length: ROWS_PER_PAGE }, (_, index) => nodeCommentRow({ id: `c-${index}` }));
        const { queries } = primeSupabase([{ data: firstPage }, { data: [nodeCommentRow({ id: 'c-last' })] }]);
        const secondRange = vi.spyOn(queries[1]!, 'range');

        await expect(getNodeComments(['n1'])).resolves.toHaveLength(ROWS_PER_PAGE + 1);
        expect(secondRange).toHaveBeenCalledExactlyOnceWith(ROWS_PER_PAGE, 2 * ROWS_PER_PAGE - 1);
      });
    });
  });

  describe('GIVEN no node ids', () => {
    describe('WHEN the comments are fetched', () => {
      test('THEN the query is skipped', async () => {
        const { client } = primeSupabase([]);

        await expect(getNodeComments([])).resolves.toEqual([]);
        expect(client.from).not.toHaveBeenCalled();
      });
    });
  });

  describe('GIVEN a failing query', () => {
    describe('WHEN the comments are fetched', () => {
      test('THEN the error propagates', async () => {
        primeSupabase([{ error: new Error('db down') }]);

        await expect(getNodeComments(['n1'])).rejects.toThrow('db down');
      });
    });
  });
});
