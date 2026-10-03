import { afterEach, describe, expect, test, vi } from 'vitest';

import {
  acceptWorkspaceInvitation,
  createWorkspaceInvitation,
  declineWorkspaceInvitation,
  getMyInvitations,
  getWorkspaceInvitations,
  revokeWorkspaceInvitation,
} from '@api/client';
import { primeFetch } from '@mocks/fetch';
import { myInvitationRow, workspaceInvitationRow } from '@mocks/rows';
import { primeSupabase } from '@mocks/supabase';

vi.mock('@/lib/supabase', () => import('@mocks/supabase'));

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('getWorkspaceInvitations', () => {
  describe('GIVEN stored invitations for the workspace', () => {
    describe('WHEN the invitations are fetched', () => {
      test('THEN the rows map through the invitation mapper', async () => {
        const { client } = primeSupabase([]);
        vi.mocked(client.rpc).mockResolvedValue({ data: [workspaceInvitationRow()], error: null });

        await expect(getWorkspaceInvitations('ws-1')).resolves.toEqual([
          {
            id: 'inv-1',
            email: 'invitee@example.com',
            roleId: 'role-1',
            roleKey: 'member',
            roleName: 'Member',
            createdAt: '2026-01-01T00:00:00Z',
          },
        ]);
      });
    });
  });

  describe('GIVEN no stored invitations', () => {
    describe('WHEN the invitations are fetched', () => {
      test('THEN an empty list is returned', async () => {
        const { client } = primeSupabase([]);
        vi.mocked(client.rpc).mockResolvedValue({ data: null, error: null });

        await expect(getWorkspaceInvitations('ws-1')).resolves.toEqual([]);
      });
    });
  });

  describe('GIVEN a failing rpc', () => {
    describe('WHEN the invitations are fetched', () => {
      test('THEN the error propagates', async () => {
        const { client } = primeSupabase([]);
        vi.mocked(client.rpc).mockResolvedValue({ data: null, error: new Error('db down') });

        await expect(getWorkspaceInvitations('ws-1')).rejects.toThrow('db down');
      });
    });
  });
});

describe('createWorkspaceInvitation', () => {
  describe('GIVEN the invite route accepts the invitation', () => {
    describe('WHEN a teammate is invited', () => {
      test('THEN the invitation is posted as json', async () => {
        const fetchSpy = primeFetch(200, { ok: true });

        await createWorkspaceInvitation('ws-1', 'teammate@acme.dev', 'role-1');

        expect(fetchSpy).toHaveBeenCalledExactlyOnceWith('/auth/workspace-invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workspaceId: 'ws-1', email: 'teammate@acme.dev', roleId: 'role-1' }),
        });
      });
    });
  });

  describe('GIVEN the invite route refuses the invitation', () => {
    describe('WHEN a teammate is invited', () => {
      test('THEN the invitation fails with the response status and pg code', async () => {
        primeFetch(403, { error: { message: 'Invitation failed', code: '42501' } });

        await expect(createWorkspaceInvitation('ws-1', 'teammate@acme.dev', 'role-1')).rejects.toMatchObject({
          message: 'Invitation failed',
          status: 403,
          code: '42501',
        });
      });
    });
  });
});

describe('revokeWorkspaceInvitation', () => {
  describe('GIVEN an existing invitation', () => {
    describe('WHEN the invitation is revoked', () => {
      test('THEN the rpc targets the invitation id', async () => {
        const { client } = primeSupabase([]);
        vi.mocked(client.rpc).mockResolvedValue({ data: null, error: null });

        await revokeWorkspaceInvitation('inv-1');

        expect(client.rpc).toHaveBeenCalledExactlyOnceWith('revoke_workspace_invitation', { p_invitation_id: 'inv-1' });
      });
    });
  });

  describe('GIVEN a failing rpc', () => {
    describe('WHEN the invitation is revoked', () => {
      test('THEN the error propagates', async () => {
        const { client } = primeSupabase([]);
        vi.mocked(client.rpc).mockResolvedValue({ data: null, error: new Error('db down') });

        await expect(revokeWorkspaceInvitation('inv-1')).rejects.toThrow('db down');
      });
    });
  });
});

describe('getMyInvitations', () => {
  describe('GIVEN pending invitations for the user', () => {
    describe('WHEN the invitations are fetched', () => {
      test('THEN the rows map through the my-invitation mapper', async () => {
        const { client } = primeSupabase([]);
        vi.mocked(client.rpc).mockResolvedValue({ data: [myInvitationRow()], error: null });

        await expect(getMyInvitations()).resolves.toEqual([
          {
            id: 'inv-1',
            workspaceId: 'ws-1',
            workspaceName: 'Workspace',
            roleKey: 'member',
            roleName: 'Member',
            invitedByName: 'Owner',
            createdAt: '2026-01-01T00:00:00Z',
          },
        ]);
      });
    });
  });

  describe('GIVEN no pending invitations', () => {
    describe('WHEN the invitations are fetched', () => {
      test('THEN an empty list is returned', async () => {
        const { client } = primeSupabase([]);
        vi.mocked(client.rpc).mockResolvedValue({ data: null, error: null });

        await expect(getMyInvitations()).resolves.toEqual([]);
      });
    });
  });

  describe('GIVEN a failing rpc', () => {
    describe('WHEN the invitations are fetched', () => {
      test('THEN the error propagates', async () => {
        const { client } = primeSupabase([]);
        vi.mocked(client.rpc).mockResolvedValue({ data: null, error: new Error('db down') });

        await expect(getMyInvitations()).rejects.toThrow('db down');
      });
    });
  });
});

describe('acceptWorkspaceInvitation', () => {
  describe('GIVEN a pending invitation', () => {
    describe('WHEN the invitation is accepted', () => {
      test('THEN the rpc targets the invitation id', async () => {
        const { client } = primeSupabase([]);
        vi.mocked(client.rpc).mockResolvedValue({ data: null, error: null });

        await acceptWorkspaceInvitation('inv-1');

        expect(client.rpc).toHaveBeenCalledExactlyOnceWith('accept_workspace_invitation', { p_invitation_id: 'inv-1' });
      });
    });
  });

  describe('GIVEN a failing rpc', () => {
    describe('WHEN the invitation is accepted', () => {
      test('THEN the error propagates', async () => {
        const { client } = primeSupabase([]);
        vi.mocked(client.rpc).mockResolvedValue({ data: null, error: new Error('db down') });

        await expect(acceptWorkspaceInvitation('inv-1')).rejects.toThrow('db down');
      });
    });
  });
});

describe('declineWorkspaceInvitation', () => {
  describe('GIVEN a pending invitation', () => {
    describe('WHEN the invitation is declined', () => {
      test('THEN the rpc targets the invitation id', async () => {
        const { client } = primeSupabase([]);
        vi.mocked(client.rpc).mockResolvedValue({ data: null, error: null });

        await declineWorkspaceInvitation('inv-1');

        expect(client.rpc).toHaveBeenCalledExactlyOnceWith('decline_workspace_invitation', {
          p_invitation_id: 'inv-1',
        });
      });
    });
  });

  describe('GIVEN a failing rpc', () => {
    describe('WHEN the invitation is declined', () => {
      test('THEN the error propagates', async () => {
        const { client } = primeSupabase([]);
        vi.mocked(client.rpc).mockResolvedValue({ data: null, error: new Error('db down') });

        await expect(declineWorkspaceInvitation('inv-1')).rejects.toThrow('db down');
      });
    });
  });
});
