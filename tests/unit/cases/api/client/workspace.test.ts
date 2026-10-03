import { describe, expect, test, vi } from 'vitest';

import {
  createWorkspace,
  deleteWorkspace,
  deleteWorkspaces,
  getMyOwnedSharedWorkspaces,
  getMyWorkspacePermissions,
  getMyWorkspaces,
  getWorkspace,
  IDS_PER_REQUEST,
  moveWorkspace,
  updateWorkspaceName,
} from '@api/client';
import { myWorkspaceRow, workspaceAccessRow, workspaceRow } from '@mocks/rows';
import { NO_ROW_ERROR, primeSupabase } from '@mocks/supabase';

vi.mock('@/lib/supabase', () => import('@mocks/supabase'));

describe('getMyWorkspaces', () => {
  describe('GIVEN membership rows returned by the rpc', () => {
    describe('WHEN my workspaces are fetched', () => {
      test('THEN the rows map to workspace items', async () => {
        const { client } = primeSupabase([]);
        vi.mocked(client.rpc).mockResolvedValue({
          data: [myWorkspaceRow(), myWorkspaceRow({ id: 'ws-2', name: 'Second', can_manage_workspace: true })],
          error: null,
        });

        await expect(getMyWorkspaces()).resolves.toEqual([
          { id: 'ws-1', name: 'Workspace', canManageWorkspace: false },
          { id: 'ws-2', name: 'Second', canManageWorkspace: true },
        ]);
        expect(client.rpc).toHaveBeenCalledExactlyOnceWith('get_my_workspaces');
      });
    });
  });

  describe('GIVEN the rpc returns null data', () => {
    describe('WHEN my workspaces are fetched', () => {
      test('THEN an empty list is returned', async () => {
        const { client } = primeSupabase([]);
        vi.mocked(client.rpc).mockResolvedValue({ data: null, error: null });

        await expect(getMyWorkspaces()).resolves.toEqual([]);
      });
    });
  });

  describe('GIVEN a failing rpc', () => {
    describe('WHEN my workspaces are fetched', () => {
      test('THEN the error propagates', async () => {
        const { client } = primeSupabase([]);
        vi.mocked(client.rpc).mockResolvedValue({ data: null, error: new Error('db down') });

        await expect(getMyWorkspaces()).rejects.toThrow('db down');
      });
    });
  });
});

describe('getMyOwnedSharedWorkspaces', () => {
  describe('GIVEN owned workspaces that other members use', () => {
    describe('WHEN the shared workspaces are fetched', () => {
      test('THEN their ids and names come back in the rpc order', async () => {
        const { client } = primeSupabase([]);
        vi.mocked(client.rpc).mockResolvedValue({
          data: [
            { id: 'ws-1', name: 'Alpha' },
            { id: 'ws-2', name: 'Beta' },
          ],
          error: null,
        });

        await expect(getMyOwnedSharedWorkspaces()).resolves.toEqual([
          { id: 'ws-1', name: 'Alpha' },
          { id: 'ws-2', name: 'Beta' },
        ]);
        expect(client.rpc).toHaveBeenCalledExactlyOnceWith('get_my_owned_shared_workspaces');
      });
    });
  });

  describe('GIVEN the rpc returns null data', () => {
    describe('WHEN the shared workspaces are fetched', () => {
      test('THEN an empty list is returned', async () => {
        const { client } = primeSupabase([]);
        vi.mocked(client.rpc).mockResolvedValue({ data: null, error: null });

        await expect(getMyOwnedSharedWorkspaces()).resolves.toEqual([]);
      });
    });
  });

  describe('GIVEN a failing rpc', () => {
    describe('WHEN the shared workspaces are fetched', () => {
      test('THEN the error propagates', async () => {
        const { client } = primeSupabase([]);
        vi.mocked(client.rpc).mockResolvedValue({ data: null, error: new Error('db down') });

        await expect(getMyOwnedSharedWorkspaces()).rejects.toThrow('db down');
      });
    });
  });
});

describe('getMyWorkspacePermissions', () => {
  describe('GIVEN an access row for the workspace', () => {
    describe('WHEN the permissions are fetched', () => {
      test('THEN the row maps to a workspace access object', async () => {
        const { client } = primeSupabase([]);
        vi.mocked(client.rpc).mockResolvedValue({ data: [workspaceAccessRow()], error: null });

        await expect(getMyWorkspacePermissions('ws-1')).resolves.toEqual({
          isOwner: false,
          canEditCanvas: true,
          canComment: true,
          canManageStructure: false,
          canManageMembers: false,
          canManageRoles: false,
          canManageWorkspace: false,
        });
        expect(client.rpc).toHaveBeenCalledExactlyOnceWith('get_my_workspace_permissions', { p_workspace_id: 'ws-1' });
      });
    });
  });

  describe('GIVEN the rpc returns an empty array', () => {
    describe('WHEN the permissions are fetched', () => {
      test('THEN nothing is returned', async () => {
        const { client } = primeSupabase([]);
        vi.mocked(client.rpc).mockResolvedValue({ data: [], error: null });

        await expect(getMyWorkspacePermissions('ws-1')).resolves.toBeNull();
      });
    });
  });

  describe('GIVEN a failing rpc', () => {
    describe('WHEN the permissions are fetched', () => {
      test('THEN the error propagates', async () => {
        const { client } = primeSupabase([]);
        vi.mocked(client.rpc).mockResolvedValue({ data: null, error: new Error('db down') });

        await expect(getMyWorkspacePermissions('ws-1')).rejects.toThrow('db down');
      });
    });
  });
});

describe('getWorkspace', () => {
  describe('GIVEN a stored workspace row', () => {
    describe('WHEN the workspace is fetched', () => {
      test('THEN the row maps to a workspace', async () => {
        primeSupabase([{ data: workspaceRow() }]);

        await expect(getWorkspace('ws-1')).resolves.toEqual({
          id: 'ws-1',
          name: 'Workspace',
          ownerId: 'user-1',
          createdAt: '2026-01-01T00:00:00Z',
        });
      });
    });
  });

  describe('GIVEN no matching workspace', () => {
    describe('WHEN the workspace is fetched', () => {
      test('THEN nothing is returned', async () => {
        primeSupabase([{ data: null }]);

        await expect(getWorkspace('ws-1')).resolves.toBeNull();
      });
    });
  });

  describe('GIVEN a failing query', () => {
    describe('WHEN the workspace is fetched', () => {
      test('THEN the error propagates', async () => {
        primeSupabase([{ error: new Error('db down') }]);

        await expect(getWorkspace('ws-1')).rejects.toThrow('db down');
      });
    });
  });
});

describe('createWorkspace', () => {
  describe('GIVEN a signed-in user', () => {
    describe('WHEN a workspace is created', () => {
      test('THEN the insert carries the name and owner and returns the mapped workspace', async () => {
        const { queries } = primeSupabase([{ data: workspaceRow() }]);

        await expect(createWorkspace('Workspace')).resolves.toEqual({
          id: 'ws-1',
          name: 'Workspace',
          ownerId: 'user-1',
          createdAt: '2026-01-01T00:00:00Z',
        });
        expect(queries[0]!.insert).toHaveBeenCalledExactlyOnceWith({ name: 'Workspace', owner_id: 'user-1' });
      });
    });
  });

  describe('GIVEN no signed-in user', () => {
    describe('WHEN a workspace is created', () => {
      test('THEN the auth requirement error is thrown and nothing is written', async () => {
        const { client } = primeSupabase([{ data: null }], { user: null });

        await expect(createWorkspace('Workspace')).rejects.toThrow('Authenticated user required');
        expect(client.from).not.toHaveBeenCalled();
      });
    });
  });

  describe('GIVEN an auth check that fails', () => {
    describe('WHEN a workspace is created', () => {
      test('THEN the auth error propagates instead of a silent no-op', async () => {
        const { client } = primeSupabase([{ data: null }]);
        vi.mocked(client.auth.getUser).mockResolvedValue({
          data: { user: null },
          error: new Error('auth down'),
        } as never);

        await expect(createWorkspace('Workspace')).rejects.toThrow('auth down');
        expect(client.from).not.toHaveBeenCalled();
      });
    });
  });

  describe('GIVEN a failing insert', () => {
    describe('WHEN a workspace is created', () => {
      test('THEN the error propagates', async () => {
        primeSupabase([{ error: new Error('db down') }]);

        await expect(createWorkspace('Workspace')).rejects.toThrow('db down');
      });
    });
  });

  describe('GIVEN an insert that returns no row', () => {
    describe('WHEN a workspace is created', () => {
      test('THEN nothing is returned', async () => {
        primeSupabase([{ data: null }]);

        await expect(createWorkspace('Workspace')).resolves.toBeNull();
      });
    });
  });
});

describe('updateWorkspaceName', () => {
  describe('GIVEN an existing workspace', () => {
    describe('WHEN the name is updated', () => {
      test('THEN the update targets the workspace id with the new name', async () => {
        const { queries } = primeSupabase([{ data: null }]);
        const eq = vi.spyOn(queries[0]!, 'eq');

        await updateWorkspaceName('ws-1', 'Renamed');

        expect(queries[0]!.update).toHaveBeenCalledExactlyOnceWith({ name: 'Renamed' });
        expect(eq).toHaveBeenCalledExactlyOnceWith('id', 'ws-1');
      });
    });
  });

  describe('GIVEN a failing update', () => {
    describe('WHEN the name is updated', () => {
      test('THEN the error propagates', async () => {
        primeSupabase([{ error: new Error('db down') }]);

        await expect(updateWorkspaceName('ws-1', 'Renamed')).rejects.toThrow('db down');
      });
    });
  });

  describe('GIVEN a rename the database applies to no row', () => {
    describe('WHEN the name is updated', () => {
      test('THEN the missing row is reported instead of a silent success', async () => {
        const { queries } = primeSupabase([{ data: [] }]);
        vi.spyOn(queries[0]!, 'single').mockResolvedValue({ data: null, error: NO_ROW_ERROR, count: null });

        await expect(updateWorkspaceName('ws-1', 'Renamed')).rejects.toMatchObject({ code: 'PGRST116' });
      });
    });
  });
});

describe('deleteWorkspace', () => {
  describe('GIVEN an existing workspace', () => {
    describe('WHEN the workspace is deleted', () => {
      test('THEN the delete targets the workspace id', async () => {
        const { queries } = primeSupabase([{ data: null }]);
        const eq = vi.spyOn(queries[0]!, 'eq');

        await deleteWorkspace('ws-1');

        expect(queries[0]!.delete).toHaveBeenCalledTimes(1);
        expect(eq).toHaveBeenCalledExactlyOnceWith('id', 'ws-1');
      });
    });
  });

  describe('GIVEN a failing delete', () => {
    describe('WHEN the workspace is deleted', () => {
      test('THEN the error propagates', async () => {
        primeSupabase([{ error: new Error('db down') }]);

        await expect(deleteWorkspace('ws-1')).rejects.toThrow('db down');
      });
    });
  });
});

describe('deleteWorkspaces', () => {
  describe('GIVEN a set of workspace ids', () => {
    describe('WHEN the workspaces are deleted', () => {
      test('THEN the delete targets the id set', async () => {
        const { queries } = primeSupabase([{ data: null }]);
        const inFilter = vi.spyOn(queries[0]!, 'in');

        await deleteWorkspaces(['ws-1', 'ws-2']);

        expect(queries[0]!.delete).toHaveBeenCalledTimes(1);
        expect(inFilter).toHaveBeenCalledExactlyOnceWith('id', ['ws-1', 'ws-2']);
      });
    });
  });

  describe('GIVEN more workspace ids than one request may carry', () => {
    describe('WHEN the workspaces are deleted', () => {
      test('THEN the ids are split into bounded delete requests', async () => {
        const workspaceIds = Array.from({ length: IDS_PER_REQUEST + 1 }, (_, index) => `ws-${index}`);
        const { queries } = primeSupabase([{ data: null }, { data: null }]);
        const filters = [vi.spyOn(queries[0]!, 'in'), vi.spyOn(queries[1]!, 'in')];

        await deleteWorkspaces(workspaceIds);

        expect(filters.map((filter) => filter.mock.calls)).toEqual([
          [['id', workspaceIds.slice(0, IDS_PER_REQUEST)]],
          [['id', [`ws-${IDS_PER_REQUEST}`]]],
        ]);
      });
    });
  });

  describe('GIVEN a failing delete', () => {
    describe('WHEN the workspaces are deleted', () => {
      test('THEN the error propagates', async () => {
        primeSupabase([{ error: new Error('db down') }]);

        await expect(deleteWorkspaces(['ws-1', 'ws-2'])).rejects.toThrow('db down');
      });
    });
  });
});

describe('moveWorkspace', () => {
  describe('GIVEN a workspace to reposition', () => {
    describe('WHEN the workspace is moved', () => {
      test('THEN the membership row position is updated for the workspace', async () => {
        const { client, queries } = primeSupabase([{ data: null }]);
        const eq = vi.spyOn(queries[0]!, 'eq');

        await moveWorkspace('ws-1', 3);

        expect(client.from).toHaveBeenCalledExactlyOnceWith('workspace_members');
        expect(queries[0]!.update).toHaveBeenCalledExactlyOnceWith({ position: 3 });
        expect(eq).toHaveBeenCalledExactlyOnceWith('workspace_id', 'ws-1');
      });
    });
  });

  describe('GIVEN a failing update', () => {
    describe('WHEN the workspace is moved', () => {
      test('THEN the error propagates', async () => {
        primeSupabase([{ error: new Error('db down') }]);

        await expect(moveWorkspace('ws-1', 3)).rejects.toThrow('db down');
      });
    });
  });

  describe('GIVEN a move the database applies to no row', () => {
    describe('WHEN the workspace is moved', () => {
      test('THEN the missing row is reported instead of a silent success', async () => {
        const { queries } = primeSupabase([{ data: [] }]);
        vi.spyOn(queries[0]!, 'single').mockResolvedValue({ data: null, error: NO_ROW_ERROR, count: null });

        await expect(moveWorkspace('ws-1', 2)).rejects.toMatchObject({ code: 'PGRST116' });
      });
    });
  });
});
