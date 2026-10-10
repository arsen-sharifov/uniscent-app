import type { SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'vitest';

import { BACKDATED_TIMESTAMP } from '../../consts';
import type {
  IIntegrationAccount,
  IIntegrationResponse,
  IIntegrationThread,
  IIntegrationWorkspace,
} from '../../interfaces';
import {
  createAnonClient,
  deleteAccounts,
  getAdminClient,
  getRoleId,
  getUserClient,
  seedAccount,
  seedNode,
  seedThread,
  seedWorkspace,
  uniqueLabel,
} from '../../utils';

let owner: IIntegrationAccount;
let stranger: IIntegrationAccount;
let ownerClient: SupabaseClient;
let strangerClient: SupabaseClient;
let anonClient: SupabaseClient;
let workspace: IIntegrationWorkspace;

beforeAll(async () => {
  [owner, stranger] = await Promise.all([seedAccount('privileges-owner'), seedAccount('privileges-stranger')]);
  workspace = await seedWorkspace(owner.id, uniqueLabel('privileges'));
  [ownerClient, strangerClient] = await Promise.all([getUserClient(owner), getUserClient(stranger)]);
  anonClient = createAnonClient();

  const { error } = await ownerClient.from('user_preferences').upsert({ user_id: owner.id, theme: 'eclipse' });

  if (error) throw new Error(`Could not seed the preferences of ${owner.id}: ${error.message}`);
});

afterAll(async () => {
  await deleteAccounts(stranger, owner);
});

describe('seed_workspace_roles', () => {
  describe('GIVEN a visitor without a session', () => {
    describe('WHEN they seed roles on an existing workspace', () => {
      let response: IIntegrationResponse;

      beforeEach(async () => {
        response = await anonClient.rpc('seed_workspace_roles', { p_workspace_id: workspace.id });
      });

      test('THEN execution is denied', () => {
        expect(response.error?.code).toBe('42501');
        expect(response.error?.message).toMatch(/permission denied for function/);
      });
    });
  });
});

describe('canvas_node_workspace_id', () => {
  describe('GIVEN a node of the workspace and a visitor without a session', () => {
    let nodeId: string;

    beforeEach(async () => {
      const thread = await seedThread(workspace.id, owner.id);
      nodeId = await seedNode(thread.id, owner.id);
    });

    describe('WHEN they resolve the workspace of the node', () => {
      let response: IIntegrationResponse;

      beforeEach(async () => {
        response = await anonClient.rpc('canvas_node_workspace_id', { p_node_id: nodeId });
      });

      test('THEN execution is denied', () => {
        expect(response.error?.code).toBe('42501');
        expect(response.error?.message).toMatch(/permission denied for function/);
      });
    });
  });
});

describe('can_grant_permissions', () => {
  describe('GIVEN a signed-in account', () => {
    describe('WHEN it calls the grant ceiling helper', () => {
      let response: IIntegrationResponse;

      beforeEach(async () => {
        response = await strangerClient.rpc('can_grant_permissions', {
          p_workspace_id: workspace.id,
          p_can_edit_canvas: true,
          p_can_comment: true,
          p_can_manage_structure: true,
          p_can_manage_members: true,
          p_can_manage_roles: true,
          p_can_manage_workspace: true,
        });
      });

      test('THEN execution is denied', () => {
        expect(response.error?.code).toBe('42501');
        expect(response.error?.message).toMatch(/permission denied for function/);
      });
    });
  });
});

describe('can_grant_role', () => {
  describe('GIVEN a signed-in account and a role of the workspace', () => {
    let ownerRoleId: string;

    beforeEach(async () => {
      ownerRoleId = await getRoleId(workspace.id, 'owner');
    });

    describe('WHEN it calls the role ceiling helper', () => {
      let response: IIntegrationResponse;

      beforeEach(async () => {
        response = await strangerClient.rpc('can_grant_role', { p_role_id: ownerRoleId });
      });

      test('THEN execution is denied', () => {
        expect(response.error?.code).toBe('42501');
        expect(response.error?.message).toMatch(/permission denied for function/);
      });
    });
  });
});

describe('get_workspace_roles', () => {
  describe('GIVEN a visitor without a session', () => {
    describe('WHEN they call the rpc', () => {
      let response: IIntegrationResponse;

      beforeEach(async () => {
        response = await anonClient.rpc('get_workspace_roles', { p_workspace_id: workspace.id });
      });

      test('THEN execution is denied', () => {
        expect(response.error?.code).toBe('42501');
        expect(response.error?.message).toMatch(/permission denied for function/);
      });
    });
  });
});

describe('get_my_owned_shared_workspaces', () => {
  describe('GIVEN a visitor without a session', () => {
    describe('WHEN they list owned shared workspaces', () => {
      let response: IIntegrationResponse;

      beforeEach(async () => {
        response = await anonClient.rpc('get_my_owned_shared_workspaces');
      });

      test('THEN execution is denied', () => {
        expect(response.error?.code).toBe('42501');
        expect(response.error?.message).toMatch(/permission denied for function/);
      });
    });
  });

  describe('GIVEN the service role, which has no caller to check', () => {
    describe('WHEN it lists owned shared workspaces', () => {
      let response: IIntegrationResponse;

      beforeEach(async () => {
        response = await getAdminClient().rpc('get_my_owned_shared_workspaces');
      });

      test('THEN execution is denied instead of answering for nobody', () => {
        expect(response.error?.code).toBe('42501');
        expect(response.error?.message).toMatch(/permission denied for function/);
      });
    });
  });
});

describe('workspaces', () => {
  describe('GIVEN a visitor without a session', () => {
    describe('WHEN they insert a workspace', () => {
      let response: IIntegrationResponse;

      beforeEach(async () => {
        response = await anonClient.from('workspaces').insert({ name: 'anon', owner_id: owner.id });
      });

      test('THEN the table privilege is missing', () => {
        expect(response.error?.code).toBe('42501');
        expect(response.error?.message).toMatch(/permission denied for table/);
      });
    });
  });

  describe('GIVEN a signed-in account', () => {
    describe('WHEN it creates a workspace with a backdated creation time', () => {
      let response: IIntegrationResponse;

      beforeEach(async () => {
        response = await strangerClient
          .from('workspaces')
          .insert({ name: uniqueLabel('backdated'), owner_id: stranger.id, created_at: BACKDATED_TIMESTAMP });
      });

      test('THEN the timestamp column is not insertable', () => {
        expect(response.error?.code).toBe('42501');
        expect(response.error?.message).toMatch(/permission denied for table/);
      });
    });
  });
});

describe('canvas_nodes', () => {
  describe('GIVEN a thread of the workspace', () => {
    let thread: IIntegrationThread;

    beforeEach(async () => {
      thread = await seedThread(workspace.id, owner.id);
    });

    describe('WHEN the owner adds a node with a backdated creation time', () => {
      let response: IIntegrationResponse;

      beforeEach(async () => {
        response = await ownerClient
          .from('canvas_nodes')
          .insert({ thread_id: thread.id, type: 'canvas-node', label: '', created_at: BACKDATED_TIMESTAMP });
      });

      test('THEN the timestamp column is not insertable', () => {
        expect(response.error?.code).toBe('42501');
        expect(response.error?.message).toMatch(/permission denied for table/);
      });
    });
  });
});

describe('node_comments', () => {
  describe('GIVEN a node of the workspace', () => {
    let nodeId: string;

    beforeEach(async () => {
      const thread = await seedThread(workspace.id, owner.id);
      nodeId = await seedNode(thread.id, owner.id);
    });

    describe('WHEN the owner comments with a backdated creation time', () => {
      let response: IIntegrationResponse;

      beforeEach(async () => {
        response = await ownerClient
          .from('node_comments')
          .insert({ node_id: nodeId, author_id: owner.id, text: 'backdated', created_at: BACKDATED_TIMESTAMP });
      });

      test('THEN the timestamp column is not insertable', () => {
        expect(response.error?.code).toBe('42501');
        expect(response.error?.message).toMatch(/permission denied for table/);
      });
    });
  });
});

describe('workspace_roles', () => {
  describe('GIVEN a visitor without a session', () => {
    describe('WHEN they insert a role', () => {
      let response: IIntegrationResponse;

      beforeEach(async () => {
        response = await anonClient.from('workspace_roles').insert({ workspace_id: workspace.id, name: 'anon' });
      });

      test('THEN the table privilege is missing', () => {
        expect(response.error?.code).toBe('42501');
        expect(response.error?.message).toMatch(/permission denied for table/);
      });
    });
  });
});

describe('workspace_members', () => {
  describe('GIVEN a signed-in account outside the workspace', () => {
    describe('WHEN it inserts itself as a member', () => {
      let response: IIntegrationResponse;

      beforeEach(async () => {
        response = await strangerClient.from('workspace_members').insert({
          workspace_id: workspace.id,
          user_id: stranger.id,
          role_id: await getRoleId(workspace.id, 'member'),
        });
      });

      test('THEN the table privilege is missing', () => {
        expect(response.error?.code).toBe('42501');
        expect(response.error?.message).toMatch(/permission denied for table/);
      });
    });
  });
});

describe('user_preferences', () => {
  describe('GIVEN an account with stored preferences', () => {
    describe('WHEN another account reads the table without a filter', () => {
      let response: IIntegrationResponse<{ user_id: string }[]>;

      beforeEach(async () => {
        response = await strangerClient.from('user_preferences').select('user_id');
      });

      test('THEN the foreign row is hidden', () => {
        expect(response.error).toBeNull();
        expect(response.data!.map((row) => row.user_id)).not.toContain(owner.id);
      });
    });
  });
});
