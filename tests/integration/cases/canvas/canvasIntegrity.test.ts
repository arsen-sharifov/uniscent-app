import type { SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'vitest';

import { TEXT_LENGTH_CAP } from '../../consts';
import type {
  IIntegrationAccount,
  IIntegrationResponse,
  IIntegrationThread,
  IIntegrationWorkspace,
} from '../../interfaces';
import {
  deleteAccounts,
  getAdminClient,
  getUserClient,
  readEdge,
  readNode,
  readNodeComment,
  seedAccount,
  seedEdge,
  seedMember,
  seedMemberWithRole,
  seedNode,
  seedNodeComment,
  seedRole,
  seedThread,
  seedWorkspace,
  uniqueLabel,
} from '../../utils';

let owner: IIntegrationAccount;
let author: IIntegrationAccount;
let stranger: IIntegrationAccount;
let structureManager: IIntegrationAccount;
let ownerClient: SupabaseClient;
let authorClient: SupabaseClient;
let strangerClient: SupabaseClient;
let structureManagerClient: SupabaseClient;
let workspace: IIntegrationWorkspace;
let thread: IIntegrationThread;
let foreignThread: IIntegrationThread;

beforeAll(async () => {
  [owner, author, stranger, structureManager] = await Promise.all([
    seedAccount('owner'),
    seedAccount('author'),
    seedAccount('stranger'),
    seedAccount('structure-manager'),
  ]);
  workspace = await seedWorkspace(owner.id, uniqueLabel('canvas-integrity'));
  const foreignWorkspace = await seedWorkspace(author.id, uniqueLabel('canvas-integrity-foreign'));
  const structureRoleId = await seedRole(workspace.id, 'Structure manager', { canManageStructure: true });
  await Promise.all([
    seedMember(workspace.id, author.id, 'member'),
    seedMemberWithRole(workspace.id, structureManager.id, structureRoleId),
  ]);
  [thread, foreignThread] = await Promise.all([
    seedThread(workspace.id, owner.id),
    seedThread(foreignWorkspace.id, author.id),
  ]);
  [ownerClient, authorClient, strangerClient, structureManagerClient] = await Promise.all([
    getUserClient(owner),
    getUserClient(author),
    getUserClient(stranger),
    getUserClient(structureManager),
  ]);
});

afterAll(async () => {
  await deleteAccounts(structureManager, stranger, author, owner);
});

describe('canvas_nodes', () => {
  describe('GIVEN a node created by a member', () => {
    let nodeId: string;

    beforeEach(async () => {
      nodeId = await seedNode(thread.id, author.id, { label: 'movable' });
    });

    describe('WHEN its author moves it into a thread of another workspace', () => {
      let response: IIntegrationResponse;

      beforeEach(async () => {
        response = await authorClient.from('canvas_nodes').update({ thread_id: foreignThread.id }).eq('id', nodeId);
      });

      test('THEN the thread column is locked and the node stays in place', async () => {
        expect(response.error?.code).toBe('42501');
        await expect(readNode(nodeId)).resolves.toMatchObject({ thread_id: thread.id });
      });
    });

    describe('WHEN its author turns it into a second question node', () => {
      let response: IIntegrationResponse;

      beforeEach(async () => {
        response = await authorClient.from('canvas_nodes').update({ type: 'question-node' }).eq('id', nodeId);
      });

      test('THEN the type column is locked', async () => {
        expect(response.error?.code).toBe('42501');
        await expect(readNode(nodeId)).resolves.toMatchObject({ type: 'canvas-node' });
      });
    });

    describe('WHEN its author points it at a node of another workspace', () => {
      let response: IIntegrationResponse;

      beforeEach(async () => {
        const foreignNodeId = await seedNode(foreignThread.id, author.id);
        response = await authorClient
          .from('canvas_nodes')
          .update({ type: 'reference-node', source_node_id: foreignNodeId })
          .eq('id', nodeId);
      });

      test('THEN the reference columns are locked', async () => {
        expect(response.error?.code).toBe('42501');
        await expect(readNode(nodeId)).resolves.toMatchObject({
          type: 'canvas-node',
          source_node_id: null,
        });
      });
    });

    describe('WHEN the owner reassigns its authorship', () => {
      let response: IIntegrationResponse;

      beforeEach(async () => {
        response = await ownerClient.from('canvas_nodes').update({ created_by: owner.id }).eq('id', nodeId);
      });

      test('THEN the author column is locked', async () => {
        expect(response.error?.code).toBe('42501');
        await expect(readNode(nodeId)).resolves.toMatchObject({ created_by: author.id });
      });
    });

    describe('WHEN its author writes a label past the length cap', () => {
      let response: IIntegrationResponse;

      beforeEach(async () => {
        response = await authorClient
          .from('canvas_nodes')
          .update({ label: 'l'.repeat(TEXT_LENGTH_CAP + 1) })
          .eq('id', nodeId);
      });

      test('THEN the check constraint rejects it and the label stays', async () => {
        expect(response.error?.code).toBe('23514');
        await expect(readNode(nodeId)).resolves.toMatchObject({ label: 'movable' });
      });
    });
  });

  describe('GIVEN the question node of a thread', () => {
    describe('WHEN the owner turns it into a regular node', () => {
      let response: IIntegrationResponse;

      beforeEach(async () => {
        response = await ownerClient
          .from('canvas_nodes')
          .update({ type: 'canvas-node' })
          .eq('id', thread.questionNodeId);
      });

      test('THEN the question node keeps its type', async () => {
        expect(response.error?.code).toBe('42501');
        await expect(readNode(thread.questionNodeId)).resolves.toMatchObject({
          type: 'question-node',
        });
      });
    });

    describe('WHEN a member adds a second question node to the thread', () => {
      let response: IIntegrationResponse;

      beforeEach(async () => {
        response = await authorClient
          .from('canvas_nodes')
          .insert({ thread_id: thread.id, type: 'question-node', label: 'second question' });
      });

      test('THEN the insert is denied by row level security', () => {
        expect(response.error?.code).toBe('42501');
      });
    });

    describe('WHEN a second question node bypasses row level security', () => {
      let response: IIntegrationResponse;

      beforeEach(async () => {
        response = await getAdminClient()
          .from('canvas_nodes')
          .insert({ thread_id: thread.id, type: 'question-node', label: 'racing question', created_by: owner.id });
      });

      test('THEN the one question per thread index rejects it', () => {
        expect(response.error?.code).toBe('23505');
      });
    });
  });

  describe('GIVEN a member holding canvas edit permission', () => {
    describe('WHEN they insert a node attributed to the owner', () => {
      let response: IIntegrationResponse;

      beforeEach(async () => {
        response = await authorClient
          .from('canvas_nodes')
          .insert({ thread_id: thread.id, type: 'canvas-node', label: 'forged', created_by: owner.id });
      });

      test('THEN the forged authorship is denied by row level security', () => {
        expect(response.error?.code).toBe('42501');
      });
    });

    describe('WHEN they insert a node without an author', () => {
      let response: IIntegrationResponse;

      beforeEach(async () => {
        response = await authorClient
          .from('canvas_nodes')
          .insert({ thread_id: thread.id, type: 'canvas-node', label: 'anonymous', created_by: null });
      });

      test('THEN the missing authorship is denied by row level security', () => {
        expect(response.error?.code).toBe('42501');
      });
    });

    describe('WHEN they insert a node with a label at the length cap', () => {
      let response: IIntegrationResponse;

      beforeEach(async () => {
        response = await authorClient
          .from('canvas_nodes')
          .insert({ thread_id: thread.id, type: 'canvas-node', label: 'l'.repeat(TEXT_LENGTH_CAP) });
      });

      test('THEN the node is stored', () => {
        expect(response.error).toBeNull();
      });
    });

    describe('WHEN they insert a node with a label past the length cap', () => {
      let response: IIntegrationResponse;

      beforeEach(async () => {
        response = await authorClient
          .from('canvas_nodes')
          .insert({ thread_id: thread.id, type: 'canvas-node', label: 'l'.repeat(TEXT_LENGTH_CAP + 1) });
      });

      test('THEN the check constraint rejects it', () => {
        expect(response.error?.code).toBe('23514');
      });
    });
  });

  describe('GIVEN a member holding structure permission without canvas edit permission', () => {
    describe('WHEN they create a thread and its question node the way the app does', () => {
      let response: IIntegrationResponse;

      beforeEach(async () => {
        const created = await structureManagerClient
          .from('threads')
          .insert({ workspace_id: workspace.id, name: uniqueLabel('thread') })
          .select('id')
          .single<{ id: string }>();
        response = await structureManagerClient
          .from('canvas_nodes')
          .insert({ thread_id: created.data!.id, type: 'question-node', label: '' });
      });

      test('THEN the first question node is stored', () => {
        expect(response.error).toBeNull();
      });
    });

    describe('WHEN they add a regular node to a thread', () => {
      let response: IIntegrationResponse;

      beforeEach(async () => {
        response = await structureManagerClient
          .from('canvas_nodes')
          .insert({ thread_id: thread.id, type: 'canvas-node', label: 'not an editor' });
      });

      test('THEN the insert is denied by row level security', () => {
        expect(response.error?.code).toBe('42501');
      });
    });
  });

  describe('GIVEN a regular node in the thread and one in another workspace of the member', () => {
    let localNodeId: string;
    let foreignNodeId: string;

    beforeEach(async () => {
      [localNodeId, foreignNodeId] = await Promise.all([
        seedNode(thread.id, author.id),
        seedNode(foreignThread.id, author.id),
      ]);
    });

    describe('WHEN the member references the node of the same workspace', () => {
      let response: IIntegrationResponse;

      beforeEach(async () => {
        response = await authorClient
          .from('canvas_nodes')
          .insert({ thread_id: thread.id, type: 'reference-node', source_node_id: localNodeId });
      });

      test('THEN the reference is stored', () => {
        expect(response.error).toBeNull();
      });
    });

    describe('WHEN the member references the node of the other workspace', () => {
      let response: IIntegrationResponse;

      beforeEach(async () => {
        response = await authorClient
          .from('canvas_nodes')
          .insert({ thread_id: thread.id, type: 'reference-node', source_node_id: foreignNodeId });
      });

      test('THEN the cross-workspace reference is denied by row level security', () => {
        expect(response.error?.code).toBe('42501');
      });
    });
  });
});

describe('canvas_edges', () => {
  describe('GIVEN two nodes of the same thread', () => {
    let sourceId: string;
    let targetId: string;

    beforeEach(async () => {
      [sourceId, targetId] = await Promise.all([seedNode(thread.id, author.id), seedNode(thread.id, author.id)]);
    });

    describe('WHEN a member connects them under the owner name', () => {
      let response: IIntegrationResponse;

      beforeEach(async () => {
        response = await authorClient.from('canvas_edges').insert({
          thread_id: thread.id,
          source_node_id: sourceId,
          target_node_id: targetId,
          source_handle: 'right',
          target_handle: 'left',
          created_by: owner.id,
        });
      });

      test('THEN the forged authorship is denied by row level security', () => {
        expect(response.error?.code).toBe('42501');
      });
    });

    describe('WHEN a member connects them without an author', () => {
      let response: IIntegrationResponse;

      beforeEach(async () => {
        response = await authorClient.from('canvas_edges').insert({
          thread_id: thread.id,
          source_node_id: sourceId,
          target_node_id: targetId,
          source_handle: 'right',
          target_handle: 'left',
          created_by: null,
        });
      });

      test('THEN the missing authorship is denied by row level security', () => {
        expect(response.error?.code).toBe('42501');
      });
    });
  });

  describe('GIVEN an edge between two nodes of the thread', () => {
    let targetId: string;
    let otherId: string;
    let edgeId: string;

    beforeEach(async () => {
      const sourceId = await seedNode(thread.id, author.id);
      [targetId, otherId] = await Promise.all([seedNode(thread.id, author.id), seedNode(thread.id, author.id)]);
      edgeId = await seedEdge(thread.id, sourceId, targetId, author.id);
    });

    describe('WHEN its author re-points it at another node', () => {
      let response: IIntegrationResponse;

      beforeEach(async () => {
        response = await authorClient.from('canvas_edges').update({ target_node_id: otherId }).eq('id', edgeId);
      });

      test('THEN edges cannot be updated and the edge keeps its target', async () => {
        expect(response.error?.code).toBe('42501');
        await expect(readEdge(edgeId)).resolves.toMatchObject({
          target_node_id: targetId,
        });
      });
    });
  });
});

describe('update_canvas_node_positions', () => {
  describe('GIVEN a node at the origin', () => {
    let nodeId: string;

    beforeEach(async () => {
      nodeId = await seedNode(thread.id, author.id);
    });

    describe('WHEN a member submits non-finite coordinates', () => {
      let response: IIntegrationResponse;

      beforeEach(async () => {
        response = await authorClient.rpc('update_canvas_node_positions', {
          updates: [{ id: nodeId, position_x: 'NaN', position_y: 'Infinity' }],
        });
      });

      test('THEN the check constraint rejects them and the node stays put', async () => {
        expect(response.error?.code).toBe('23514');
        await expect(readNode(nodeId)).resolves.toMatchObject({ position_x: 0, position_y: 0 });
      });
    });
  });
});

describe('node_comments', () => {
  describe('GIVEN a comment written by a member', () => {
    let nodeId: string;
    let otherNodeId: string;
    let commentId: string;

    beforeEach(async () => {
      [nodeId, otherNodeId] = await Promise.all([seedNode(thread.id, author.id), seedNode(thread.id, owner.id)]);
      commentId = await seedNodeComment(nodeId, author.id, 'first thought');
    });

    describe('WHEN its author edits the text', () => {
      let response: IIntegrationResponse;

      beforeEach(async () => {
        response = await authorClient.from('node_comments').update({ text: 'second thought' }).eq('id', commentId);
      });

      test('THEN the new text is persisted', async () => {
        expect(response.error).toBeNull();
        await expect(readNodeComment(commentId)).resolves.toMatchObject({ text: 'second thought' });
      });
    });

    describe('WHEN its author moves it onto another node', () => {
      let response: IIntegrationResponse;

      beforeEach(async () => {
        response = await authorClient.from('node_comments').update({ node_id: otherNodeId }).eq('id', commentId);
      });

      test('THEN the node column is locked', async () => {
        expect(response.error?.code).toBe('42501');
        await expect(readNodeComment(commentId)).resolves.toMatchObject({ node_id: nodeId });
      });
    });

    describe('WHEN someone other than its author deletes it', () => {
      beforeEach(async () => {
        await ownerClient.from('node_comments').delete().eq('id', commentId);
      });

      test('THEN the comment survives', async () => {
        await expect(readNodeComment(commentId)).resolves.not.toBeNull();
      });
    });

    describe('WHEN its author edits the text past the length cap', () => {
      let response: IIntegrationResponse;

      beforeEach(async () => {
        response = await authorClient
          .from('node_comments')
          .update({ text: 'c'.repeat(TEXT_LENGTH_CAP + 1) })
          .eq('id', commentId);
      });

      test('THEN the check constraint rejects it and the text stays', async () => {
        expect(response.error?.code).toBe('23514');
        await expect(readNodeComment(commentId)).resolves.toMatchObject({ text: 'first thought' });
      });
    });
  });

  describe('GIVEN a node open for comments', () => {
    let nodeId: string;

    beforeEach(async () => {
      nodeId = await seedNode(thread.id, author.id);
    });

    describe('WHEN a member posts a comment past the length cap', () => {
      let response: IIntegrationResponse;

      beforeEach(async () => {
        response = await authorClient
          .from('node_comments')
          .insert({ node_id: nodeId, author_id: author.id, text: 'c'.repeat(TEXT_LENGTH_CAP + 1) });
      });

      test('THEN the check constraint rejects it', () => {
        expect(response.error?.code).toBe('23514');
      });
    });
  });
});

describe('canvas_comments', () => {
  describe('GIVEN a thread of the workspace', () => {
    describe('WHEN a member posts a thread comment past the length cap', () => {
      let response: IIntegrationResponse;

      beforeEach(async () => {
        response = await authorClient
          .from('canvas_comments')
          .insert({ thread_id: thread.id, author_id: author.id, text: 'c'.repeat(TEXT_LENGTH_CAP + 1) });
      });

      test('THEN the check constraint rejects it', () => {
        expect(response.error?.code).toBe('23514');
      });
    });
  });
});

describe('can_reference_canvas_node', () => {
  describe('GIVEN a node and a thread of a workspace the caller does not belong to', () => {
    let nodeId: string;

    beforeEach(async () => {
      nodeId = await seedNode(thread.id, author.id);
    });

    describe('WHEN a stranger probes whether they share a workspace', () => {
      let response: IIntegrationResponse<boolean>;

      beforeEach(async () => {
        response = await strangerClient.rpc('can_reference_canvas_node', {
          source_id: nodeId,
          target_thread_id: thread.id,
        });
      });

      test('THEN the helper reveals nothing', () => {
        expect(response.error).toBeNull();
        expect(response.data).toBe(false);
      });
    });
  });
});

describe('thread_has_question_node', () => {
  describe('GIVEN the question node of a thread', () => {
    describe('WHEN a stranger probes the thread', () => {
      let response: IIntegrationResponse<boolean>;

      beforeEach(async () => {
        response = await strangerClient.rpc('thread_has_question_node', { p_thread_id: thread.id });
      });

      test('THEN the helper reveals nothing', () => {
        expect(response.error).toBeNull();
        expect(response.data).toBe(false);
      });
    });

    describe('WHEN a member of the workspace asks', () => {
      let response: IIntegrationResponse<boolean>;

      beforeEach(async () => {
        response = await authorClient.rpc('thread_has_question_node', { p_thread_id: thread.id });
      });

      test('THEN the question node is reported', () => {
        expect(response.error).toBeNull();
        expect(response.data).toBe(true);
      });
    });
  });
});
