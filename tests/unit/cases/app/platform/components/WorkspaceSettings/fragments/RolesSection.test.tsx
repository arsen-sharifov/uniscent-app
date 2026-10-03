import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { IWorkspaceInvitation, IWorkspaceRole } from '@interfaces';

import { TRANSLATIONS } from '@mocks/i18n';
import { FULL_ACCESS, workspaceInvitation, workspaceRole } from '@mocks/roles';
import { RolesSection } from '@/app/platform/components/WorkspaceSettings/fragments';

vi.mock('@/i18n', () => import('@mocks/i18n'));

const OWNER_ROLE = workspaceRole('role-owner', { ...FULL_ACCESS, key: 'owner', name: 'Owner', isSystem: true });
const MEMBER_ROLE = workspaceRole('role-member', { key: 'member', name: 'Member', isSystem: true });
const MANAGER_ROLE = workspaceRole('role-manager', { name: 'Manager', canManageRoles: true });
const HELPER_ROLE = workspaceRole('role-helper', { name: 'Helper' });
const ADMIN_ROLE = workspaceRole('role-admin', { name: 'Admin', canManageWorkspace: true });

const COMMENT_ONLY = { canEditCanvas: false, canManageStructure: false };
const STEWARD_ROLE = workspaceRole('role-steward', { ...COMMENT_ONLY, name: 'Steward', canManageRoles: true });
const MEMBER_STEWARD_ROLE = { ...STEWARD_ROLE, canManageMembers: true };
const HELD_ROLE = workspaceRole('role-held', { ...COMMENT_ONLY, name: 'Held' });
const EMPTY_ROLE = workspaceRole('role-empty', { ...COMMENT_ONLY, name: 'Empty', memberCount: 0 });

const ROLES = [OWNER_ROLE, MEMBER_ROLE, MANAGER_ROLE, HELPER_ROLE, ADMIN_ROLE];

const STEWARD_ROLES = [OWNER_ROLE, MEMBER_ROLE, STEWARD_ROLE, HELD_ROLE, EMPTY_ROLE];

const renderSection = (
  currentRole: IWorkspaceRole,
  roles: IWorkspaceRole[] = ROLES,
  invitations: IWorkspaceInvitation[] = [],
) =>
  render(
    <RolesSection
      roles={roles}
      invitations={invitations}
      currentRole={currentRole}
      canManageRoles
      onCreateRole={vi.fn()}
      onUpdateRole={vi.fn()}
      onDeleteRole={vi.fn()}
    />,
  );

const actionButtons = (name: string) => screen.queryAllByRole('button', { name });

describe('RolesSection', () => {
  describe('GIVEN a role manager without workspace management', () => {
    beforeEach(() => {
      renderSection(MANAGER_ROLE);
    });

    describe('WHEN the role list renders', () => {
      test('THEN only the custom roles inside their ceiling offer edit and delete', () => {
        expect(actionButtons(TRANSLATIONS.platform.workspaceSettings.roles.edit)).toHaveLength(2);
        expect(actionButtons(TRANSLATIONS.platform.workspaceSettings.roles.delete)).toHaveLength(2);
      });
    });
  });

  describe('GIVEN the workspace owner', () => {
    beforeEach(() => {
      renderSection(OWNER_ROLE);
    });

    describe('WHEN the role list renders', () => {
      test('THEN every custom role offers edit and delete', () => {
        expect(actionButtons(TRANSLATIONS.platform.workspaceSettings.roles.edit)).toHaveLength(3);
        expect(actionButtons(TRANSLATIONS.platform.workspaceSettings.roles.delete)).toHaveLength(3);
      });
    });
  });

  describe('GIVEN a role steward who can neither grant the Member role nor read pending invitations', () => {
    beforeEach(() => {
      renderSection(STEWARD_ROLE, STEWARD_ROLES);
    });

    describe('WHEN the role list renders', () => {
      test('THEN every role inside the ceiling stays editable', () => {
        expect(actionButtons(TRANSLATIONS.platform.workspaceSettings.roles.edit)).toHaveLength(3);
      });

      test('THEN no role offers delete, since even the role without members may hold pending invitations', () => {
        expect(actionButtons(TRANSLATIONS.platform.workspaceSettings.roles.delete)).toHaveLength(0);
      });
    });
  });

  describe('GIVEN a role steward who manages members but cannot grant the Member role', () => {
    beforeEach(() => {
      renderSection(MEMBER_STEWARD_ROLE, STEWARD_ROLES);
    });

    describe('WHEN the role list renders', () => {
      test('THEN only the role nobody holds offers delete, since holders would fall back to Member', () => {
        expect(actionButtons(TRANSLATIONS.platform.workspaceSettings.roles.delete)).toHaveLength(1);
      });
    });
  });

  describe('GIVEN a role steward who manages members but cannot grant the Member role, with an invitation pending on the empty role', () => {
    beforeEach(() => {
      renderSection(MEMBER_STEWARD_ROLE, STEWARD_ROLES, [{ ...workspaceInvitation('inv-1'), roleId: 'role-empty' }]);
    });

    describe('WHEN the role list renders', () => {
      test('THEN no role offers delete', () => {
        expect(actionButtons(TRANSLATIONS.platform.workspaceSettings.roles.delete)).toHaveLength(0);
      });
    });
  });
});
