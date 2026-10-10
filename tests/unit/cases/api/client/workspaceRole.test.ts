import { describe, expect, test, vi } from 'vitest';

import { createWorkspaceRole, deleteWorkspaceRole, getWorkspaceRoles, updateWorkspaceRole } from '@api/client';
import { ROLE_PERMISSIONS } from '@mocks/roles';
import { workspaceRoleRow } from '@mocks/rows';
import { primeSupabase } from '@mocks/supabase';

vi.mock('@/lib/supabase', () => import('@mocks/supabase'));

describe('getWorkspaceRoles', () => {
  describe('GIVEN stored roles for the workspace', () => {
    describe('WHEN the roles are fetched', () => {
      test('THEN the rows map through the role mapper', async () => {
        const { client } = primeSupabase([]);
        vi.mocked(client.rpc).mockResolvedValue({ data: [workspaceRoleRow()], error: null });

        await expect(getWorkspaceRoles('ws-1')).resolves.toEqual([
          {
            id: 'role-1',
            key: 'member',
            name: 'Member',
            icon: null,
            isSystem: true,
            isOwner: false,
            canEditCanvas: true,
            canComment: true,
            canManageStructure: false,
            canManageMembers: false,
            canManageRoles: false,
            canManageWorkspace: false,
            memberCount: 2,
          },
        ]);
      });
    });
  });

  describe('GIVEN no stored roles', () => {
    describe('WHEN the roles are fetched', () => {
      test('THEN an empty list is returned', async () => {
        const { client } = primeSupabase([]);
        vi.mocked(client.rpc).mockResolvedValue({ data: null, error: null });

        await expect(getWorkspaceRoles('ws-1')).resolves.toEqual([]);
      });
    });
  });

  describe('GIVEN a failing rpc', () => {
    describe('WHEN the roles are fetched', () => {
      test('THEN the error propagates', async () => {
        const { client } = primeSupabase([]);
        vi.mocked(client.rpc).mockResolvedValue({ data: null, error: new Error('db down') });

        await expect(getWorkspaceRoles('ws-1')).rejects.toThrow('db down');
      });
    });
  });
});

describe('createWorkspaceRole', () => {
  describe('GIVEN a new role definition', () => {
    describe('WHEN the role is created', () => {
      test('THEN the rpc receives every mapped parameter', async () => {
        const { client } = primeSupabase([]);
        vi.mocked(client.rpc).mockResolvedValue({ data: 'role-9', error: null });

        await createWorkspaceRole('ws-1', 'Reviewer', 'star', {
          canEditCanvas: true,
          canComment: false,
          canManageStructure: true,
          canManageMembers: false,
          canManageRoles: true,
          canManageWorkspace: false,
        });

        expect(client.rpc).toHaveBeenCalledExactlyOnceWith('create_workspace_role', {
          p_workspace_id: 'ws-1',
          p_name: 'Reviewer',
          p_icon: 'star',
          p_can_edit_canvas: true,
          p_can_comment: false,
          p_can_manage_structure: true,
          p_can_manage_members: false,
          p_can_manage_roles: true,
          p_can_manage_workspace: false,
        });
      });
    });
  });

  describe('GIVEN an rpc that returns the new role id', () => {
    describe('WHEN the role is created', () => {
      test('THEN the new role id is returned', async () => {
        const { client } = primeSupabase([]);
        vi.mocked(client.rpc).mockResolvedValue({ data: 'role-9', error: null });

        await expect(createWorkspaceRole('ws-1', 'Reviewer', 'star', ROLE_PERMISSIONS)).resolves.toEqual('role-9');
      });
    });
  });

  describe('GIVEN a failing rpc', () => {
    describe('WHEN the role is created', () => {
      test('THEN the error propagates', async () => {
        const { client } = primeSupabase([]);
        vi.mocked(client.rpc).mockResolvedValue({ data: null, error: new Error('db down') });

        await expect(createWorkspaceRole('ws-1', 'Reviewer', 'star', ROLE_PERMISSIONS)).rejects.toThrow('db down');
      });
    });
  });
});

describe('updateWorkspaceRole', () => {
  describe('GIVEN an updated role definition', () => {
    describe('WHEN the role is updated', () => {
      test('THEN the rpc receives every mapped parameter', async () => {
        const { client } = primeSupabase([]);
        vi.mocked(client.rpc).mockResolvedValue({ data: null, error: null });

        await updateWorkspaceRole('role-1', 'Reviewer', 'star', {
          canEditCanvas: false,
          canComment: true,
          canManageStructure: false,
          canManageMembers: true,
          canManageRoles: false,
          canManageWorkspace: true,
        });

        expect(client.rpc).toHaveBeenCalledExactlyOnceWith('update_workspace_role', {
          p_role_id: 'role-1',
          p_name: 'Reviewer',
          p_icon: 'star',
          p_can_edit_canvas: false,
          p_can_comment: true,
          p_can_manage_structure: false,
          p_can_manage_members: true,
          p_can_manage_roles: false,
          p_can_manage_workspace: true,
        });
      });
    });
  });

  describe('GIVEN a failing rpc', () => {
    describe('WHEN the role is updated', () => {
      test('THEN the error propagates', async () => {
        const { client } = primeSupabase([]);
        vi.mocked(client.rpc).mockResolvedValue({ data: null, error: new Error('db down') });

        await expect(updateWorkspaceRole('role-1', 'Reviewer', 'star', ROLE_PERMISSIONS)).rejects.toThrow('db down');
      });
    });
  });
});

describe('deleteWorkspaceRole', () => {
  describe('GIVEN an existing role', () => {
    describe('WHEN the role is deleted', () => {
      test('THEN the rpc targets the role id', async () => {
        const { client } = primeSupabase([]);
        vi.mocked(client.rpc).mockResolvedValue({ data: null, error: null });

        await deleteWorkspaceRole('role-1');

        expect(client.rpc).toHaveBeenCalledExactlyOnceWith('delete_workspace_role', { p_role_id: 'role-1' });
      });
    });
  });

  describe('GIVEN a failing rpc', () => {
    describe('WHEN the role is deleted', () => {
      test('THEN the error propagates', async () => {
        const { client } = primeSupabase([]);
        vi.mocked(client.rpc).mockResolvedValue({ data: null, error: new Error('db down') });

        await expect(deleteWorkspaceRole('role-1')).rejects.toThrow('db down');
      });
    });
  });
});
