import { describe, expect, test, vi } from 'vitest';

import { getNextPosition } from '@api/client';
import { primeSupabase } from '@mocks/supabase';

vi.mock('@/lib/supabase', () => import('@mocks/supabase'));

describe('getNextPosition', () => {
  describe('GIVEN a root whose folders and threads share one order with gaps', () => {
    describe('WHEN the next position is read', () => {
      test('THEN it follows the last item of either kind at the root', async () => {
        const { client, queries } = primeSupabase([{ data: { position: 1 } }, { data: { position: 5 } }]);
        const folderParent = vi.spyOn(queries[0]!, 'is');
        const threadParent = vi.spyOn(queries[1]!, 'is');
        const folderOrder = vi.spyOn(queries[0]!, 'order');

        await expect(getNextPosition('ws-1')).resolves.toBe(6);
        expect(client.from.mock.calls).toEqual([['folders'], ['threads']]);
        expect(folderParent).toHaveBeenCalledExactlyOnceWith('parent_folder_id', null);
        expect(threadParent).toHaveBeenCalledExactlyOnceWith('folder_id', null);
        expect(folderOrder).toHaveBeenCalledExactlyOnceWith('position', { ascending: false });
      });
    });
  });

  describe('GIVEN a folder whose last item is a subfolder', () => {
    describe('WHEN the next position is read', () => {
      test('THEN it follows that subfolder within the folder', async () => {
        const { queries } = primeSupabase([{ data: { position: 7 } }, { data: { position: 2 } }]);
        const folderFilter = vi.spyOn(queries[0]!, 'eq');
        const threadFilter = vi.spyOn(queries[1]!, 'eq');

        await expect(getNextPosition('ws-1', 'folder-1')).resolves.toBe(8);
        expect(folderFilter.mock.calls).toEqual([
          ['workspace_id', 'ws-1'],
          ['parent_folder_id', 'folder-1'],
        ]);
        expect(threadFilter.mock.calls).toEqual([
          ['workspace_id', 'ws-1'],
          ['folder_id', 'folder-1'],
        ]);
      });
    });
  });

  describe('GIVEN an empty parent', () => {
    describe('WHEN the next position is read', () => {
      test('THEN the first position is returned', async () => {
        primeSupabase([{ data: null }, { data: null }]);

        await expect(getNextPosition('ws-1')).resolves.toBe(0);
      });
    });
  });

  describe('GIVEN a failing read', () => {
    describe('WHEN the next position is read', () => {
      test('THEN the error propagates', async () => {
        primeSupabase([{ data: null }, { error: new Error('db down') }]);

        await expect(getNextPosition('ws-1')).rejects.toThrow('db down');
      });
    });
  });
});
