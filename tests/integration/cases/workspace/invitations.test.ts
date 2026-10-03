import type { SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'vitest';

import {
  CONCURRENT_INVITATIONS,
  DAY_MS,
  EMAIL_LENGTH_CAP,
  INTEGRATION_ACCOUNT_DOMAIN,
  NAME_LENGTH_CAP,
  PENDING_INVITATION_CAP,
} from '../../consts';
import type { IIntegrationAccount, IIntegrationResponse, IIntegrationWorkspace } from '../../interfaces';
import {
  countPendingInvitations,
  deleteAccounts,
  deleteInvitations,
  getRoleId,
  getUserClient,
  isMember,
  readInvitation,
  readInvitationByEmail,
  readInvitationExpiry,
  readMemberRole,
  removeMember,
  seedAccount,
  seedInvitation,
  seedInvitations,
  seedMemberWithRole,
  seedRole,
  seedWorkspace,
  setAccountMetadata,
  uniqueLabel,
} from '../../utils';

let owner: IIntegrationAccount;
let manager: IIntegrationAccount;
let member: IIntegrationAccount;
let invitee: IIntegrationAccount;
let ownerClient: SupabaseClient;
let managerClient: SupabaseClient;
let memberClient: SupabaseClient;
let inviteeClient: SupabaseClient;
let workspace: IIntegrationWorkspace;
let memberRoleId: string;

beforeAll(async () => {
  [owner, manager, member, invitee] = await Promise.all([
    seedAccount('owner'),
    seedAccount('manager'),
    seedAccount('member'),
    seedAccount('invitee'),
  ]);
  workspace = await seedWorkspace(owner.id, uniqueLabel('invitations'));
  memberRoleId = await getRoleId(workspace.id, 'member');
  const managerRoleId = await seedRole(workspace.id, 'People manager', {
    canEditCanvas: true,
    canComment: true,
    canManageStructure: true,
    canManageMembers: true,
  });
  await Promise.all([
    seedMemberWithRole(workspace.id, manager.id, managerRoleId),
    seedMemberWithRole(workspace.id, member.id, memberRoleId),
  ]);
  [ownerClient, managerClient, memberClient, inviteeClient] = await Promise.all([
    getUserClient(owner),
    getUserClient(manager),
    getUserClient(member),
    getUserClient(invitee),
  ]);
});

afterAll(async () => {
  await deleteAccounts(invitee, member, manager, owner);
});

describe('workspace_invitations', () => {
  describe('GIVEN a pending invitation in the workspace', () => {
    let invitationId: string;
    let ownerRoleId: string;

    beforeEach(async () => {
      invitationId = await seedInvitation(
        workspace.id,
        `${uniqueLabel('pending')}@${INTEGRATION_ACCOUNT_DOMAIN}`,
        memberRoleId,
      );
      ownerRoleId = await getRoleId(workspace.id, 'owner');
    });

    describe('WHEN the manager re-points it at the owner role directly', () => {
      let response: IIntegrationResponse;

      beforeEach(async () => {
        response = await managerClient
          .from('workspace_invitations')
          .update({ role_id: ownerRoleId })
          .eq('id', invitationId);
      });

      test('THEN the table privilege is missing and the role stays', async () => {
        expect(response.error?.code).toBe('42501');
        await expect(readInvitation(invitationId)).resolves.toMatchObject({ role_id: memberRoleId });
      });
    });

    describe('WHEN a member selects the invitations table', () => {
      let response: IIntegrationResponse<unknown[]>;

      beforeEach(async () => {
        response = await memberClient.from('workspace_invitations').select('id').eq('workspace_id', workspace.id);
      });

      test('THEN no rows are visible without a select policy', () => {
        expect(response.error).toBeNull();
        expect(response.data).toEqual([]);
      });
    });

    describe('WHEN a member inserts an invitation directly', () => {
      let response: IIntegrationResponse;

      beforeEach(async () => {
        response = await memberClient.from('workspace_invitations').insert({
          workspace_id: workspace.id,
          email: `direct@${INTEGRATION_ACCOUNT_DOMAIN}`,
          role_id: memberRoleId,
        });
      });

      test('THEN the insert is denied by row level security', () => {
        expect(response.error?.code).toBe('42501');
      });
    });
  });
});

describe('create_workspace_invitation', () => {
  describe('GIVEN a member without member management permission', () => {
    describe('WHEN they invite an email', () => {
      let response: IIntegrationResponse;

      beforeEach(async () => {
        response = await memberClient.rpc('create_workspace_invitation', {
          p_workspace_id: workspace.id,
          p_email: `${uniqueLabel('nope')}@${INTEGRATION_ACCOUNT_DOMAIN}`,
          p_role_id: memberRoleId,
        });
      });

      test('THEN the call is denied', () => {
        expect(response.error?.code).toBe('42501');
      });
    });
  });

  describe('GIVEN a people manager', () => {
    describe('WHEN they invite a valid email', () => {
      let response: IIntegrationResponse<string>;

      beforeEach(async () => {
        response = await managerClient.rpc('create_workspace_invitation', {
          p_workspace_id: workspace.id,
          p_email: `${uniqueLabel('welcome')}@${INTEGRATION_ACCOUNT_DOMAIN}`,
          p_role_id: memberRoleId,
        });
      });

      test('THEN the invitation is stored as pending', async () => {
        expect(response.error).toBeNull();
        await expect(readInvitation(response.data!)).resolves.toMatchObject({ status: 'pending' });
      });

      test('THEN the invitation expires in fourteen days', async () => {
        await expect(readInvitationExpiry(response.data!)).resolves.toBeGreaterThan(Date.now() + 13 * DAY_MS);
        await expect(readInvitationExpiry(response.data!)).resolves.toBeLessThan(Date.now() + 15 * DAY_MS);
      });
    });

    describe('WHEN they invite a malformed email', () => {
      let response: IIntegrationResponse;

      beforeEach(async () => {
        response = await managerClient.rpc('create_workspace_invitation', {
          p_workspace_id: workspace.id,
          p_email: 'not-an-email',
          p_role_id: memberRoleId,
        });
      });

      test('THEN the email is rejected as invalid', () => {
        expect(response.error?.code).toBe('22023');
      });
    });

    describe('WHEN they invite an email past the database length cap', () => {
      let email: string;
      let response: IIntegrationResponse;

      beforeEach(async () => {
        email = `${'e'.repeat(EMAIL_LENGTH_CAP - INTEGRATION_ACCOUNT_DOMAIN.length)}@${INTEGRATION_ACCOUNT_DOMAIN}`;
        response = await managerClient.rpc('create_workspace_invitation', {
          p_workspace_id: workspace.id,
          p_email: email,
          p_role_id: memberRoleId,
        });
      });

      test('THEN the check constraint rejects it and nothing is stored', async () => {
        expect(response.error?.code).toBe('23514');
        await expect(readInvitationByEmail(workspace.id, email)).resolves.toBeNull();
      });
    });

    describe('WHEN they invite someone into the owner role', () => {
      let response: IIntegrationResponse;

      beforeEach(async () => {
        const ownerRoleId = await getRoleId(workspace.id, 'owner');
        response = await managerClient.rpc('create_workspace_invitation', {
          p_workspace_id: workspace.id,
          p_email: `${uniqueLabel('usurper')}@${INTEGRATION_ACCOUNT_DOMAIN}`,
          p_role_id: ownerRoleId,
        });
      });

      test('THEN inviting as owner is refused', () => {
        expect(response.error?.code).toBe('22023');
        expect(response.error?.message).toMatch(/owner/);
      });
    });

    describe("WHEN they invite an existing member's email", () => {
      let response: IIntegrationResponse;

      beforeEach(async () => {
        response = await managerClient.rpc('create_workspace_invitation', {
          p_workspace_id: workspace.id,
          p_email: member.email,
          p_role_id: memberRoleId,
        });
      });

      test('THEN the duplicate membership is reported', () => {
        expect(response.error?.code).toBe('23505');
      });
    });
  });

  describe('GIVEN a role above the people manager ceiling', () => {
    let stewardRoleId: string;
    let stewardEmail: string;

    beforeEach(async () => {
      stewardRoleId = await seedRole(workspace.id, uniqueLabel('Steward'), { canManageRoles: true });
      stewardEmail = `${uniqueLabel('steward')}@${INTEGRATION_ACCOUNT_DOMAIN}`;
    });

    describe('WHEN the manager invites someone into it', () => {
      let response: IIntegrationResponse;

      beforeEach(async () => {
        response = await managerClient.rpc('create_workspace_invitation', {
          p_workspace_id: workspace.id,
          p_email: stewardEmail,
          p_role_id: stewardRoleId,
        });
      });

      test('THEN the grant ceiling rejects the invitation and nothing is stored', async () => {
        expect(response.error?.code).toBe('42501');
        expect(response.error?.message).toMatch(/permissions you do not have/);
        await expect(readInvitationByEmail(workspace.id, stewardEmail)).resolves.toBeNull();
      });
    });

    describe('WHEN the owner invites someone into it', () => {
      let response: IIntegrationResponse<string>;

      beforeEach(async () => {
        response = await ownerClient.rpc('create_workspace_invitation', {
          p_workspace_id: workspace.id,
          p_email: stewardEmail,
          p_role_id: stewardRoleId,
        });
      });

      test('THEN the owner bypasses the ceiling', async () => {
        expect(response.error).toBeNull();
        await expect(readInvitation(response.data!)).resolves.toMatchObject({ status: 'pending' });
      });
    });
  });

  describe('GIVEN a pending invitation carrying a role above the people manager ceiling', () => {
    let stewardRoleId: string;
    let pendingEmail: string;
    let invitationId: string;

    beforeEach(async () => {
      stewardRoleId = await seedRole(workspace.id, uniqueLabel('Steward'), { canManageRoles: true });
      pendingEmail = `${uniqueLabel('pending-steward')}@${INTEGRATION_ACCOUNT_DOMAIN}`;
      invitationId = await seedInvitation(workspace.id, pendingEmail, stewardRoleId);
    });

    describe('WHEN the manager re-invites the address into a role within their ceiling', () => {
      let response: IIntegrationResponse;

      beforeEach(async () => {
        response = await managerClient.rpc('create_workspace_invitation', {
          p_workspace_id: workspace.id,
          p_email: pendingEmail,
          p_role_id: memberRoleId,
        });
      });

      test('THEN the re-invite is denied and the stored role stays', async () => {
        expect(response.error?.code).toBe('42501');
        expect(response.error?.message).toMatch(/permissions you do not have/);
        await expect(readInvitation(invitationId)).resolves.toMatchObject({ role_id: stewardRoleId });
      });
    });

    describe('WHEN the owner re-invites the address into another role', () => {
      let response: IIntegrationResponse<string>;

      beforeEach(async () => {
        response = await ownerClient.rpc('create_workspace_invitation', {
          p_workspace_id: workspace.id,
          p_email: pendingEmail,
          p_role_id: memberRoleId,
        });
      });

      test('THEN the owner bypasses the ceiling and the stored role is replaced', async () => {
        expect(response.error).toBeNull();
        expect(response.data).toBe(invitationId);
        await expect(readInvitation(invitationId)).resolves.toMatchObject({ role_id: memberRoleId });
      });
    });
  });

  describe('GIVEN a pending invitation carrying a role within the people manager ceiling', () => {
    let viewerRoleId: string;
    let pendingEmail: string;
    let invitationId: string;

    beforeEach(async () => {
      viewerRoleId = await getRoleId(workspace.id, 'viewer');
      pendingEmail = `${uniqueLabel('pending-member')}@${INTEGRATION_ACCOUNT_DOMAIN}`;
      invitationId = await seedInvitation(workspace.id, pendingEmail, memberRoleId);
    });

    describe('WHEN the manager re-invites the address into another role within their ceiling', () => {
      let response: IIntegrationResponse<string>;

      beforeEach(async () => {
        response = await managerClient.rpc('create_workspace_invitation', {
          p_workspace_id: workspace.id,
          p_email: pendingEmail,
          p_role_id: viewerRoleId,
        });
      });

      test('THEN the pending invitation switches to the new role', async () => {
        expect(response.error).toBeNull();
        expect(response.data).toBe(invitationId);
        await expect(readInvitation(invitationId)).resolves.toMatchObject({ role_id: viewerRoleId });
      });
    });
  });

  describe('GIVEN an expired invitation', () => {
    let expiredEmail: string;
    let invitationId: string;

    beforeEach(async () => {
      expiredEmail = `${uniqueLabel('expired')}@${INTEGRATION_ACCOUNT_DOMAIN}`;
      invitationId = await seedInvitation(workspace.id, expiredEmail, memberRoleId, {
        expiresAt: new Date(Date.now() - DAY_MS),
      });
    });

    describe('WHEN the manager invites the address again', () => {
      let response: IIntegrationResponse<string>;

      beforeEach(async () => {
        response = await managerClient.rpc('create_workspace_invitation', {
          p_workspace_id: workspace.id,
          p_email: expiredEmail,
          p_role_id: memberRoleId,
        });
      });

      test('THEN the same invitation is pending for another fourteen days', async () => {
        expect(response.error).toBeNull();
        expect(response.data).toBe(invitationId);
        await expect(readInvitationExpiry(invitationId)).resolves.toBeGreaterThan(Date.now() + 13 * DAY_MS);
      });
    });
  });

  describe('GIVEN an expired invitation carrying a role above the people manager ceiling', () => {
    let expiredEmail: string;
    let invitationId: string;

    beforeEach(async () => {
      const stewardRoleId = await seedRole(workspace.id, uniqueLabel('Steward'), { canManageRoles: true });
      expiredEmail = `${uniqueLabel('expired-steward')}@${INTEGRATION_ACCOUNT_DOMAIN}`;
      invitationId = await seedInvitation(workspace.id, expiredEmail, stewardRoleId, {
        expiresAt: new Date(Date.now() - DAY_MS),
      });
    });

    describe('WHEN the manager invites the address into a role within their ceiling', () => {
      let response: IIntegrationResponse<string>;

      beforeEach(async () => {
        response = await managerClient.rpc('create_workspace_invitation', {
          p_workspace_id: workspace.id,
          p_email: expiredEmail,
          p_role_id: memberRoleId,
        });
      });

      test('THEN the expired invitation no longer blocks the new role', async () => {
        expect(response.error).toBeNull();
        await expect(readInvitation(invitationId)).resolves.toMatchObject({ role_id: memberRoleId });
      });
    });
  });

  describe('GIVEN a workspace whose pending invitations reach the cap', () => {
    let capWorkspace: IIntegrationWorkspace;
    let capRoleId: string;
    let pendingEmail: string;
    let pendingInvitationId: string;

    beforeEach(async () => {
      capWorkspace = await seedWorkspace(owner.id, uniqueLabel('invitation-cap'));
      capRoleId = await getRoleId(capWorkspace.id, 'member');
      pendingEmail = `${uniqueLabel('pending-at-cap')}@${INTEGRATION_ACCOUNT_DOMAIN}`;
      await seedInvitations(capWorkspace.id, PENDING_INVITATION_CAP - 1, capRoleId);
      pendingInvitationId = await seedInvitation(capWorkspace.id, pendingEmail, capRoleId, {
        expiresAt: new Date(Date.now() + DAY_MS),
      });
    });

    describe('WHEN the owner invites one more address', () => {
      let email: string;
      let response: IIntegrationResponse;

      beforeEach(async () => {
        email = `${uniqueLabel('one-too-many')}@${INTEGRATION_ACCOUNT_DOMAIN}`;
        response = await ownerClient.rpc('create_workspace_invitation', {
          p_workspace_id: capWorkspace.id,
          p_email: email,
          p_role_id: capRoleId,
        });
      });

      test('THEN the cap refuses it and nothing is stored', async () => {
        expect(response.error?.code).toBe('54000');
        await expect(readInvitationByEmail(capWorkspace.id, email)).resolves.toBeNull();
      });
    });

    describe('WHEN the owner re-invites the address that is already pending', () => {
      let response: IIntegrationResponse<string>;

      beforeEach(async () => {
        response = await ownerClient.rpc('create_workspace_invitation', {
          p_workspace_id: capWorkspace.id,
          p_email: pendingEmail,
          p_role_id: capRoleId,
        });
      });

      test('THEN the same invitation is pending for another fourteen days', async () => {
        expect(response.error).toBeNull();
        expect(response.data).toBe(pendingInvitationId);
        await expect(readInvitationExpiry(pendingInvitationId)).resolves.toBeGreaterThan(Date.now() + 13 * DAY_MS);
      });
    });
  });

  describe('GIVEN a workspace at the cap where one invitation has expired', () => {
    let capWorkspace: IIntegrationWorkspace;
    let capRoleId: string;

    beforeEach(async () => {
      capWorkspace = await seedWorkspace(owner.id, uniqueLabel('invitation-cap-lapsed'));
      capRoleId = await getRoleId(capWorkspace.id, 'member');
      await seedInvitations(capWorkspace.id, PENDING_INVITATION_CAP - 1, capRoleId);
      await seedInvitation(capWorkspace.id, `${uniqueLabel('lapsed')}@${INTEGRATION_ACCOUNT_DOMAIN}`, capRoleId, {
        expiresAt: new Date(Date.now() - DAY_MS),
      });
    });

    describe('WHEN the owner invites a new address', () => {
      let response: IIntegrationResponse<string>;

      beforeEach(async () => {
        response = await ownerClient.rpc('create_workspace_invitation', {
          p_workspace_id: capWorkspace.id,
          p_email: `${uniqueLabel('room-left')}@${INTEGRATION_ACCOUNT_DOMAIN}`,
          p_role_id: capRoleId,
        });
      });

      test('THEN the expired invitation does not count and the new one is pending', async () => {
        expect(response.error).toBeNull();
        await expect(readInvitation(response.data!)).resolves.toMatchObject({ status: 'pending' });
      });
    });
  });

  describe('GIVEN a workspace one invitation below the cap', () => {
    let capWorkspace: IIntegrationWorkspace;
    let capRoleId: string;

    beforeEach(async () => {
      capWorkspace = await seedWorkspace(owner.id, uniqueLabel('invitation-cap-race'));
      capRoleId = await getRoleId(capWorkspace.id, 'member');
      await seedInvitations(capWorkspace.id, PENDING_INVITATION_CAP - 1, capRoleId);
    });

    describe('WHEN the owner sends several invitations at once', () => {
      let responses: IIntegrationResponse[];

      beforeEach(async () => {
        responses = await Promise.all(
          Array.from({ length: CONCURRENT_INVITATIONS }, () =>
            ownerClient.rpc('create_workspace_invitation', {
              p_workspace_id: capWorkspace.id,
              p_email: `${uniqueLabel('concurrent')}@${INTEGRATION_ACCOUNT_DOMAIN}`,
              p_role_id: capRoleId,
            }),
          ),
        );
      });

      test('THEN exactly one is stored and the cap holds', async () => {
        expect(responses.filter((response) => response.error === null)).toHaveLength(1);
        expect(responses.filter((response) => response.error?.code === '54000')).toHaveLength(
          CONCURRENT_INVITATIONS - 1,
        );
        await expect(countPendingInvitations(capWorkspace.id)).resolves.toBe(PENDING_INVITATION_CAP);
      });
    });
  });
});

describe('get_workspace_invitations', () => {
  describe('GIVEN a pending invitation', () => {
    beforeEach(async () => {
      await seedInvitation(workspace.id, `${uniqueLabel('listed')}@${INTEGRATION_ACCOUNT_DOMAIN}`, memberRoleId);
    });

    describe('WHEN the manager lists the invitations', () => {
      let response: IIntegrationResponse<{ email: string }[]>;

      beforeEach(async () => {
        response = await managerClient.rpc('get_workspace_invitations', { p_workspace_id: workspace.id });
      });

      test('THEN the pending invitations are returned', () => {
        expect(response.error).toBeNull();
        expect(response.data!.length).toBeGreaterThan(0);
      });
    });

    describe('WHEN a plain member lists the invitations', () => {
      let response: IIntegrationResponse;

      beforeEach(async () => {
        response = await memberClient.rpc('get_workspace_invitations', { p_workspace_id: workspace.id });
      });

      test('THEN the call is denied', () => {
        expect(response.error?.code).toBe('42501');
      });
    });
  });

  describe('GIVEN an expired invitation', () => {
    let expiredEmail: string;

    beforeEach(async () => {
      expiredEmail = `${uniqueLabel('stale')}@${INTEGRATION_ACCOUNT_DOMAIN}`;
      await seedInvitation(workspace.id, expiredEmail, memberRoleId, { expiresAt: new Date(Date.now() - DAY_MS) });
    });

    describe('WHEN the manager lists the invitations', () => {
      let response: IIntegrationResponse<{ email: string }[]>;

      beforeEach(async () => {
        response = await managerClient.rpc('get_workspace_invitations', { p_workspace_id: workspace.id });
      });

      test('THEN the expired invitation is left out', () => {
        expect(response.error).toBeNull();
        expect(response.data!.map((row) => row.email)).not.toContain(expiredEmail);
      });
    });
  });
});

describe('accept_workspace_invitation', () => {
  describe('GIVEN an invitation addressed to another account', () => {
    let invitationId: string;

    beforeEach(async () => {
      invitationId = await seedInvitation(
        workspace.id,
        `${uniqueLabel('someone-else')}@${INTEGRATION_ACCOUNT_DOMAIN}`,
        memberRoleId,
      );
    });

    describe('WHEN the invitee accepts it', () => {
      let response: IIntegrationResponse;

      beforeEach(async () => {
        response = await inviteeClient.rpc('accept_workspace_invitation', { p_invitation_id: invitationId });
      });

      test('THEN it is refused as not found, exactly like a missing invitation', () => {
        expect(response.error?.code).toBe('P0002');
        expect(response.error?.message).toBe('Invitation not found');
      });
    });

    describe('WHEN the invitee declines it', () => {
      let response: IIntegrationResponse;

      beforeEach(async () => {
        response = await inviteeClient.rpc('decline_workspace_invitation', { p_invitation_id: invitationId });
      });

      test('THEN nothing changes, exactly like for a missing invitation', async () => {
        expect(response.error).toBeNull();
        await expect(readInvitation(invitationId)).resolves.toMatchObject({ status: 'pending' });
      });
    });
  });

  describe('GIVEN an invitation addressed to the caller', () => {
    let invitationId: string;

    beforeEach(async () => {
      await removeMember(workspace.id, invitee.id);
      await deleteInvitations(workspace.id, invitee.email);
      invitationId = await seedInvitation(workspace.id, invitee.email, memberRoleId);
    });

    describe('WHEN the invitee accepts it', () => {
      let response: IIntegrationResponse;

      beforeEach(async () => {
        response = await inviteeClient.rpc('accept_workspace_invitation', { p_invitation_id: invitationId });
      });

      test('THEN the membership appears and the invitation is accepted', async () => {
        expect(response.error).toBeNull();
        await expect(isMember(workspace.id, invitee.id)).resolves.toBe(true);
        await expect(readInvitation(invitationId)).resolves.toMatchObject({ status: 'accepted' });
      });
    });

    describe('WHEN the invitee declines it', () => {
      let response: IIntegrationResponse;

      beforeEach(async () => {
        response = await inviteeClient.rpc('decline_workspace_invitation', { p_invitation_id: invitationId });
      });

      test('THEN the invitation is declined and no membership appears', async () => {
        expect(response.error).toBeNull();
        await expect(readInvitation(invitationId)).resolves.toMatchObject({ status: 'declined' });
        await expect(isMember(workspace.id, invitee.id)).resolves.toBe(false);
      });
    });

    describe('WHEN the invitee lists their invitations', () => {
      let response: IIntegrationResponse<{ workspace_id: string }[]>;

      beforeEach(async () => {
        response = await inviteeClient.rpc('get_my_invitations');
      });

      test('THEN the pending invitation is listed with its workspace', () => {
        expect(response.error).toBeNull();
        expect(response.data!.map((row) => row.workspace_id)).toContain(workspace.id);
      });
    });
  });

  describe('GIVEN an expired invitation addressed to the caller', () => {
    let invitationId: string;

    beforeEach(async () => {
      await removeMember(workspace.id, invitee.id);
      await deleteInvitations(workspace.id, invitee.email);
      invitationId = await seedInvitation(workspace.id, invitee.email, memberRoleId, {
        expiresAt: new Date(Date.now() - DAY_MS),
      });
    });

    describe('WHEN the invitee accepts it', () => {
      let response: IIntegrationResponse;

      beforeEach(async () => {
        response = await inviteeClient.rpc('accept_workspace_invitation', { p_invitation_id: invitationId });
      });

      test('THEN the acceptance is refused and no membership appears', async () => {
        expect(response.error?.code).toBe('P0002');
        await expect(isMember(workspace.id, invitee.id)).resolves.toBe(false);
        await expect(readInvitation(invitationId)).resolves.toMatchObject({ status: 'pending' });
      });
    });

    describe('WHEN the invitee declines it', () => {
      let response: IIntegrationResponse;

      beforeEach(async () => {
        response = await inviteeClient.rpc('decline_workspace_invitation', { p_invitation_id: invitationId });
      });

      test('THEN the expired invitation is left untouched', async () => {
        expect(response.error).toBeNull();
        await expect(readInvitation(invitationId)).resolves.toMatchObject({ status: 'pending' });
      });
    });

    describe('WHEN the invitee lists their invitations', () => {
      let response: IIntegrationResponse<{ id: string }[]>;

      beforeEach(async () => {
        response = await inviteeClient.rpc('get_my_invitations');
      });

      test('THEN the expired invitation is left out', () => {
        expect(response.error).toBeNull();
        expect(response.data!.map((row) => row.id)).not.toContain(invitationId);
      });
    });
  });

  describe('GIVEN an invitation to the caller from an inviter whose profile name runs far past the cap', () => {
    beforeEach(async () => {
      await removeMember(workspace.id, invitee.id);
      await deleteInvitations(workspace.id, invitee.email);
      await setAccountMetadata(manager.id, { name: 'n'.repeat(NAME_LENGTH_CAP * 10) });
      await seedInvitation(workspace.id, invitee.email, memberRoleId, { invitedBy: manager.id });
    });

    describe('WHEN the invitee lists their invitations', () => {
      let response: IIntegrationResponse<{ workspace_id: string; invited_by_name: string }[]>;

      beforeEach(async () => {
        response = await inviteeClient.rpc('get_my_invitations');
      });

      test('THEN the inviter name comes back cut to the cap', () => {
        expect(response.error).toBeNull();
        expect(response.data!.find((row) => row.workspace_id === workspace.id)).toMatchObject({
          invited_by_name: 'n'.repeat(NAME_LENGTH_CAP),
        });
      });
    });
  });

  describe('GIVEN a pending invitation addressed to the workspace owner', () => {
    let ownerRoleId: string;
    let invitationId: string;

    beforeEach(async () => {
      ownerRoleId = await getRoleId(workspace.id, 'owner');
      await deleteInvitations(workspace.id, owner.email);
      invitationId = await seedInvitation(workspace.id, owner.email, await getRoleId(workspace.id, 'viewer'));
    });

    describe('WHEN the owner accepts it', () => {
      let response: IIntegrationResponse;

      beforeEach(async () => {
        response = await ownerClient.rpc('accept_workspace_invitation', { p_invitation_id: invitationId });
      });

      test('THEN the owner keeps the owner role and the invitation is closed', async () => {
        expect(response.error).toBeNull();
        await expect(readMemberRole(workspace.id, owner.id)).resolves.toBe(ownerRoleId);
        await expect(readInvitation(invitationId)).resolves.toMatchObject({ status: 'accepted' });
      });
    });
  });
});

describe('revoke_workspace_invitation', () => {
  describe('GIVEN a pending invitation', () => {
    let invitationId: string;

    beforeEach(async () => {
      invitationId = await seedInvitation(
        workspace.id,
        `${uniqueLabel('revoked')}@${INTEGRATION_ACCOUNT_DOMAIN}`,
        memberRoleId,
      );
    });

    describe('WHEN the manager revokes it', () => {
      let response: IIntegrationResponse;

      beforeEach(async () => {
        response = await managerClient.rpc('revoke_workspace_invitation', { p_invitation_id: invitationId });
      });

      test('THEN the invitation row is gone', async () => {
        expect(response.error).toBeNull();
        await expect(readInvitation(invitationId)).resolves.toBeNull();
      });
    });

    describe('WHEN a plain member revokes it', () => {
      let response: IIntegrationResponse;

      beforeEach(async () => {
        response = await memberClient.rpc('revoke_workspace_invitation', { p_invitation_id: invitationId });
      });

      test('THEN the call is denied', async () => {
        expect(response.error?.code).toBe('42501');
        await expect(readInvitation(invitationId)).resolves.toMatchObject({ status: 'pending' });
      });
    });
  });

  describe('GIVEN a pending invitation carrying a role above the people manager ceiling', () => {
    let invitationId: string;

    beforeEach(async () => {
      const stewardRoleId = await seedRole(workspace.id, uniqueLabel('Steward'), { canManageRoles: true });
      invitationId = await seedInvitation(
        workspace.id,
        `${uniqueLabel('revoked-steward')}@${INTEGRATION_ACCOUNT_DOMAIN}`,
        stewardRoleId,
      );
    });

    describe('WHEN the manager revokes it', () => {
      let response: IIntegrationResponse;

      beforeEach(async () => {
        response = await managerClient.rpc('revoke_workspace_invitation', { p_invitation_id: invitationId });
      });

      test('THEN the revocation is denied and the invitation stays pending', async () => {
        expect(response.error?.code).toBe('42501');
        expect(response.error?.message).toMatch(/permissions you do not have/);
        await expect(readInvitation(invitationId)).resolves.toMatchObject({ status: 'pending' });
      });
    });

    describe('WHEN the owner revokes it', () => {
      let response: IIntegrationResponse;

      beforeEach(async () => {
        response = await ownerClient.rpc('revoke_workspace_invitation', { p_invitation_id: invitationId });
      });

      test('THEN the owner bypasses the ceiling and the invitation row is gone', async () => {
        expect(response.error).toBeNull();
        await expect(readInvitation(invitationId)).resolves.toBeNull();
      });
    });
  });
});
