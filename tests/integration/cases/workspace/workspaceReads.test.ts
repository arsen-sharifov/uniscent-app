import type { SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'vitest';

import { ICON_LENGTH_CAP, NAME_LENGTH_CAP } from '../../consts';
import type { IIntegrationAccount, IIntegrationResponse, IIntegrationWorkspace } from '../../interfaces';
import {
  deleteAccounts,
  getUserClient,
  seedAccount,
  seedFolder,
  seedMember,
  seedThread,
  seedWorkspace,
  setAccountMetadata,
  uniqueLabel,
} from '../../utils';

let owner: IIntegrationAccount;
let member: IIntegrationAccount;
let outsider: IIntegrationAccount;
let ownerClient: SupabaseClient;
let memberClient: SupabaseClient;
let outsiderClient: SupabaseClient;
let workspace: IIntegrationWorkspace;
let outsiderWorkspace: IIntegrationWorkspace;

beforeAll(async () => {
  [owner, member, outsider] = await Promise.all([seedAccount('owner'), seedAccount('member'), seedAccount('outsider')]);
  [workspace, outsiderWorkspace] = await Promise.all([
    seedWorkspace(owner.id, uniqueLabel('workspace-reads')),
    seedWorkspace(outsider.id, uniqueLabel('workspace-reads-outsider')),
  ]);
  await Promise.all([
    seedWorkspace(owner.id, uniqueLabel('workspace-reads-solo')),
    seedMember(workspace.id, member.id, 'member'),
    seedMember(outsiderWorkspace.id, member.id, 'member'),
  ]);
  [ownerClient, memberClient, outsiderClient] = await Promise.all([
    getUserClient(owner),
    getUserClient(member),
    getUserClient(outsider),
  ]);
});

afterAll(async () => {
  await deleteAccounts(outsider, member, owner);
});

describe('get_workspace_members', () => {
  describe('GIVEN a workspace member', () => {
    describe('WHEN they read the roster', () => {
      let response: IIntegrationResponse<{ user_id: string; role_key: string }[]>;

      beforeEach(async () => {
        response = await memberClient.rpc('get_workspace_members', { p_workspace_id: workspace.id });
      });

      test('THEN every membership is listed with its role', () => {
        expect(response.error).toBeNull();
        expect(response.data!.map((row) => [row.user_id, row.role_key]).sort()).toEqual(
          [
            [owner.id, 'owner'],
            [member.id, 'member'],
          ].sort(),
        );
      });
    });
  });

  describe('GIVEN a signed-in outsider', () => {
    describe('WHEN they read the roster', () => {
      let response: IIntegrationResponse;

      beforeEach(async () => {
        response = await outsiderClient.rpc('get_workspace_members', { p_workspace_id: workspace.id });
      });

      test('THEN the call is denied for a non-member', () => {
        expect(response.error?.code).toBe('42501');
        expect(response.error?.message).toMatch(/Not a member/);
      });
    });
  });

  describe('GIVEN a member whose profile name and avatar icon run far past the caps', () => {
    beforeEach(async () => {
      await setAccountMetadata(member.id, {
        name: 'n'.repeat(NAME_LENGTH_CAP * 10),
        avatarIcon: 'i'.repeat(ICON_LENGTH_CAP * 10),
      });
    });

    describe('WHEN the owner reads the roster', () => {
      let response: IIntegrationResponse<{ user_id: string; name: string; avatar_icon: string }[]>;

      beforeEach(async () => {
        response = await ownerClient.rpc('get_workspace_members', { p_workspace_id: workspace.id });
      });

      test('THEN the name and the icon come back cut to the caps', () => {
        expect(response.error).toBeNull();
        expect(response.data!.find((row) => row.user_id === member.id)).toMatchObject({
          name: 'n'.repeat(NAME_LENGTH_CAP),
          avatar_icon: 'i'.repeat(ICON_LENGTH_CAP),
        });
      });
    });
  });
});

describe('get_workspace_roles', () => {
  describe('GIVEN a workspace member', () => {
    describe('WHEN they read the roles', () => {
      let response: IIntegrationResponse<{ key: string | null }[]>;

      beforeEach(async () => {
        response = await memberClient.rpc('get_workspace_roles', { p_workspace_id: workspace.id });
      });

      test('THEN the three system roles are listed', () => {
        expect(response.error).toBeNull();
        expect(response.data!.map((row) => row.key)).toEqual(['owner', 'member', 'viewer']);
      });
    });
  });

  describe('GIVEN a signed-in outsider', () => {
    describe('WHEN they read the roles', () => {
      let response: IIntegrationResponse;

      beforeEach(async () => {
        response = await outsiderClient.rpc('get_workspace_roles', { p_workspace_id: workspace.id });
      });

      test('THEN the call is denied for a non-member', () => {
        expect(response.error?.code).toBe('42501');
      });
    });
  });
});

describe('get_my_workspace_permissions', () => {
  describe('GIVEN a workspace member', () => {
    describe('WHEN they read their own permissions', () => {
      let response: IIntegrationResponse<{ can_edit_canvas: boolean }[]>;

      beforeEach(async () => {
        response = await memberClient.rpc('get_my_workspace_permissions', { p_workspace_id: workspace.id });
      });

      test('THEN the member flags are returned', () => {
        expect(response.error).toBeNull();
        expect(response.data![0]).toMatchObject({
          is_owner: false,
          can_edit_canvas: true,
          can_comment: true,
          can_manage_structure: true,
          can_manage_members: false,
          can_manage_roles: false,
          can_manage_workspace: false,
        });
      });
    });
  });

  describe('GIVEN a signed-in outsider', () => {
    describe('WHEN they read their permissions for the workspace', () => {
      let response: IIntegrationResponse<unknown[]>;

      beforeEach(async () => {
        response = await outsiderClient.rpc('get_my_workspace_permissions', { p_workspace_id: workspace.id });
      });

      test('THEN no rows come back instead of an error', () => {
        expect(response.error).toBeNull();
        expect(response.data).toEqual([]);
      });
    });
  });
});

describe('get_my_workspaces', () => {
  describe('GIVEN a workspace member', () => {
    describe('WHEN they list their workspaces', () => {
      let response: IIntegrationResponse<{ id: string }[]>;

      beforeEach(async () => {
        response = await memberClient.rpc('get_my_workspaces');
      });

      test('THEN the joined workspace is listed', () => {
        expect(response.error).toBeNull();
        expect(response.data!.map((row) => row.id)).toContain(workspace.id);
      });
    });
  });

  describe('GIVEN a signed-in outsider', () => {
    describe('WHEN they list their workspaces', () => {
      let response: IIntegrationResponse<{ id: string }[]>;

      beforeEach(async () => {
        response = await outsiderClient.rpc('get_my_workspaces');
      });

      test('THEN the foreign workspace stays invisible', () => {
        expect(response.error).toBeNull();
        expect(response.data!.map((row) => row.id)).not.toContain(workspace.id);
      });
    });
  });
});

describe('get_my_owned_shared_workspaces', () => {
  describe('GIVEN an owner of a workspace shared with a member and of a solo workspace', () => {
    describe('WHEN they list their owned shared workspaces', () => {
      let response: IIntegrationResponse<{ id: string; name: string }[]>;

      beforeEach(async () => {
        response = await ownerClient.rpc('get_my_owned_shared_workspaces');
      });

      test('THEN only the shared workspace is returned', () => {
        expect(response.error).toBeNull();
        expect(response.data).toEqual([{ id: workspace.id, name: workspace.name }]);
      });
    });
  });

  describe('GIVEN a member of two shared workspaces who owns none', () => {
    describe('WHEN they list their owned shared workspaces', () => {
      let response: IIntegrationResponse<{ id: string }[]>;

      beforeEach(async () => {
        response = await memberClient.rpc('get_my_owned_shared_workspaces');
      });

      test('THEN nothing comes back', () => {
        expect(response.error).toBeNull();
        expect(response.data).toEqual([]);
      });
    });
  });

  describe('GIVEN an outsider who owns a workspace shared with a member', () => {
    describe('WHEN they list their owned shared workspaces', () => {
      let response: IIntegrationResponse<{ id: string; name: string }[]>;

      beforeEach(async () => {
        response = await outsiderClient.rpc('get_my_owned_shared_workspaces');
      });

      test('THEN only their own workspace is returned', () => {
        expect(response.error).toBeNull();
        expect(response.data).toEqual([{ id: outsiderWorkspace.id, name: outsiderWorkspace.name }]);
      });
    });
  });
});

describe('workspaces', () => {
  describe('GIVEN a workspace member', () => {
    describe('WHEN they select the workspace', () => {
      let response: IIntegrationResponse<{ id: string }[]>;

      beforeEach(async () => {
        response = await memberClient.from('workspaces').select('id').eq('id', workspace.id);
      });

      test('THEN the row comes back', () => {
        expect(response.error).toBeNull();
        expect(response.data).toEqual([{ id: workspace.id }]);
      });
    });
  });

  describe('GIVEN a signed-in outsider', () => {
    describe('WHEN they select the workspace', () => {
      let response: IIntegrationResponse<{ id: string }[]>;

      beforeEach(async () => {
        response = await outsiderClient.from('workspaces').select('id').eq('id', workspace.id);
      });

      test('THEN nothing comes back', () => {
        expect(response.error).toBeNull();
        expect(response.data).toEqual([]);
      });
    });
  });
});

describe('workspace_members', () => {
  describe('GIVEN a workspace member', () => {
    describe('WHEN they select every membership of the workspace', () => {
      let response: IIntegrationResponse<{ user_id: string }[]>;

      beforeEach(async () => {
        response = await memberClient.from('workspace_members').select('user_id').eq('workspace_id', workspace.id);
      });

      test('THEN only their own membership comes back', () => {
        expect(response.error).toBeNull();
        expect(response.data).toEqual([{ user_id: member.id }]);
      });
    });
  });
});

describe('workspace_roles', () => {
  describe('GIVEN a workspace member', () => {
    describe('WHEN they select the roles of the workspace', () => {
      let response: IIntegrationResponse<{ key: string | null }[]>;

      beforeEach(async () => {
        response = await memberClient
          .from('workspace_roles')
          .select('key')
          .eq('workspace_id', workspace.id)
          .order('position');
      });

      test('THEN the system roles come back', () => {
        expect(response.error).toBeNull();
        expect(response.data!.map((row) => row.key)).toEqual(['owner', 'member', 'viewer']);
      });
    });
  });

  describe('GIVEN a signed-in outsider', () => {
    describe('WHEN they select the roles of the workspace', () => {
      let response: IIntegrationResponse<unknown[]>;

      beforeEach(async () => {
        response = await outsiderClient.from('workspace_roles').select('id').eq('workspace_id', workspace.id);
      });

      test('THEN nothing comes back', () => {
        expect(response.error).toBeNull();
        expect(response.data).toEqual([]);
      });
    });
  });
});

describe('folders', () => {
  describe('GIVEN a folder of the workspace', () => {
    let folderId: string;

    beforeEach(async () => {
      folderId = await seedFolder(workspace.id);
    });

    describe('WHEN a member lists the workspace folders', () => {
      let response: IIntegrationResponse<{ id: string }[]>;

      beforeEach(async () => {
        response = await memberClient.from('folders').select('id').eq('workspace_id', workspace.id);
      });

      test('THEN the folder is listed', () => {
        expect(response.error).toBeNull();
        expect(response.data!.map((row) => row.id)).toContain(folderId);
      });
    });

    describe('WHEN an outsider lists the workspace folders', () => {
      let response: IIntegrationResponse<unknown[]>;

      beforeEach(async () => {
        response = await outsiderClient.from('folders').select('id').eq('workspace_id', workspace.id);
      });

      test('THEN nothing comes back', () => {
        expect(response.error).toBeNull();
        expect(response.data).toEqual([]);
      });
    });
  });
});

describe('threads', () => {
  describe('GIVEN a thread of the workspace', () => {
    let threadId: string;

    beforeEach(async () => {
      threadId = (await seedThread(workspace.id, owner.id)).id;
    });

    describe('WHEN a member lists the workspace threads', () => {
      let response: IIntegrationResponse<{ id: string }[]>;

      beforeEach(async () => {
        response = await memberClient.from('threads').select('id').eq('workspace_id', workspace.id);
      });

      test('THEN the thread is listed', () => {
        expect(response.error).toBeNull();
        expect(response.data!.map((row) => row.id)).toContain(threadId);
      });
    });

    describe('WHEN an outsider lists the workspace threads', () => {
      let response: IIntegrationResponse<unknown[]>;

      beforeEach(async () => {
        response = await outsiderClient.from('threads').select('id').eq('workspace_id', workspace.id);
      });

      test('THEN nothing comes back', () => {
        expect(response.error).toBeNull();
        expect(response.data).toEqual([]);
      });
    });
  });
});
