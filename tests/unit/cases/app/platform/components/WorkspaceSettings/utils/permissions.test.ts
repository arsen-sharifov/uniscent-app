import { describe, expect, test } from 'vitest';

import {
  COMMENT_ACCESS,
  EDIT_ACCESS,
  FULL_ACCESS,
  READONLY_ACCESS,
  ROLE_PERMISSIONS,
  workspaceInvitation,
  workspaceRole,
} from '@mocks/roles';
import {
  canGrantPermission,
  canGrantRole,
  canReassignRoleHolders,
} from '@/app/platform/components/WorkspaceSettings/utils';

const MEMBER_MANAGER_ACCESS = { ...COMMENT_ACCESS, canManageMembers: true };

describe('canGrantPermission', () => {
  describe('GIVEN the workspace owner', () => {
    describe('WHEN any permission is checked', () => {
      test('THEN the owner may grant it', () => {
        expect(canGrantPermission('canManageWorkspace', { ...READONLY_ACCESS, isOwner: true })).toBe(true);
      });
    });
  });

  describe('GIVEN a granter holding only edit rights', () => {
    describe('WHEN a held and a missing permission are checked', () => {
      test('THEN only the held one may be granted', () => {
        expect(canGrantPermission('canEditCanvas', EDIT_ACCESS)).toBe(true);
        expect(canGrantPermission('canManageRoles', EDIT_ACCESS)).toBe(false);
      });
    });
  });

  describe('GIVEN no known granter', () => {
    describe('WHEN a permission is checked', () => {
      test('THEN nothing may be granted', () => {
        expect(canGrantPermission('canComment', null)).toBe(false);
      });
    });
  });
});

describe('canGrantRole', () => {
  describe('GIVEN a granter holding edit and comment rights', () => {
    describe('WHEN roles inside and above that ceiling are checked', () => {
      test('THEN only the subset role is grantable', () => {
        expect(canGrantRole(COMMENT_ACCESS, EDIT_ACCESS)).toBe(true);
        expect(canGrantRole(ROLE_PERMISSIONS, EDIT_ACCESS)).toBe(false);
      });
    });

    describe('WHEN a role without any permission is checked', () => {
      test('THEN it is grantable', () => {
        expect(canGrantRole(READONLY_ACCESS, EDIT_ACCESS)).toBe(true);
      });
    });
  });

  describe('GIVEN the workspace owner', () => {
    describe('WHEN a role with every permission is checked', () => {
      test('THEN the owner bypasses the ceiling', () => {
        expect(canGrantRole(FULL_ACCESS, { ...READONLY_ACCESS, isOwner: true })).toBe(true);
      });
    });
  });

  describe('GIVEN no known granter', () => {
    describe('WHEN a role without any permission is checked', () => {
      test('THEN it is still not grantable', () => {
        expect(canGrantRole(READONLY_ACCESS, null)).toBe(false);
      });
    });
  });
});

describe('canReassignRoleHolders', () => {
  describe('GIVEN a member manager who cannot grant the fallback role', () => {
    describe('WHEN a role nobody holds is checked', () => {
      test('THEN its deletion moves nobody and stays allowed', () => {
        expect(
          canReassignRoleHolders(
            workspaceRole('role-quiet', { memberCount: 0 }),
            ROLE_PERMISSIONS,
            [],
            MEMBER_MANAGER_ACCESS,
          ),
        ).toBe(true);
      });
    });

    describe('WHEN a role with members is checked', () => {
      test('THEN its members cannot be moved to the fallback role', () => {
        expect(canReassignRoleHolders(workspaceRole('role-quiet'), ROLE_PERMISSIONS, [], MEMBER_MANAGER_ACCESS)).toBe(
          false,
        );
      });
    });

    describe('WHEN a role held only by a pending invitation is checked', () => {
      test('THEN the invitation cannot be moved to the fallback role', () => {
        expect(
          canReassignRoleHolders(
            workspaceRole('role-quiet', { memberCount: 0 }),
            ROLE_PERMISSIONS,
            [{ ...workspaceInvitation('inv-1'), roleId: 'role-quiet' }],
            MEMBER_MANAGER_ACCESS,
          ),
        ).toBe(false);
      });
    });
  });

  describe('GIVEN a granter who can neither grant the fallback role nor read pending invitations', () => {
    describe('WHEN a role without members is checked', () => {
      test('THEN it may still hold pending invitations, so its holders cannot be moved', () => {
        expect(
          canReassignRoleHolders(workspaceRole('role-quiet', { memberCount: 0 }), ROLE_PERMISSIONS, [], COMMENT_ACCESS),
        ).toBe(false);
      });
    });
  });

  describe('GIVEN a granter who holds every permission of the fallback role', () => {
    describe('WHEN a role with members is checked', () => {
      test('THEN its members can be moved', () => {
        expect(
          canReassignRoleHolders(workspaceRole('role-quiet'), ROLE_PERMISSIONS, [], {
            ...READONLY_ACCESS,
            ...ROLE_PERMISSIONS,
          }),
        ).toBe(true);
      });
    });
  });

  describe('GIVEN a workspace without a fallback role', () => {
    describe('WHEN a role with members is checked', () => {
      test('THEN its members have nowhere to go', () => {
        expect(canReassignRoleHolders(workspaceRole('role-quiet'), undefined, [], FULL_ACCESS)).toBe(false);
      });
    });
  });
});
