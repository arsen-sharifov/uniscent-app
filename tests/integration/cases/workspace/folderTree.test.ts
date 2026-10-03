import type { SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'vitest';

import type { IIntegrationAccount, IIntegrationResponse, IIntegrationWorkspace } from '../../interfaces';
import {
  deleteAccounts,
  getUserClient,
  readFolder,
  readThread,
  seedAccount,
  seedFolder,
  seedMember,
  seedThread,
  seedWorkspace,
  uniqueLabel,
} from '../../utils';

const MISSING_FOLDER_ID = '00000000-0000-4000-8000-000000000000';

let owner: IIntegrationAccount;
let editor: IIntegrationAccount;
let viewer: IIntegrationAccount;
let stranger: IIntegrationAccount;
let editorClient: SupabaseClient;
let viewerClient: SupabaseClient;
let strangerClient: SupabaseClient;
let workspace: IIntegrationWorkspace;
let otherWorkspace: IIntegrationWorkspace;

beforeAll(async () => {
  [owner, editor, viewer, stranger] = await Promise.all([
    seedAccount('owner'),
    seedAccount('editor'),
    seedAccount('viewer'),
    seedAccount('stranger'),
  ]);
  [workspace, otherWorkspace] = await Promise.all([
    seedWorkspace(owner.id, uniqueLabel('folder-tree')),
    seedWorkspace(owner.id, uniqueLabel('folder-tree-other')),
  ]);
  await Promise.all([seedMember(workspace.id, editor.id, 'member'), seedMember(workspace.id, viewer.id, 'viewer')]);
  [editorClient, viewerClient, strangerClient] = await Promise.all([
    getUserClient(editor),
    getUserClient(viewer),
    getUserClient(stranger),
  ]);
});

afterAll(async () => {
  await deleteAccounts(stranger, viewer, editor, owner);
});

describe('folders', () => {
  describe('GIVEN a root folder holding a subfolder', () => {
    let parentId: string;
    let childId: string;

    beforeEach(async () => {
      parentId = await seedFolder(workspace.id);
      childId = await seedFolder(workspace.id, parentId);
    });

    describe('WHEN the editor moves the parent into its own subfolder', () => {
      let response: IIntegrationResponse;

      beforeEach(async () => {
        response = await editorClient.from('folders').update({ parent_folder_id: childId }).eq('id', parentId);
      });

      test('THEN the cycle is rejected and the parent stays at the root', async () => {
        expect(response.error?.code).toBe('22023');
        expect(response.error?.message).toMatch(/own subfolder/);
        await expect(readFolder(parentId)).resolves.toMatchObject({ parent_folder_id: null });
      });
    });

    describe('WHEN the editor moves the parent into itself', () => {
      let response: IIntegrationResponse;

      beforeEach(async () => {
        response = await editorClient.from('folders').update({ parent_folder_id: parentId }).eq('id', parentId);
      });

      test('THEN the move is rejected', async () => {
        expect(response.error?.code).toBe('22023');
        expect(response.error?.message).toMatch(/into itself/);
        await expect(readFolder(parentId)).resolves.toMatchObject({ parent_folder_id: null });
      });
    });

    describe('WHEN the editor nests the parent with its subfolder inside another root folder', () => {
      let response: IIntegrationResponse;

      beforeEach(async () => {
        const targetId = await seedFolder(workspace.id);
        response = await editorClient.from('folders').update({ parent_folder_id: targetId }).eq('id', parentId);
      });

      test('THEN the depth limit rejects the move', async () => {
        expect(response.error?.code).toBe('22023');
        expect(response.error?.message).toMatch(/one level deep/);
        await expect(readFolder(parentId)).resolves.toMatchObject({ parent_folder_id: null });
      });
    });

    describe('WHEN the editor moves the subfolder into another root folder', () => {
      let targetId: string;
      let response: IIntegrationResponse;

      beforeEach(async () => {
        targetId = await seedFolder(workspace.id);
        response = await editorClient.from('folders').update({ parent_folder_id: targetId }).eq('id', childId);
      });

      test('THEN the subfolder moves under the new parent', async () => {
        expect(response.error).toBeNull();
        await expect(readFolder(childId)).resolves.toMatchObject({ parent_folder_id: targetId });
      });
    });

    describe('WHEN the editor nests another root folder inside the subfolder', () => {
      let rootId: string;
      let response: IIntegrationResponse;

      beforeEach(async () => {
        rootId = await seedFolder(workspace.id);
        response = await editorClient.from('folders').update({ parent_folder_id: childId }).eq('id', rootId);
      });

      test('THEN the depth limit rejects the move', async () => {
        expect(response.error?.code).toBe('22023');
        expect(response.error?.message).toMatch(/one level deep/);
        await expect(readFolder(rootId)).resolves.toMatchObject({ parent_folder_id: null });
      });
    });

    describe('WHEN the editor creates a folder inside the subfolder', () => {
      let response: IIntegrationResponse;

      beforeEach(async () => {
        response = await editorClient
          .from('folders')
          .insert({ workspace_id: workspace.id, parent_folder_id: childId, name: uniqueLabel('too-deep') });
      });

      test('THEN the depth limit rejects the insert', () => {
        expect(response.error?.code).toBe('22023');
        expect(response.error?.message).toMatch(/one level deep/);
      });
    });

    describe('WHEN the editor moves the subfolder back to the root', () => {
      let response: IIntegrationResponse;

      beforeEach(async () => {
        response = await editorClient.from('folders').update({ parent_folder_id: null }).eq('id', childId);
      });

      test('THEN the subfolder becomes a root folder', async () => {
        expect(response.error).toBeNull();
        await expect(readFolder(childId)).resolves.toMatchObject({ parent_folder_id: null });
      });
    });
  });

  describe('GIVEN a folder in another workspace', () => {
    let foreignId: string;
    let folderId: string;

    beforeEach(async () => {
      foreignId = await seedFolder(otherWorkspace.id);
      folderId = await seedFolder(workspace.id);
    });

    describe('WHEN the editor nests a folder of their workspace under it', () => {
      let response: IIntegrationResponse;

      beforeEach(async () => {
        response = await editorClient.from('folders').update({ parent_folder_id: foreignId }).eq('id', folderId);
      });

      test('THEN the cross-workspace parent is rejected', async () => {
        expect(response.error?.code).toBe('22023');
        expect(response.error?.message).toMatch(/own workspace/);
        await expect(readFolder(folderId)).resolves.toMatchObject({ parent_folder_id: null });
      });
    });

    describe('WHEN a signed-in stranger creates a folder under it in the workspace', () => {
      let response: IIntegrationResponse;

      beforeEach(async () => {
        response = await strangerClient
          .from('folders')
          .insert({ workspace_id: workspace.id, parent_folder_id: foreignId, name: uniqueLabel('probe') });
      });

      test('THEN row level security refuses it before anything about the parent is revealed', () => {
        expect(response.error?.code).toBe('42501');
        expect(response.error?.message).toMatch(/row-level security/);
      });
    });

    describe('WHEN a viewer of the workspace creates a folder under it', () => {
      let response: IIntegrationResponse;

      beforeEach(async () => {
        response = await viewerClient
          .from('folders')
          .insert({ workspace_id: workspace.id, parent_folder_id: foreignId, name: uniqueLabel('probe') });
      });

      test('THEN row level security refuses it before anything about the parent is revealed', () => {
        expect(response.error?.code).toBe('42501');
        expect(response.error?.message).toMatch(/row-level security/);
      });
    });
  });

  describe('GIVEN a folder of the workspace and a parent id that does not exist', () => {
    let folderId: string;

    beforeEach(async () => {
      folderId = await seedFolder(workspace.id);
    });

    describe('WHEN the editor nests the folder under the missing parent', () => {
      let response: IIntegrationResponse;

      beforeEach(async () => {
        response = await editorClient
          .from('folders')
          .update({ parent_folder_id: MISSING_FOLDER_ID })
          .eq('id', folderId);
      });

      test('THEN it gets the same answer as a parent in another workspace', async () => {
        expect(response.error?.code).toBe('22023');
        expect(response.error?.message).toMatch(/own workspace/);
        await expect(readFolder(folderId)).resolves.toMatchObject({ parent_folder_id: null });
      });
    });
  });

  describe('GIVEN two root folders', () => {
    let firstId: string;
    let secondId: string;

    beforeEach(async () => {
      [firstId, secondId] = await Promise.all([seedFolder(workspace.id), seedFolder(workspace.id)]);
    });

    describe('WHEN the editor moves each folder into the other at once', () => {
      let responses: IIntegrationResponse[];

      beforeEach(async () => {
        responses = await Promise.all([
          editorClient.from('folders').update({ parent_folder_id: secondId }).eq('id', firstId),
          editorClient.from('folders').update({ parent_folder_id: firstId }).eq('id', secondId),
        ]);
      });

      test('THEN one move wins and no cycle is stored', async () => {
        expect(responses.filter((response) => response.error === null)).toHaveLength(1);
        await expect(Promise.all([readFolder(firstId), readFolder(secondId)])).resolves.toContainEqual(
          expect.objectContaining({ parent_folder_id: null }),
        );
      });
    });
  });
});

describe('threads', () => {
  describe('GIVEN a root thread and a folder in another workspace', () => {
    let threadId: string;
    let foreignId: string;

    beforeEach(async () => {
      threadId = (await seedThread(workspace.id, owner.id)).id;
      foreignId = await seedFolder(otherWorkspace.id);
    });

    describe('WHEN the editor moves the thread into the foreign folder', () => {
      let response: IIntegrationResponse;

      beforeEach(async () => {
        response = await editorClient.from('threads').update({ folder_id: foreignId }).eq('id', threadId);
      });

      test('THEN the cross-workspace folder is rejected and the thread stays at the root', async () => {
        expect(response.error?.code).toBe('22023');
        expect(response.error?.message).toMatch(/own workspace/);
        await expect(readThread(threadId)).resolves.toMatchObject({ folder_id: null });
      });
    });

    describe('WHEN the editor creates a thread inside the foreign folder', () => {
      let response: IIntegrationResponse;

      beforeEach(async () => {
        response = await editorClient
          .from('threads')
          .insert({ workspace_id: workspace.id, folder_id: foreignId, name: uniqueLabel('stray') });
      });

      test('THEN the insert is rejected', () => {
        expect(response.error?.code).toBe('22023');
        expect(response.error?.message).toMatch(/own workspace/);
      });
    });

    describe('WHEN a signed-in stranger creates a thread inside the foreign folder in the workspace', () => {
      let response: IIntegrationResponse;

      beforeEach(async () => {
        response = await strangerClient
          .from('threads')
          .insert({ workspace_id: workspace.id, folder_id: foreignId, name: uniqueLabel('probe') });
      });

      test('THEN row level security refuses it before anything about the folder is revealed', () => {
        expect(response.error?.code).toBe('42501');
        expect(response.error?.message).toMatch(/row-level security/);
      });
    });

    describe('WHEN a viewer of the workspace creates a thread inside the foreign folder', () => {
      let response: IIntegrationResponse;

      beforeEach(async () => {
        response = await viewerClient
          .from('threads')
          .insert({ workspace_id: workspace.id, folder_id: foreignId, name: uniqueLabel('probe') });
      });

      test('THEN row level security refuses it before anything about the folder is revealed', () => {
        expect(response.error?.code).toBe('42501');
        expect(response.error?.message).toMatch(/row-level security/);
      });
    });
  });

  describe('GIVEN a root thread and a folder id that does not exist', () => {
    let threadId: string;

    beforeEach(async () => {
      threadId = (await seedThread(workspace.id, owner.id)).id;
    });

    describe('WHEN the editor moves the thread into the missing folder', () => {
      let response: IIntegrationResponse;

      beforeEach(async () => {
        response = await editorClient.from('threads').update({ folder_id: MISSING_FOLDER_ID }).eq('id', threadId);
      });

      test('THEN it gets the same answer as a folder in another workspace', async () => {
        expect(response.error?.code).toBe('22023');
        expect(response.error?.message).toMatch(/own workspace/);
        await expect(readThread(threadId)).resolves.toMatchObject({ folder_id: null });
      });
    });
  });

  describe('GIVEN a root thread and a folder of the same workspace', () => {
    let threadId: string;
    let folderId: string;

    beforeEach(async () => {
      threadId = (await seedThread(workspace.id, owner.id)).id;
      folderId = await seedFolder(workspace.id);
    });

    describe('WHEN the editor moves the thread into the folder', () => {
      let response: IIntegrationResponse;

      beforeEach(async () => {
        response = await editorClient.from('threads').update({ folder_id: folderId }).eq('id', threadId);
      });

      test('THEN the thread is filed under the folder', async () => {
        expect(response.error).toBeNull();
        await expect(readThread(threadId)).resolves.toMatchObject({ folder_id: folderId });
      });
    });
  });
});
