import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { MAX_NAME_LENGTH, WORKSPACE_INVITE_RATE_LIMIT_MAX_ATTEMPTS } from '@constants';
import { handleWorkspaceInvite } from '@api/server';
import { getAdminClient } from '@mocks/adminClient';
import { event } from '@mocks/events';
import { primeSupabase } from '@mocks/supabase';
import { createClient as createServerClient } from '@mocks/supabaseServer';

vi.mock('@/lib/supabase/server', () => import('@mocks/supabaseServer'));
vi.mock('@api/server/utils/adminClient', () => import('@mocks/adminClient'));
vi.mock('@/lib/events', () => import('@mocks/events'));

const inviteUserByEmail = vi.fn();

const adminRpc = vi.fn();

const deleteAllowance = vi.fn();

const adminFrom = vi.fn(() => ({ delete: () => ({ eq: deleteAllowance }) }));

const PERMISSION_DENIED = { message: 'permission denied', code: '42501' };

const inviteRequest = (body: unknown, headers?: Record<string, string>): Request =>
  new Request('http://localhost/api/auth/workspace-invite', {
    method: 'POST',
    headers,
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

const primeServer = (
  results: Array<{ data?: unknown; error?: unknown }>,
  user: { id: string; email?: string; user_metadata?: Record<string, unknown> } | null,
  rpcResults: Record<string, { data?: unknown; error?: unknown }> = {},
) => {
  const { client } = primeSupabase(results, { user });
  const responses: Record<string, { data?: unknown; error?: unknown }> = {
    get_workspace_invitations: { data: [] },
    create_workspace_invitation: { data: 'invitation-1' },
    ...rpcResults,
  };

  vi.mocked(client.rpc).mockImplementation(async (name) => ({ data: null, error: null, ...responses[name] }));
  vi.mocked(createServerClient).mockResolvedValue(client as never);
  adminRpc.mockResolvedValue({ data: null, error: null });
  deleteAllowance.mockResolvedValue({ data: null, error: null });
  vi.mocked(getAdminClient).mockReturnValue({
    rpc: adminRpc,
    from: adminFrom,
    auth: { admin: { inviteUserByEmail } },
  } as never);

  return client;
};

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3000');
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('handleWorkspaceInvite', () => {
  describe('GIVEN a signed-in inviter sending a malformed request body', () => {
    beforeEach(() => {
      primeServer([], { id: 'user-1' });
    });

    describe('WHEN the invite is submitted', () => {
      test('THEN the request is rejected', async () => {
        const response = await handleWorkspaceInvite(inviteRequest('not json'));

        expect(response.status).toBe(400);
        await expect(response.json()).resolves.toEqual({ error: { message: 'Invalid request' } });
      });
    });
  });

  describe('GIVEN a signed-in inviter sending a request without a workspace id', () => {
    beforeEach(() => {
      primeServer([], { id: 'user-1' });
    });

    describe('WHEN the invite is submitted', () => {
      test('THEN the request is rejected', async () => {
        const response = await handleWorkspaceInvite(inviteRequest({ email: 'a@b.dev', roleId: 'role-1' }));

        expect(response.status).toBe(400);
      });
    });
  });

  describe('GIVEN a signed-in inviter sending a request without an email', () => {
    beforeEach(() => {
      primeServer([], { id: 'user-1' });
    });

    describe('WHEN the invite is submitted', () => {
      test('THEN the request is rejected', async () => {
        const response = await handleWorkspaceInvite(inviteRequest({ workspaceId: 'ws-1', roleId: 'role-1' }));

        expect(response.status).toBe(400);
      });
    });
  });

  describe('GIVEN a signed-in inviter sending a request without a role id', () => {
    beforeEach(() => {
      primeServer([], { id: 'user-1' });
    });

    describe('WHEN the invite is submitted', () => {
      test('THEN the request is rejected', async () => {
        const response = await handleWorkspaceInvite(inviteRequest({ workspaceId: 'ws-1', email: 'a@b.dev' }));

        expect(response.status).toBe(400);
      });
    });
  });

  describe('GIVEN no authenticated user', () => {
    let client: ReturnType<typeof primeServer>;

    beforeEach(() => {
      client = primeServer([], null);
    });

    describe('WHEN the invite is submitted', () => {
      test('THEN the request is unauthorized and no invitation is created', async () => {
        const response = await handleWorkspaceInvite(
          inviteRequest({ workspaceId: 'ws-1', email: 'a@b.dev', roleId: 'role-1' }),
        );

        expect(response.status).toBe(401);
        expect(client.rpc).not.toHaveBeenCalled();
      });
    });

    describe('WHEN a malformed request body is submitted', () => {
      test('THEN the request is unauthorized before the body is validated', async () => {
        const response = await handleWorkspaceInvite(inviteRequest('not json'));

        expect(response.status).toBe(401);
        await expect(response.json()).resolves.toEqual({ error: { message: 'Unauthorized' } });
      });
    });
  });

  describe('GIVEN an inviter the database refuses to let manage members', () => {
    beforeEach(() => {
      primeServer(
        [],
        { id: 'user-1' },
        {
          get_workspace_invitations: { error: PERMISSION_DENIED },
          create_workspace_invitation: { error: PERMISSION_DENIED },
        },
      );
    });

    describe('WHEN the invite is submitted', () => {
      test('THEN the pg code maps to a forbidden response without the database message and no email is sent', async () => {
        const response = await handleWorkspaceInvite(
          inviteRequest({ workspaceId: 'ws-1', email: 'a@b.dev', roleId: 'role-1' }),
        );

        expect(response.status).toBe(403);
        await expect(response.json()).resolves.toEqual({
          error: { message: 'Invitation failed', code: '42501' },
        });
        expect(inviteUserByEmail).not.toHaveBeenCalled();
      });
    });
  });

  describe('GIVEN a workspace that already holds the maximum of pending invitations', () => {
    beforeEach(() => {
      primeServer(
        [],
        { id: 'user-cap' },
        {
          create_workspace_invitation: { error: { message: 'Too many pending invitations', code: '54000' } },
        },
      );
    });

    describe('WHEN another invite is submitted', () => {
      test('THEN the limit code reaches the client as a conflict and no email is sent', async () => {
        const response = await handleWorkspaceInvite(
          inviteRequest({ workspaceId: 'ws-1', email: 'one-too-many@acme.dev', roleId: 'role-1' }),
        );

        expect(response.status).toBe(409);
        await expect(response.json()).resolves.toEqual({ error: { message: 'Invitation failed', code: '54000' } });
        expect(inviteUserByEmail).not.toHaveBeenCalled();
      });
    });
  });

  describe('GIVEN an invitation rpc failing with an unknown code', () => {
    beforeEach(() => {
      primeServer([], { id: 'user-1' }, { create_workspace_invitation: { error: { message: 'boom', code: 'XX000' } } });
    });

    describe('WHEN the invite is submitted', () => {
      test('THEN the response falls back to a server error', async () => {
        const response = await handleWorkspaceInvite(
          inviteRequest({ workspaceId: 'ws-1', email: 'a@b.dev', roleId: 'role-1' }),
        );

        expect(response.status).toBe(500);
      });
    });
  });

  describe('GIVEN a named inviter and an existing workspace', () => {
    let client: ReturnType<typeof primeServer>;

    beforeEach(() => {
      client = primeServer([{ data: { name: 'Acme Space' } }], {
        id: 'user-1',
        email: 'owner@acme.dev',
        user_metadata: { name: 'Owner Name' },
      });
      inviteUserByEmail.mockResolvedValue({ data: {}, error: null });
    });

    describe('WHEN the invite is submitted', () => {
      test('THEN the invite email carries the workspace metadata', async () => {
        const response = await handleWorkspaceInvite(
          inviteRequest({ workspaceId: 'ws-1', email: 'teammate@acme.dev', roleId: 'role-1' }),
        );

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toEqual({ ok: true });
        expect(inviteUserByEmail.mock.calls).toEqual([
          [
            'teammate@acme.dev',
            {
              redirectTo: 'http://localhost:3000/join',
              data: {
                name: 'teammate',
                workspaceName: 'Acme Space',
                workspaceInitial: 'A',
                invitedByName: 'Owner Name',
              },
            },
          ],
        ]);
      });

      test('THEN a signup allowance for the invitee is granted before the invitation email is sent', async () => {
        await handleWorkspaceInvite(
          inviteRequest({ workspaceId: 'ws-1', email: 'teammate@acme.dev', roleId: 'role-1' }),
        );

        expect(adminRpc).toHaveBeenCalledExactlyOnceWith('grant_signup_allowance', { p_email: 'teammate@acme.dev' });
        expect(adminRpc.mock.invocationCallOrder[0]).toBeLessThan(inviteUserByEmail.mock.invocationCallOrder[0]!);
      });

      test('THEN the pending invitations are read before the invitation rpc receives the request payload', async () => {
        await handleWorkspaceInvite(
          inviteRequest({ workspaceId: 'ws-1', email: 'teammate@acme.dev', roleId: 'role-1' }),
        );

        expect(client.rpc.mock.calls).toEqual([
          ['get_workspace_invitations', { p_workspace_id: 'ws-1' }],
          [
            'create_workspace_invitation',
            { p_workspace_id: 'ws-1', p_email: 'teammate@acme.dev', p_role_id: 'role-1' },
          ],
        ]);
      });
    });
  });

  describe('GIVEN an inviter without a display name', () => {
    beforeEach(() => {
      primeServer([{ data: { name: 'Acme Space' } }], {
        id: 'user-1',
        email: 'owner@acme.dev',
        user_metadata: {},
      });
      inviteUserByEmail.mockResolvedValue({ data: {}, error: null });
    });

    describe('WHEN the invite is submitted', () => {
      test('THEN the email prefix stands in for the inviter name', async () => {
        await handleWorkspaceInvite(
          inviteRequest({ workspaceId: 'ws-1', email: 'teammate@acme.dev', roleId: 'role-1' }),
        );

        expect(inviteUserByEmail.mock.calls[0]?.[1].data.invitedByName).toBe('owner');
      });
    });
  });

  describe('GIVEN a workspace lookup without a row', () => {
    beforeEach(() => {
      primeServer([{ data: null }], { id: 'user-1', email: 'owner@acme.dev' });
      inviteUserByEmail.mockResolvedValue({ data: {}, error: null });
    });

    describe('WHEN the invite is submitted', () => {
      test('THEN the email falls back to an empty workspace name', async () => {
        await handleWorkspaceInvite(
          inviteRequest({ workspaceId: 'ws-1', email: 'teammate@acme.dev', roleId: 'role-1' }),
        );

        expect(inviteUserByEmail.mock.calls[0]?.[1].data).toMatchObject({ workspaceName: '', workspaceInitial: '' });
      });
    });
  });

  describe('GIVEN a workspace whose name starts with an emoji', () => {
    beforeEach(() => {
      primeServer([{ data: { name: '🚀 launch crew' } }], { id: 'user-emoji', email: 'owner@acme.dev' });
      inviteUserByEmail.mockResolvedValue({ data: {}, error: null });
    });

    describe('WHEN the invite is submitted', () => {
      test('THEN the email initial is the whole emoji instead of half of it', async () => {
        await handleWorkspaceInvite(
          inviteRequest({ workspaceId: 'ws-1', email: 'teammate@acme.dev', roleId: 'role-1' }),
        );

        expect(inviteUserByEmail.mock.calls[0]?.[1].data.workspaceInitial).toBe('🚀');
      });
    });
  });

  describe('GIVEN an invitee that already has an account', () => {
    let client: ReturnType<typeof primeServer>;

    beforeEach(() => {
      client = primeServer([{ data: { name: 'Acme Space' } }], { id: 'user-1', email: 'owner@acme.dev' });
      inviteUserByEmail.mockResolvedValue({
        data: null,
        error: { message: 'A user with this email address has already been registered', code: 'email_exists' },
      });
    });

    describe('WHEN the invite email is refused as already registered', () => {
      test('THEN the invitation still succeeds without a rollback', async () => {
        const response = await handleWorkspaceInvite(
          inviteRequest({ workspaceId: 'ws-1', email: 'teammate@acme.dev', roleId: 'role-1' }),
        );

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toEqual({ ok: true });
        expect(client.rpc).not.toHaveBeenCalledWith('revoke_workspace_invitation', expect.anything());
        expect(deleteAllowance).not.toHaveBeenCalled();
      });
    });
  });

  describe('GIVEN a new invitation whose email fails with a message that mentions an existing registration', () => {
    let client: ReturnType<typeof primeServer>;

    beforeEach(() => {
      client = primeServer([{ data: { name: 'Acme Space' } }], { id: 'user-1', email: 'owner@acme.dev' });
      inviteUserByEmail.mockResolvedValue({
        data: null,
        error: { message: 'Hook rejected the already registered domain', code: 'hook_timeout' },
      });
    });

    describe('WHEN the invite is submitted', () => {
      test('THEN only the error code decides and the failure is answered with a rollback', async () => {
        const response = await handleWorkspaceInvite(
          inviteRequest({ workspaceId: 'ws-1', email: 'teammate@acme.dev', roleId: 'role-1' }),
        );

        expect(response.status).toBe(502);
        expect(client.rpc).toHaveBeenCalledWith('revoke_workspace_invitation', { p_invitation_id: 'invitation-1' });
      });
    });
  });

  describe('GIVEN a new invitation whose email fails', () => {
    let client: ReturnType<typeof primeServer>;

    beforeEach(() => {
      client = primeServer([{ data: { name: 'Acme Space' } }], { id: 'user-1', email: 'owner@acme.dev' });
      inviteUserByEmail.mockResolvedValue({
        data: null,
        error: { message: 'Email rate limit exceeded', code: 'over_email_send_rate_limit' },
      });
    });

    describe('WHEN the invite is submitted', () => {
      test('THEN the invitation is rolled back and a generic failure keeps the provider code but not its message', async () => {
        const response = await handleWorkspaceInvite(
          inviteRequest({ workspaceId: 'ws-1', email: 'teammate@acme.dev', roleId: 'role-1' }),
        );

        expect(response.status).toBe(502);
        await expect(response.json()).resolves.toEqual({
          error: { message: 'Invitation email failed', code: 'over_email_send_rate_limit' },
        });
        expect(client.rpc).toHaveBeenCalledWith('revoke_workspace_invitation', { p_invitation_id: 'invitation-1' });
      });

      test('THEN the signup allowance granted for the invitee is withdrawn', async () => {
        await handleWorkspaceInvite(
          inviteRequest({ workspaceId: 'ws-1', email: 'teammate@acme.dev', roleId: 'role-1' }),
        );

        expect(adminFrom).toHaveBeenCalledExactlyOnceWith('signup_allowances');
        expect(deleteAllowance).toHaveBeenCalledExactlyOnceWith('email', 'teammate@acme.dev');
      });
    });
  });

  describe('GIVEN a new invitation whose email fails and whose signup allowance cannot be withdrawn', () => {
    const failure = { message: 'admin api unavailable', code: '08006' };

    beforeEach(() => {
      primeServer([{ data: { name: 'Acme Space' } }], { id: 'user-1', email: 'owner@acme.dev' });
      inviteUserByEmail.mockResolvedValue({
        data: null,
        error: { message: 'smtp unreachable', code: 'unexpected_failure' },
      });
      deleteAllowance.mockResolvedValue({ data: null, error: failure });
    });

    describe('WHEN the invite is submitted', () => {
      test('THEN the failed withdrawal is reported quietly and the answer stays the failed email', async () => {
        const response = await handleWorkspaceInvite(
          inviteRequest({ workspaceId: 'ws-1', email: 'teammate@acme.dev', roleId: 'role-1' }),
        );

        expect(response.status).toBe(502);
        await expect(response.json()).resolves.toEqual({
          error: { message: 'Invitation email failed', code: 'unexpected_failure' },
        });
        expect(event.error).toHaveBeenCalledWith(failure, { toast: false, context: 'workspace.revokeSignupAllowance' });
      });
    });
  });

  describe('GIVEN a new invitation whose signup allowance cannot be granted', () => {
    const failure = { message: 'relation does not exist', code: '42P01' };
    let client: ReturnType<typeof primeServer>;

    beforeEach(() => {
      client = primeServer([{ data: { name: 'Acme Space' } }], { id: 'user-allowance', email: 'owner@acme.dev' });
      adminRpc.mockResolvedValue({ data: null, error: failure });
    });

    describe('WHEN the invite is submitted', () => {
      test('THEN no email is sent, the invitation is rolled back and the failure answers like a failed email', async () => {
        const response = await handleWorkspaceInvite(
          inviteRequest({ workspaceId: 'ws-1', email: 'teammate@acme.dev', roleId: 'role-1' }),
        );

        expect(response.status).toBe(502);
        await expect(response.json()).resolves.toEqual({
          error: { message: 'Invitation email failed', code: '42P01' },
        });
        expect(inviteUserByEmail).not.toHaveBeenCalled();
        expect(client.rpc).toHaveBeenCalledWith('revoke_workspace_invitation', { p_invitation_id: 'invitation-1' });
        expect(event.error).toHaveBeenCalledExactlyOnceWith(failure, {
          toast: false,
          context: 'workspace.grantSignupAllowance',
        });
      });
    });
  });

  describe('GIVEN a pending invitation that is sent again while the email fails', () => {
    let client: ReturnType<typeof primeServer>;

    beforeEach(() => {
      client = primeServer(
        [{ data: { name: 'Acme Space' } }],
        { id: 'user-resend', email: 'owner@acme.dev' },
        {
          get_workspace_invitations: { data: [{ id: 'invitation-1', email: 'teammate@acme.dev' }] },
        },
      );
      inviteUserByEmail.mockResolvedValue({ data: null, error: { message: 'Email rate limit exceeded' } });
    });

    describe('WHEN the invite is submitted', () => {
      test('THEN the failure surfaces and the invitation that existed before stays pending', async () => {
        const response = await handleWorkspaceInvite(
          inviteRequest({ workspaceId: 'ws-1', email: 'teammate@acme.dev', roleId: 'role-1' }),
        );

        expect(response.status).toBe(502);
        expect(client.rpc).not.toHaveBeenCalledWith('revoke_workspace_invitation', expect.anything());
        expect(event.error).toHaveBeenCalledExactlyOnceWith(
          { message: 'Email rate limit exceeded' },
          { toast: false, context: 'workspace.sendInviteEmail' },
        );
      });
    });
  });

  describe('GIVEN a new invitation whose email fails and whose rollback fails', () => {
    beforeEach(() => {
      primeServer(
        [{ data: { name: 'Acme Space' } }],
        { id: 'user-1', email: 'owner@acme.dev' },
        {
          revoke_workspace_invitation: { error: { message: 'revoke failed' } },
        },
      );
      inviteUserByEmail.mockResolvedValue({ data: null, error: { message: 'smtp unreachable' } });
    });

    describe('WHEN the invite is submitted', () => {
      test('THEN both failures are reported and the response stays a bad gateway', async () => {
        const response = await handleWorkspaceInvite(
          inviteRequest({ workspaceId: 'ws-1', email: 'teammate@acme.dev', roleId: 'role-1' }),
        );

        expect(response.status).toBe(502);
        expect(vi.mocked(event.error).mock.calls).toEqual([
          [{ message: 'smtp unreachable' }, { toast: false, context: 'workspace.sendInviteEmail' }],
          [{ message: 'revoke failed' }, { toast: false, context: 'workspace.rollbackInvitation' }],
        ]);
      });
    });
  });

  describe('GIVEN a request sent from another site', () => {
    let client: ReturnType<typeof primeServer>;

    beforeEach(() => {
      client = primeServer([], { id: 'user-1' });
    });

    describe('WHEN the browser marks the request as cross-site', () => {
      test('THEN the request is forbidden before any invitation is created', async () => {
        const response = await handleWorkspaceInvite(
          inviteRequest(
            { workspaceId: 'ws-1', email: 'a@b.dev', roleId: 'role-1' },
            { 'sec-fetch-site': 'cross-site' },
          ),
        );

        expect(response.status).toBe(403);
        expect(client.rpc).not.toHaveBeenCalled();
        expect(inviteUserByEmail).not.toHaveBeenCalled();
      });
    });

    describe('WHEN only a foreign origin header identifies the caller', () => {
      test('THEN the request is forbidden', async () => {
        const response = await handleWorkspaceInvite(
          inviteRequest(
            { workspaceId: 'ws-1', email: 'a@b.dev', roleId: 'role-1' },
            { origin: 'https://evil.example', host: 'localhost' },
          ),
        );

        expect(response.status).toBe(403);
        expect(client.rpc).not.toHaveBeenCalled();
      });
    });
  });

  describe('GIVEN an inviter and a workspace whose names carry markup, tabs and padding', () => {
    beforeEach(() => {
      primeServer([{ data: { name: `<b>Acme</b>\tLabs\n\t Space ${'x'.repeat(100)}` } }], {
        id: 'user-markup',
        email: 'owner@acme.dev',
        user_metadata: { name: '<a href="https://evil.example">Support</a>' },
      });
      inviteUserByEmail.mockResolvedValue({ data: {}, error: null });
    });

    describe('WHEN the invite is submitted', () => {
      test('THEN the names keep their characters for the escaping email template, with whitespace collapsed and the length capped', async () => {
        await handleWorkspaceInvite(
          inviteRequest({ workspaceId: 'ws-1', email: 'teammate@acme.dev', roleId: 'role-1' }),
        );

        const data = inviteUserByEmail.mock.calls[0]?.[1].data;

        expect(data.workspaceName).toBe(`<b>Acme</b> Labs Space ${'x'.repeat(100)}`.slice(0, MAX_NAME_LENGTH));
        expect(data.invitedByName).toBe('<a href="https://evil.example">Support</a>');
      });
    });
  });

  describe('GIVEN an inviter name with bidi controls and a workspace name cut inside an emoji', () => {
    beforeEach(() => {
      primeServer([{ data: { name: `${'x'.repeat(MAX_NAME_LENGTH - 1)}🚀 tail` } }], {
        id: 'user-bidi',
        email: 'owner@acme.dev',
        user_metadata: { name: 'Support\u202Emoc.lapyap\u2066\u200F' },
      });
      inviteUserByEmail.mockResolvedValue({ data: {}, error: null });
    });

    describe('WHEN the invite is submitted', () => {
      test('THEN the bidi controls are dropped and the length cap keeps the emoji whole', async () => {
        await handleWorkspaceInvite(
          inviteRequest({ workspaceId: 'ws-1', email: 'teammate@acme.dev', roleId: 'role-1' }),
        );

        const data = inviteUserByEmail.mock.calls[0]?.[1].data;

        expect(data.invitedByName).toBe('Supportmoc.lapyap');
        expect(data.workspaceName).toBe(`${'x'.repeat(MAX_NAME_LENGTH - 1)}🚀`);
      });
    });
  });

  describe('GIVEN an inviter whose metadata name is not a string', () => {
    beforeEach(() => {
      primeServer([{ data: { name: 'Acme Space' } }], {
        id: 'user-object-name',
        email: 'owner@acme.dev',
        user_metadata: { name: { first: 'Owner' } },
      });
      inviteUserByEmail.mockResolvedValue({ data: {}, error: null });
    });

    describe('WHEN the invite is submitted', () => {
      test('THEN the email prefix stands in for the inviter name', async () => {
        const response = await handleWorkspaceInvite(
          inviteRequest({ workspaceId: 'ws-1', email: 'teammate@acme.dev', roleId: 'role-1' }),
        );

        expect(response.status).toBe(200);
        expect(inviteUserByEmail.mock.calls[0]?.[1].data.invitedByName).toBe('owner');
      });
    });
  });

  describe('GIVEN a signed-in inviter sending a request with a malformed email', () => {
    beforeEach(() => {
      primeServer([], { id: 'user-1' });
    });

    describe('WHEN the invite is submitted', () => {
      test('THEN the request is rejected', async () => {
        const response = await handleWorkspaceInvite(
          inviteRequest({ workspaceId: 'ws-1', email: 'not an email', roleId: 'role-1' }),
        );

        expect(response.status).toBe(400);
      });
    });
  });

  describe('GIVEN a same-origin request with a mixed-case email', () => {
    let client: ReturnType<typeof primeServer>;

    beforeEach(() => {
      client = primeServer([{ data: { name: 'Acme Space' } }], { id: 'user-case', email: 'owner@acme.dev' });
      inviteUserByEmail.mockResolvedValue({ data: {}, error: null });
    });

    describe('WHEN the invite is submitted', () => {
      test('THEN the invitation and the email use the normalized address', async () => {
        const response = await handleWorkspaceInvite(
          inviteRequest(
            { workspaceId: 'ws-1', email: '  TeamMate@Acme.dev ', roleId: 'role-1' },
            { 'sec-fetch-site': 'same-origin' },
          ),
        );

        expect(response.status).toBe(200);
        expect(client.rpc).toHaveBeenCalledWith(
          'create_workspace_invitation',
          expect.objectContaining({ p_email: 'teammate@acme.dev' }),
        );
        expect(inviteUserByEmail.mock.calls[0]?.[0]).toBe('teammate@acme.dev');
      });
    });
  });

  describe('GIVEN an inviter who exhausted the invitation rate limit', () => {
    beforeEach(async () => {
      primeServer([{ data: { name: 'Acme Space' } }], { id: 'user-flood', email: 'owner@acme.dev' });
      inviteUserByEmail.mockResolvedValue({ data: {}, error: null });
      await Promise.all(
        Array.from({ length: WORKSPACE_INVITE_RATE_LIMIT_MAX_ATTEMPTS }, (_, index) =>
          handleWorkspaceInvite(
            inviteRequest({ workspaceId: 'ws-1', email: `guest${index}@acme.dev`, roleId: 'role-1' }),
          ),
        ),
      );
      inviteUserByEmail.mockClear();
    });

    describe('WHEN another invite is submitted', () => {
      test('THEN the request is throttled and no email is sent', async () => {
        const response = await handleWorkspaceInvite(
          inviteRequest({ workspaceId: 'ws-1', email: 'one-more@acme.dev', roleId: 'role-1' }),
        );

        expect(response.status).toBe(429);
        expect(inviteUserByEmail).not.toHaveBeenCalled();
      });
    });
  });
});
