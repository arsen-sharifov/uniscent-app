import { describe, expect, test, vi } from 'vitest';

import { ECanvasNodeType } from '@interfaces';
import { countReferenceTargets, getCanvasContent, IDS_PER_REQUEST, searchReferenceTargets } from '@api/client';
import { canvasEdgeRow, canvasNodeRow, canvasNodeWithThreadRow, nodeCommentRow } from '@mocks/rows';
import { primeSupabase } from '@mocks/supabase';

vi.mock('@/lib/supabase', () => import('@mocks/supabase'));

const THREAD_ROW = { data: { id: 'th-1' } };

describe('getCanvasContent', () => {
  describe('GIVEN a thread with a canvas node, a reference node and a comment', () => {
    describe('WHEN the canvas content is assembled', () => {
      test('THEN nodes carry their grouped comments and resolved reference meta', async () => {
        primeSupabase([
          THREAD_ROW,
          {
            data: [
              canvasNodeRow(),
              canvasNodeRow({ id: 'ref1', type: ECanvasNodeType.Reference, source_node_id: 'origin', label: 'Ref' }),
            ],
          },
          { data: [canvasEdgeRow()] },
          { data: [nodeCommentRow()] },
          {
            data: [
              canvasNodeWithThreadRow({
                id: 'origin',
                label: 'Origin node',
                threads: {
                  id: 'th-2',
                  name: 'Other thread',
                  workspace_id: 'ws-2',
                  workspaces: { name: 'Other workspace' },
                },
              }),
            ],
          },
        ]);

        await expect(getCanvasContent('ws-1', 'th-1')).resolves.toEqual({
          nodes: [
            {
              id: 'n1',
              type: ECanvasNodeType.Canvas,
              position: { x: 10, y: 20 },
              data: {
                label: 'Node',
                status: null,
                isAnswer: false,
                comments: [{ id: 'c-1', text: 'Comment', authorId: 'user-1' }],
                createdBy: 'user-1',
              },
            },
            {
              id: 'ref1',
              type: ECanvasNodeType.Reference,
              position: { x: 10, y: 20 },
              data: {
                label: 'Ref',
                sourceNodeId: 'origin',
                sourceNodeLabel: 'Origin node',
                sourceThreadId: 'th-2',
                sourceThreadName: 'Other thread',
                sourceWorkspaceId: 'ws-2',
                sourceWorkspaceName: 'Other workspace',
                createdBy: 'user-1',
              },
            },
          ],
          edges: [
            { id: 'e1', source: 'n1', target: 'n2', sourceHandle: 'right', targetHandle: 'left', type: 'default' },
          ],
        });
      });
    });
  });

  describe('GIVEN a canvas with more reference nodes than one request may carry ids for', () => {
    describe('WHEN the canvas content is assembled', () => {
      test('THEN the reference targets are read in bounded requests and every reference keeps its source meta', async () => {
        const sourceIds = Array.from({ length: IDS_PER_REQUEST + 1 }, (_, index) => `origin-${index}`);
        const targets = sourceIds.map((sourceId) =>
          canvasNodeWithThreadRow({ id: sourceId, label: `Label ${sourceId}` }),
        );
        const { queries } = primeSupabase([
          THREAD_ROW,
          {
            data: sourceIds.map((sourceId) =>
              canvasNodeRow({ id: `ref-${sourceId}`, type: ECanvasNodeType.Reference, source_node_id: sourceId }),
            ),
          },
          { data: [] },
          { data: [] },
          { data: [] },
          { data: targets.slice(0, IDS_PER_REQUEST) },
          { data: targets.slice(IDS_PER_REQUEST) },
        ]);
        const targetFilters = [vi.spyOn(queries[5]!, 'in'), vi.spyOn(queries[6]!, 'in')];

        await expect(getCanvasContent('ws-1', 'th-1')).resolves.toMatchObject({
          nodes: sourceIds.map((sourceId) => ({
            data: { sourceNodeId: sourceId, sourceNodeLabel: `Label ${sourceId}` },
          })),
        });
        expect(targetFilters.map((filter) => filter.mock.calls)).toEqual([
          [['id', sourceIds.slice(0, IDS_PER_REQUEST)]],
          [['id', [`origin-${IDS_PER_REQUEST}`]]],
        ]);
      });
    });
  });

  describe('GIVEN two canvas nodes each with their own comments', () => {
    describe('WHEN the canvas content is assembled', () => {
      test('THEN each node receives only its own grouped comments', async () => {
        primeSupabase([
          THREAD_ROW,
          { data: [canvasNodeRow(), canvasNodeRow({ id: 'n2', label: 'Second' })] },
          { data: [] },
          {
            data: [
              nodeCommentRow({ id: 'c-1', node_id: 'n1', text: 'First comment' }),
              nodeCommentRow({ id: 'c-2', node_id: 'n2', text: 'Second comment' }),
              nodeCommentRow({ id: 'c-3', node_id: 'n1', text: 'Another for n1' }),
            ],
          },
        ]);

        await expect(getCanvasContent('ws-1', 'th-1')).resolves.toMatchObject({
          nodes: [
            expect.objectContaining({
              id: 'n1',
              data: expect.objectContaining({
                comments: [
                  { id: 'c-1', text: 'First comment', authorId: 'user-1' },
                  { id: 'c-3', text: 'Another for n1', authorId: 'user-1' },
                ],
              }),
            }),
            expect.objectContaining({
              id: 'n2',
              data: expect.objectContaining({
                comments: [{ id: 'c-2', text: 'Second comment', authorId: 'user-1' }],
              }),
            }),
          ],
        });
      });
    });
  });

  describe('GIVEN a reference node whose source is missing from the lookup', () => {
    describe('WHEN the canvas content is assembled', () => {
      test('THEN the reference falls back to the row label and empty source fields', async () => {
        primeSupabase([
          THREAD_ROW,
          {
            data: [
              canvasNodeRow({ id: 'ref1', type: ECanvasNodeType.Reference, source_node_id: 'gone', label: 'Ref' }),
            ],
          },
          { data: [] },
          { data: [] },
          { data: [] },
        ]);

        await expect(getCanvasContent('ws-1', 'th-1')).resolves.toMatchObject({
          nodes: [
            expect.objectContaining({
              id: 'ref1',
              data: expect.objectContaining({
                sourceNodeId: 'gone',
                sourceNodeLabel: 'Ref',
                sourceThreadId: '',
                sourceThreadName: '',
                sourceWorkspaceId: '',
                sourceWorkspaceName: '',
              }),
            }),
          ],
        });
      });
    });
  });

  describe('GIVEN a thread without reference nodes', () => {
    describe('WHEN the canvas content is assembled', () => {
      test('THEN the reference target lookup is skipped', async () => {
        const { client } = primeSupabase([THREAD_ROW, { data: [canvasNodeRow()] }, { data: [] }, { data: [] }]);

        await expect(getCanvasContent('ws-1', 'th-1')).resolves.toMatchObject({
          nodes: [expect.objectContaining({ id: 'n1' })],
          edges: [],
        });
        expect(client.from).toHaveBeenCalledTimes(4);
      });
    });
  });

  describe('GIVEN a thread that belongs to another workspace than the one in the address', () => {
    describe('WHEN the canvas content is assembled', () => {
      test('THEN it refuses to load the foreign canvas under this workspace', async () => {
        const { client } = primeSupabase([
          { data: null, error: { code: 'PGRST116', message: 'no rows' } },
          { data: [canvasNodeRow()] },
          { data: [] },
        ]);

        await expect(getCanvasContent('ws-1', 'th-foreign')).rejects.toMatchObject({ code: 'PGRST116' });
        expect(client.from).not.toHaveBeenCalledWith('node_comments');
      });
    });
  });
});

describe('searchReferenceTargets', () => {
  describe('GIVEN matching canvas nodes in the workspace', () => {
    describe('WHEN reference targets are searched', () => {
      test('THEN the rows map to node references', async () => {
        primeSupabase([{ data: [canvasNodeWithThreadRow()] }]);

        await expect(searchReferenceTargets('ws-1', 'th-exclude')).resolves.toEqual([
          {
            id: 'n1',
            label: 'Origin node',
            threadId: 'th-1',
            threadName: 'Thread',
            workspaceId: 'ws-1',
            workspaceName: 'Workspace',
          },
        ]);
      });
    });
  });

  describe('GIVEN no matching nodes', () => {
    describe('WHEN reference targets are searched', () => {
      test('THEN an empty list is returned', async () => {
        primeSupabase([{ data: null }]);

        await expect(searchReferenceTargets('ws-1')).resolves.toEqual([]);
      });
    });
  });

  describe('GIVEN an excluded thread', () => {
    describe('WHEN reference targets are searched', () => {
      test('THEN the exclusion filter is applied', async () => {
        const { queries } = primeSupabase([{ data: [canvasNodeWithThreadRow()] }]);
        const neq = vi.spyOn(queries[0]!, 'neq');

        await searchReferenceTargets('ws-1', 'th-exclude');

        expect(neq).toHaveBeenCalledExactlyOnceWith('thread_id', 'th-exclude');
      });
    });
  });

  describe('GIVEN no excluded thread', () => {
    describe('WHEN reference targets are searched', () => {
      test('THEN the exclusion filter is skipped', async () => {
        const { queries } = primeSupabase([{ data: [canvasNodeWithThreadRow()] }]);
        const neq = vi.spyOn(queries[0]!, 'neq');

        await searchReferenceTargets('ws-1');

        expect(neq).not.toHaveBeenCalled();
      });
    });
  });
});

describe('countReferenceTargets', () => {
  describe('GIVEN canvas nodes on other canvases of the workspace', () => {
    describe('WHEN they are counted', () => {
      test('THEN only the count is requested and returned', async () => {
        const { queries } = primeSupabase([{ count: 3 }]);
        const select = vi.spyOn(queries[0]!, 'select');

        await expect(countReferenceTargets('ws-1', 'th-exclude')).resolves.toBe(3);
        expect(select).toHaveBeenCalledExactlyOnceWith(expect.any(String), { count: 'exact', head: true });
      });
    });
  });

  describe('GIVEN an excluded thread', () => {
    describe('WHEN reference targets are counted', () => {
      test('THEN the exclusion filter is applied', async () => {
        const { queries } = primeSupabase([{ count: 0 }]);
        const neq = vi.spyOn(queries[0]!, 'neq');

        await countReferenceTargets('ws-1', 'th-exclude');

        expect(neq).toHaveBeenCalledExactlyOnceWith('thread_id', 'th-exclude');
      });
    });
  });

  describe('GIVEN no excluded thread', () => {
    describe('WHEN reference targets are counted', () => {
      test('THEN the exclusion filter is skipped', async () => {
        const { queries } = primeSupabase([{ count: 2 }]);
        const neq = vi.spyOn(queries[0]!, 'neq');

        await countReferenceTargets('ws-1');

        expect(neq).not.toHaveBeenCalled();
      });
    });
  });

  describe('GIVEN a count that comes back empty', () => {
    describe('WHEN reference targets are counted', () => {
      test('THEN zero is returned', async () => {
        primeSupabase([{ data: null }]);

        await expect(countReferenceTargets('ws-1')).resolves.toBe(0);
      });
    });
  });

  describe('GIVEN a failing count query', () => {
    describe('WHEN reference targets are counted', () => {
      test('THEN the error is rethrown', async () => {
        primeSupabase([{ error: new Error('db down') }]);

        await expect(countReferenceTargets('ws-1')).rejects.toThrow('db down');
      });
    });
  });
});
