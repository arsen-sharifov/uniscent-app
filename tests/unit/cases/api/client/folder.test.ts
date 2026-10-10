import { describe, expect, test, vi } from 'vitest';

import {
  createFolder,
  deleteFolder,
  deleteFolders,
  getFolders,
  IDS_PER_REQUEST,
  moveFolder,
  updateFolderName,
} from '@api/client';
import { folderRow } from '@mocks/rows';
import { NO_ROW_ERROR, primeSupabase } from '@mocks/supabase';

vi.mock('@/lib/supabase', () => import('@mocks/supabase'));

describe('getFolders', () => {
  describe('GIVEN stored folders for the workspace', () => {
    describe('WHEN the folders are fetched', () => {
      test('THEN the rows map to folders', async () => {
        primeSupabase([{ data: [folderRow({ parent_folder_id: 'folder-0' })] }]);

        await expect(getFolders('ws-1')).resolves.toEqual([
          { id: 'folder-1', workspaceId: 'ws-1', parentFolderId: 'folder-0', name: 'Folder', position: 0 },
        ]);
      });
    });
  });

  describe('GIVEN no stored folders', () => {
    describe('WHEN the folders are fetched', () => {
      test('THEN an empty list is returned', async () => {
        primeSupabase([{ data: null }]);

        await expect(getFolders('ws-1')).resolves.toEqual([]);
      });
    });
  });

  describe('GIVEN a failing query', () => {
    describe('WHEN the folders are fetched', () => {
      test('THEN the error propagates', async () => {
        primeSupabase([{ error: new Error('db down') }]);

        await expect(getFolders('ws-1')).rejects.toThrow('db down');
      });
    });
  });
});

describe('createFolder', () => {
  describe('GIVEN a root folder in a workspace whose root holds folders and threads', () => {
    describe('WHEN the folder is created', () => {
      test('THEN the folder takes the position after the last root item of either kind', async () => {
        const { queries } = primeSupabase([
          { data: { position: 1 } },
          { data: { position: 2 } },
          { data: folderRow() },
        ]);
        const is = vi.spyOn(queries[0]!, 'is');

        await expect(createFolder('ws-1')).resolves.toEqual({
          id: 'folder-1',
          workspaceId: 'ws-1',
          parentFolderId: null,
          name: 'Folder',
          position: 0,
        });
        expect(is).toHaveBeenCalledExactlyOnceWith('parent_folder_id', null);
        expect(queries[2]!.insert).toHaveBeenCalledExactlyOnceWith({
          workspace_id: 'ws-1',
          parent_folder_id: null,
          position: 3,
        });
      });
    });
  });

  describe('GIVEN a nested folder under a parent', () => {
    describe('WHEN the folder is created', () => {
      test('THEN the folder takes the position after the last item of the parent', async () => {
        const { queries } = primeSupabase([
          { data: { position: 4 } },
          { data: null },
          { data: folderRow({ parent_folder_id: 'folder-1' }) },
        ]);
        const eq = vi.spyOn(queries[0]!, 'eq');

        await createFolder('ws-1', 'folder-1');

        expect(eq).toHaveBeenCalledWith('parent_folder_id', 'folder-1');
        expect(queries[2]!.insert).toHaveBeenCalledExactlyOnceWith({
          workspace_id: 'ws-1',
          parent_folder_id: 'folder-1',
          position: 5,
        });
      });
    });
  });

  describe('GIVEN a name chosen up front', () => {
    describe('WHEN the folder is created', () => {
      test('THEN the name is written with the row instead of the default', async () => {
        const { queries } = primeSupabase([{ data: null }, { data: null }, { data: folderRow({ name: 'Research' }) }]);

        await expect(createFolder('ws-1', undefined, 'Research')).resolves.toMatchObject({ name: 'Research' });
        expect(queries[2]!.insert).toHaveBeenCalledExactlyOnceWith({
          workspace_id: 'ws-1',
          parent_folder_id: null,
          position: 0,
          name: 'Research',
        });
      });
    });
  });

  describe('GIVEN a failing position read', () => {
    describe('WHEN the folder is created', () => {
      test('THEN the error propagates', async () => {
        primeSupabase([{ error: new Error('db down') }]);

        await expect(createFolder('ws-1')).rejects.toThrow('db down');
      });
    });
  });

  describe('GIVEN a failing insert', () => {
    describe('WHEN the folder is created', () => {
      test('THEN the error propagates', async () => {
        primeSupabase([{ data: null }, { data: null }, { error: new Error('db down') }]);

        await expect(createFolder('ws-1')).rejects.toThrow('db down');
      });
    });
  });

  describe('GIVEN an insert that returns no row', () => {
    describe('WHEN the folder is created', () => {
      test('THEN nothing is returned', async () => {
        primeSupabase([{ data: null }, { data: null }, { data: null }]);

        await expect(createFolder('ws-1')).resolves.toBeNull();
      });
    });
  });
});

describe('updateFolderName', () => {
  describe('GIVEN an existing folder', () => {
    describe('WHEN the name is updated', () => {
      test('THEN the update targets the folder id with the new name', async () => {
        const { queries } = primeSupabase([{ data: null }]);
        const eq = vi.spyOn(queries[0]!, 'eq');

        await updateFolderName('folder-1', 'Renamed');

        expect(queries[0]!.update).toHaveBeenCalledExactlyOnceWith({ name: 'Renamed' });
        expect(eq).toHaveBeenCalledExactlyOnceWith('id', 'folder-1');
      });
    });
  });

  describe('GIVEN a failing update', () => {
    describe('WHEN the name is updated', () => {
      test('THEN the error propagates', async () => {
        primeSupabase([{ error: new Error('db down') }]);

        await expect(updateFolderName('folder-1', 'Renamed')).rejects.toThrow('db down');
      });
    });
  });

  describe('GIVEN a rename the database applies to no row', () => {
    describe('WHEN the name is updated', () => {
      test('THEN the missing row is reported instead of a silent success', async () => {
        const { queries } = primeSupabase([{ data: [] }]);
        vi.spyOn(queries[0]!, 'single').mockResolvedValue({ data: null, error: NO_ROW_ERROR, count: null });

        await expect(updateFolderName('folder-1', 'Renamed')).rejects.toMatchObject({ code: 'PGRST116' });
      });
    });
  });
});

describe('deleteFolder', () => {
  describe('GIVEN an existing folder', () => {
    describe('WHEN the folder is deleted', () => {
      test('THEN the delete targets the folder id', async () => {
        const { queries } = primeSupabase([{ data: null }]);
        const eq = vi.spyOn(queries[0]!, 'eq');

        await deleteFolder('folder-1');

        expect(queries[0]!.delete).toHaveBeenCalledTimes(1);
        expect(eq).toHaveBeenCalledExactlyOnceWith('id', 'folder-1');
      });
    });
  });

  describe('GIVEN a failing delete', () => {
    describe('WHEN the folder is deleted', () => {
      test('THEN the error propagates', async () => {
        primeSupabase([{ error: new Error('db down') }]);

        await expect(deleteFolder('folder-1')).rejects.toThrow('db down');
      });
    });
  });
});

describe('deleteFolders', () => {
  describe('GIVEN a set of folder ids', () => {
    describe('WHEN the folders are deleted', () => {
      test('THEN the delete targets the id set', async () => {
        const { queries } = primeSupabase([{ data: null }]);
        const inFilter = vi.spyOn(queries[0]!, 'in');

        await deleteFolders(['folder-1', 'folder-2']);

        expect(queries[0]!.delete).toHaveBeenCalledTimes(1);
        expect(inFilter).toHaveBeenCalledExactlyOnceWith('id', ['folder-1', 'folder-2']);
      });
    });
  });

  describe('GIVEN more folder ids than one request may carry', () => {
    describe('WHEN the folders are deleted', () => {
      test('THEN the ids are split into bounded delete requests', async () => {
        const folderIds = Array.from({ length: IDS_PER_REQUEST + 1 }, (_, index) => `folder-${index}`);
        const { queries } = primeSupabase([{ data: null }, { data: null }]);
        const filters = [vi.spyOn(queries[0]!, 'in'), vi.spyOn(queries[1]!, 'in')];

        await deleteFolders(folderIds);

        expect(filters.map((filter) => filter.mock.calls)).toEqual([
          [['id', folderIds.slice(0, IDS_PER_REQUEST)]],
          [['id', [`folder-${IDS_PER_REQUEST}`]]],
        ]);
      });
    });
  });

  describe('GIVEN a failing delete', () => {
    describe('WHEN the folders are deleted', () => {
      test('THEN the error propagates', async () => {
        primeSupabase([{ error: new Error('db down') }]);

        await expect(deleteFolders(['folder-1', 'folder-2'])).rejects.toThrow('db down');
      });
    });
  });
});

describe('moveFolder', () => {
  describe('GIVEN a folder to reparent', () => {
    describe('WHEN the folder is moved', () => {
      test('THEN the update carries the new parent and position for the folder id', async () => {
        const { queries } = primeSupabase([{ data: null }]);
        const eq = vi.spyOn(queries[0]!, 'eq');

        await moveFolder('folder-2', 'folder-1', 5);

        expect(queries[0]!.update).toHaveBeenCalledExactlyOnceWith({ parent_folder_id: 'folder-1', position: 5 });
        expect(eq).toHaveBeenCalledExactlyOnceWith('id', 'folder-2');
      });
    });
  });

  describe('GIVEN a failing update', () => {
    describe('WHEN the folder is moved', () => {
      test('THEN the error propagates', async () => {
        primeSupabase([{ error: new Error('db down') }]);

        await expect(moveFolder('folder-2', 'folder-1', 5)).rejects.toThrow('db down');
      });
    });
  });

  describe('GIVEN a move the database applies to no row', () => {
    describe('WHEN the folder is moved', () => {
      test('THEN the missing row is reported instead of a silent success', async () => {
        const { queries } = primeSupabase([{ data: [] }]);
        vi.spyOn(queries[0]!, 'single').mockResolvedValue({ data: null, error: NO_ROW_ERROR, count: null });

        await expect(moveFolder('folder-1', null, 2)).rejects.toMatchObject({ code: 'PGRST116' });
      });
    });
  });
});
