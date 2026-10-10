import type { SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'vitest';

import { NAME_LENGTH_CAP } from '../../consts';
import type { IIntegrationAccount, IIntegrationResponse, IIntegrationWorkspace } from '../../interfaces';
import {
  deleteAccounts,
  getUserClient,
  readFolder,
  readMemberRoleKey,
  readThread,
  readWorkspace,
  seedAccount,
  seedFolder,
  seedMember,
  seedThread,
  seedWorkspace,
  uniqueLabel,
} from '../../utils';

let owner: IIntegrationAccount;
let editor: IIntegrationAccount;
let viewer: IIntegrationAccount;
let editorClient: SupabaseClient;
let viewerClient: SupabaseClient;
let workspace: IIntegrationWorkspace;
let editorWorkspace: IIntegrationWorkspace;

beforeAll(async () => {
  [owner, editor, viewer] = await Promise.all([seedAccount('owner'), seedAccount('editor'), seedAccount('viewer')]);
  [workspace, editorWorkspace] = await Promise.all([
    seedWorkspace(owner.id, uniqueLabel('boundaries')),
    seedWorkspace(editor.id, uniqueLabel('boundaries-own')),
  ]);
  await Promise.all([seedMember(workspace.id, editor.id, 'member'), seedMember(workspace.id, viewer.id, 'viewer')]);
  [editorClient, viewerClient] = await Promise.all([getUserClient(editor), getUserClient(viewer)]);
});

afterAll(async () => {
  await deleteAccounts(viewer, editor, owner);
});

describe('workspaces', () => {
  describe('GIVEN a signed-in account', () => {
    describe('WHEN they create a workspace the way the app does', () => {
      let response: IIntegrationResponse<{ id: string }>;

      beforeEach(async () => {
        response = await editorClient
          .from('workspaces')
          .insert({ name: uniqueLabel('created'), owner_id: editor.id })
          .select('id')
          .single<{ id: string }>();
      });

      test('THEN the creator holds the seeded owner role', async () => {
        expect(response.error).toBeNull();
        await expect(readMemberRoleKey(response.data!.id, editor.id)).resolves.toBe('owner');
      });
    });

    describe('WHEN they create a workspace in the name of another account', () => {
      let response: IIntegrationResponse;

      beforeEach(async () => {
        response = await editorClient.from('workspaces').insert({ name: uniqueLabel('planted'), owner_id: owner.id });
      });

      test('THEN the insert is denied by row level security', () => {
        expect(response.error?.code).toBe('42501');
      });
    });
  });

  describe('GIVEN a member without workspace management permission', () => {
    describe('WHEN they rename the workspace', () => {
      beforeEach(async () => {
        await editorClient.from('workspaces').update({ name: 'renamed by member' }).eq('id', workspace.id);
      });

      test('THEN the name stays unchanged', async () => {
        await expect(readWorkspace(workspace.id)).resolves.toMatchObject({ name: workspace.name });
      });
    });

    describe('WHEN they delete the workspace', () => {
      beforeEach(async () => {
        await editorClient.from('workspaces').delete().eq('id', workspace.id);
      });

      test('THEN the workspace survives', async () => {
        await expect(readWorkspace(workspace.id)).resolves.not.toBeNull();
      });
    });

    describe('WHEN they hand the workspace to themselves through the owner column', () => {
      let response: IIntegrationResponse;

      beforeEach(async () => {
        response = await editorClient.from('workspaces').update({ owner_id: editor.id }).eq('id', workspace.id);
      });

      test('THEN the owner column is locked', async () => {
        expect(response.error?.code).toBe('42501');
        await expect(readWorkspace(workspace.id)).resolves.toMatchObject({ owner_id: owner.id });
      });
    });
  });

  describe('GIVEN an editor who owns another workspace', () => {
    describe('WHEN they rename it past the length cap', () => {
      let response: IIntegrationResponse;

      beforeEach(async () => {
        response = await editorClient
          .from('workspaces')
          .update({ name: 'w'.repeat(NAME_LENGTH_CAP + 1) })
          .eq('id', editorWorkspace.id);
      });

      test('THEN the check constraint rejects it and the name stays', async () => {
        expect(response.error?.code).toBe('23514');
        await expect(readWorkspace(editorWorkspace.id)).resolves.toMatchObject({
          name: editorWorkspace.name,
        });
      });
    });
  });
});

describe('threads', () => {
  describe('GIVEN a thread of a shared workspace and an editor who owns another workspace', () => {
    let threadId: string;

    beforeEach(async () => {
      threadId = (await seedThread(workspace.id, owner.id)).id;
    });

    describe('WHEN the editor moves the thread into their own workspace', () => {
      let response: IIntegrationResponse;

      beforeEach(async () => {
        response = await editorClient.from('threads').update({ workspace_id: editorWorkspace.id }).eq('id', threadId);
      });

      test('THEN the workspace column is locked and the thread stays put', async () => {
        expect(response.error?.code).toBe('42501');
        await expect(readThread(threadId)).resolves.toMatchObject({ workspace_id: workspace.id });
      });
    });

    describe('WHEN the editor renames the thread', () => {
      let response: IIntegrationResponse;
      let name: string;

      beforeEach(async () => {
        name = uniqueLabel('renamed');
        response = await editorClient.from('threads').update({ name }).eq('id', threadId);
      });

      test('THEN the new name is persisted', async () => {
        expect(response.error).toBeNull();
        await expect(readThread(threadId)).resolves.toMatchObject({ name });
      });
    });

    describe('WHEN the editor renames the thread to the length cap', () => {
      let response: IIntegrationResponse;

      beforeEach(async () => {
        response = await editorClient
          .from('threads')
          .update({ name: 't'.repeat(NAME_LENGTH_CAP) })
          .eq('id', threadId);
      });

      test('THEN the name is persisted', async () => {
        expect(response.error).toBeNull();
        await expect(readThread(threadId)).resolves.toMatchObject({ name: 't'.repeat(NAME_LENGTH_CAP) });
      });
    });

    describe('WHEN the editor renames the thread past the length cap', () => {
      let response: IIntegrationResponse;

      beforeEach(async () => {
        response = await editorClient
          .from('threads')
          .update({ name: 't'.repeat(NAME_LENGTH_CAP + 1) })
          .eq('id', threadId);
      });

      test('THEN the check constraint rejects it', () => {
        expect(response.error?.code).toBe('23514');
      });
    });
  });

  describe('GIVEN a thread of the workspace and a viewer without structure permission', () => {
    let threadId: string;

    beforeEach(async () => {
      threadId = (await seedThread(workspace.id, owner.id)).id;
    });

    describe('WHEN the viewer deletes the thread', () => {
      beforeEach(async () => {
        await viewerClient.from('threads').delete().eq('id', threadId);
      });

      test('THEN the thread survives', async () => {
        await expect(readThread(threadId)).resolves.not.toBeNull();
      });
    });
  });
});

describe('folders', () => {
  describe('GIVEN a viewer without structure permission', () => {
    describe('WHEN they create a folder', () => {
      let response: IIntegrationResponse;

      beforeEach(async () => {
        response = await viewerClient
          .from('folders')
          .insert({ workspace_id: workspace.id, name: uniqueLabel('viewer') });
      });

      test('THEN the insert is denied by row level security', () => {
        expect(response.error?.code).toBe('42501');
      });
    });
  });

  describe('GIVEN a folder of a shared workspace and an editor who owns another workspace', () => {
    let folderId: string;

    beforeEach(async () => {
      folderId = await seedFolder(workspace.id);
    });

    describe('WHEN the editor moves the folder into their own workspace', () => {
      let response: IIntegrationResponse;

      beforeEach(async () => {
        response = await editorClient.from('folders').update({ workspace_id: editorWorkspace.id }).eq('id', folderId);
      });

      test('THEN the workspace column is locked and the folder stays put', async () => {
        expect(response.error?.code).toBe('42501');
        await expect(readFolder(folderId)).resolves.toMatchObject({ workspace_id: workspace.id });
      });
    });

    describe('WHEN the editor reorders the folder', () => {
      let response: IIntegrationResponse;

      beforeEach(async () => {
        response = await editorClient.from('folders').update({ position: 7 }).eq('id', folderId);
      });

      test('THEN the new position is persisted', async () => {
        expect(response.error).toBeNull();
        await expect(readFolder(folderId)).resolves.toMatchObject({ position: 7 });
      });
    });
  });

  describe('GIVEN an editor holding structure permission', () => {
    describe('WHEN they create a folder named past the length cap', () => {
      let response: IIntegrationResponse;

      beforeEach(async () => {
        response = await editorClient
          .from('folders')
          .insert({ workspace_id: workspace.id, name: 'f'.repeat(NAME_LENGTH_CAP + 1) });
      });

      test('THEN the check constraint rejects it', () => {
        expect(response.error?.code).toBe('23514');
      });
    });
  });
});
