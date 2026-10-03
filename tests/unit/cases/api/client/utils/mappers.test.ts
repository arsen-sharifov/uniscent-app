import { describe, expect, test } from 'vitest';

import {
  toComment,
  toFolder,
  toMyInvitation,
  toMyWorkspace,
  toNodeReference,
  toOnboardingProgress,
  toReferenceTargetMeta,
  toThread,
  toWorkspace,
  toWorkspaceAccess,
  toWorkspaceInvitation,
  toWorkspaceMember,
  toWorkspaceRole,
} from '@api/client';
import {
  canvasNodeWithThreadRow,
  folderRow,
  myInvitationRow,
  myWorkspaceRow,
  nodeCommentRow,
  threadRow,
  workspaceAccessRow,
  workspaceInvitationRow,
  workspaceMemberRow,
  workspaceRoleRow,
  workspaceRow,
} from '@mocks/rows';

describe('toWorkspace', () => {
  describe('GIVEN a workspace row', () => {
    describe('WHEN it is mapped', () => {
      test('THEN every column maps to camel case', () => {
        expect(toWorkspace(workspaceRow())).toEqual({
          id: 'ws-1',
          name: 'Workspace',
          ownerId: 'user-1',
          createdAt: '2026-01-01T00:00:00Z',
        });
      });
    });
  });
});

describe('toMyWorkspace', () => {
  describe('GIVEN a my-workspace row', () => {
    describe('WHEN it is mapped', () => {
      test('THEN the manage flag is carried over', () => {
        expect(toMyWorkspace(myWorkspaceRow({ can_manage_workspace: true }))).toEqual({
          id: 'ws-1',
          name: 'Workspace',
          canManageWorkspace: true,
        });
      });
    });
  });
});

describe('toWorkspaceAccess', () => {
  describe('GIVEN an access row', () => {
    describe('WHEN it is mapped', () => {
      test('THEN all seven permission flags map to camel case', () => {
        expect(toWorkspaceAccess(workspaceAccessRow({ is_owner: true, can_manage_roles: true }))).toEqual({
          isOwner: true,
          canEditCanvas: true,
          canComment: true,
          canManageStructure: false,
          canManageMembers: false,
          canManageRoles: true,
          canManageWorkspace: false,
        });
      });
    });
  });
});

describe('toFolder', () => {
  describe('GIVEN a nested folder row', () => {
    describe('WHEN it is mapped', () => {
      test('THEN the parent folder is preserved', () => {
        expect(toFolder(folderRow({ parent_folder_id: 'folder-0' }))).toMatchObject({
          parentFolderId: 'folder-0',
          workspaceId: 'ws-1',
        });
      });
    });
  });

  describe('GIVEN a root folder row', () => {
    describe('WHEN it is mapped', () => {
      test('THEN the parent falls back to null', () => {
        expect(toFolder(folderRow())).toMatchObject({ parentFolderId: null });
      });
    });
  });
});

describe('toThread', () => {
  describe('GIVEN a thread row', () => {
    describe('WHEN it is mapped', () => {
      test('THEN the resolved flag defaults to false', () => {
        expect(toThread(threadRow({ folder_id: 'folder-1' }))).toEqual({
          id: 'th-1',
          workspaceId: 'ws-1',
          folderId: 'folder-1',
          name: 'Thread',
          position: 0,
          resolved: false,
        });
      });
    });
  });
});

describe('toComment', () => {
  describe('GIVEN a comment row', () => {
    describe('WHEN it is mapped', () => {
      test('THEN the author id maps to camel case', () => {
        expect(toComment(nodeCommentRow())).toEqual({ id: 'c-1', text: 'Comment', authorId: 'user-1' });
      });
    });
  });
});

describe('toReferenceTargetMeta', () => {
  describe('GIVEN a node row with its thread relation', () => {
    describe('WHEN it is mapped', () => {
      test('THEN the thread and workspace names are carried over', () => {
        expect(toReferenceTargetMeta(canvasNodeWithThreadRow())).toEqual({
          nodeLabel: 'Origin node',
          threadId: 'th-1',
          threadName: 'Thread',
          workspaceId: 'ws-1',
          workspaceName: 'Workspace',
        });
      });
    });
  });

  describe('GIVEN a node row without the thread relation', () => {
    describe('WHEN it is mapped', () => {
      test('THEN it falls back to the raw thread id and empty names', () => {
        expect(toReferenceTargetMeta(canvasNodeWithThreadRow({ threads: null }))).toEqual({
          nodeLabel: 'Origin node',
          threadId: 'th-1',
          threadName: '',
          workspaceId: '',
          workspaceName: '',
        });
      });
    });
  });
});

describe('toNodeReference', () => {
  describe('GIVEN a node row with its thread relation', () => {
    describe('WHEN it is mapped', () => {
      test('THEN the node id and label join the thread meta', () => {
        expect(toNodeReference(canvasNodeWithThreadRow())).toEqual({
          id: 'n1',
          label: 'Origin node',
          threadId: 'th-1',
          threadName: 'Thread',
          workspaceId: 'ws-1',
          workspaceName: 'Workspace',
        });
      });
    });
  });

  describe('GIVEN a row where the raw thread id and the relation diverge', () => {
    describe('WHEN it is mapped', () => {
      test('THEN the relation id wins over the raw column', () => {
        const row = canvasNodeWithThreadRow({
          thread_id: 'stale',
          threads: { id: 'th-9', name: 'Thread', workspace_id: 'ws-1', workspaces: { name: 'Workspace' } },
        });

        expect(toNodeReference(row)).toMatchObject({ threadId: 'th-9' });
      });
    });
  });
});

describe('toWorkspaceRole', () => {
  describe('GIVEN a role row', () => {
    describe('WHEN it is mapped', () => {
      test('THEN the permissions and the member count map over', () => {
        expect(toWorkspaceRole(workspaceRoleRow())).toEqual({
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
        });
      });
    });
  });
});

describe('toWorkspaceMember', () => {
  describe('GIVEN a member row with a known avatar icon', () => {
    describe('WHEN it is mapped', () => {
      test('THEN the icon is preserved', () => {
        expect(toWorkspaceMember(workspaceMemberRow())).toMatchObject({ avatarIcon: 'cat', name: 'Arsen' });
      });
    });
  });

  describe('GIVEN a member row with an unknown avatar icon', () => {
    describe('WHEN it is mapped', () => {
      test('THEN the icon falls back to null', () => {
        expect(toWorkspaceMember(workspaceMemberRow({ avatar_icon: 'unicorn' }))).toMatchObject({ avatarIcon: null });
      });
    });
  });

  describe('GIVEN a member row without a name', () => {
    describe('WHEN it is mapped', () => {
      test('THEN the name falls back to an empty string', () => {
        expect(toWorkspaceMember(workspaceMemberRow({ name: null }))).toMatchObject({ name: '' });
      });
    });
  });
});

describe('toWorkspaceInvitation', () => {
  describe('GIVEN an invitation row', () => {
    describe('WHEN it is mapped', () => {
      test('THEN the role and email map over', () => {
        expect(toWorkspaceInvitation(workspaceInvitationRow())).toEqual({
          id: 'inv-1',
          email: 'invitee@example.com',
          roleId: 'role-1',
          roleKey: 'member',
          roleName: 'Member',
          createdAt: '2026-01-01T00:00:00Z',
        });
      });
    });
  });
});

describe('toMyInvitation', () => {
  describe('GIVEN an incoming invitation row', () => {
    describe('WHEN it is mapped', () => {
      test('THEN the workspace and inviter map over', () => {
        expect(toMyInvitation(myInvitationRow())).toEqual({
          id: 'inv-1',
          workspaceId: 'ws-1',
          workspaceName: 'Workspace',
          roleKey: 'member',
          roleName: 'Member',
          invitedByName: 'Owner',
          createdAt: '2026-01-01T00:00:00Z',
        });
      });
    });
  });
});

describe('toOnboardingProgress', () => {
  describe('GIVEN an onboarding row listing a retired guide id', () => {
    describe('WHEN it is mapped', () => {
      test('THEN the flags map to camel case and unknown guides are dropped', () => {
        expect(toOnboardingProgress({ offer_answered: true, completed_guides: ['base', 'retired', 'canvas'] })).toEqual(
          {
            offerAnswered: true,
            completedGuides: ['base', 'canvas'],
          },
        );
      });
    });
  });
});
