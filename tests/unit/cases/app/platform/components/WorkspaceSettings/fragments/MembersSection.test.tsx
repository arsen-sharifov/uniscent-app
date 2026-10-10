import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { IWorkspaceRole } from '@interfaces';

import { TRANSLATIONS } from '@mocks/i18n';
import { FULL_ACCESS, workspaceInvitation, workspaceMember, workspaceRole } from '@mocks/roles';
import { MembersSection } from '@/app/platform/components/WorkspaceSettings/fragments';

vi.mock('@/i18n', () => import('@mocks/i18n'));

const OWNER_ROLE = workspaceRole('role-owner', { ...FULL_ACCESS, key: 'owner', name: 'Owner', isSystem: true });
const ADMIN_ROLE = workspaceRole('role-admin', { name: 'Admin', canManageMembers: true, canManageRoles: true });
const MANAGER_ROLE = workspaceRole('role-manager', { name: 'Manager', canManageMembers: true });
const MEMBER_ROLE = workspaceRole('role-member', { key: 'member', name: 'Member', isSystem: true });
const VIEWER_ROLE = workspaceRole('role-viewer', {
  key: 'viewer',
  name: 'Viewer',
  isSystem: true,
  canEditCanvas: false,
  canComment: false,
  canManageStructure: false,
});

const ROLES = [OWNER_ROLE, ADMIN_ROLE, MANAGER_ROLE, MEMBER_ROLE, VIEWER_ROLE];

const MEMBERS = [
  workspaceMember('u-owner', 'role-owner', { isOwner: true, roleKey: 'owner' }),
  workspaceMember('u-self', 'role-manager'),
  workspaceMember('u-member', 'role-member', { roleKey: 'member' }),
  workspaceMember('u-admin', 'role-admin', { roleName: 'Admin' }),
];

const INVITATIONS = [
  workspaceInvitation('inv-member'),
  { ...workspaceInvitation('inv-admin'), roleId: 'role-admin', roleKey: null, roleName: 'Admin' },
];

const onAssignRole = vi.fn();

const renderSection = (currentUserId: string, currentRole: IWorkspaceRole) =>
  render(
    <MembersSection
      members={MEMBERS}
      roles={ROLES}
      invitations={INVITATIONS}
      currentUserId={currentUserId}
      currentRole={currentRole}
      canManageMembers
      onAssignRole={onAssignRole}
      onRemoveMember={vi.fn()}
      onTransferOwnership={vi.fn()}
      onInvite={vi.fn()}
      onRevokeInvitation={vi.fn()}
    />,
  );

const optionNames = () => screen.getAllByRole('option').map((option) => option.textContent);

const changeRoleLabel = (roleName: string) =>
  `${TRANSLATIONS.platform.workspaceSettings.members.changeRole}: ${roleName}`;

describe('MembersSection', () => {
  describe('GIVEN a member manager who cannot manage roles', () => {
    beforeEach(() => {
      renderSection('u-self', MANAGER_ROLE);
    });

    describe('WHEN the role picker of a member opens', () => {
      beforeEach(() => {
        fireEvent.click(
          screen.getByRole('button', {
            name: changeRoleLabel(TRANSLATIONS.platform.workspaceSettings.roleNames.member),
          }),
        );
      });

      test('THEN only roles inside the manager ceiling are offered', () => {
        expect(optionNames()).toEqual([
          'Manager',
          TRANSLATIONS.platform.workspaceSettings.roleNames.member,
          TRANSLATIONS.platform.workspaceSettings.roleNames.viewer,
        ]);
      });
    });

    describe('WHEN the member list renders', () => {
      test('THEN a member above the manager ceiling shows a read-only role without a remove action', () => {
        expect(screen.queryByRole('button', { name: changeRoleLabel('Admin') })).not.toBeInTheDocument();
        expect(screen.getAllByText('Admin')).toHaveLength(2);
        expect(
          screen.getAllByRole('button', { name: TRANSLATIONS.platform.workspaceSettings.members.remove }),
        ).toHaveLength(1);
      });

      test('THEN only the invitation inside the manager ceiling can be revoked', () => {
        expect(
          screen.getAllByRole('button', { name: TRANSLATIONS.platform.workspaceSettings.members.revoke }),
        ).toHaveLength(1);
      });
    });

    describe('WHEN the invite role picker opens', () => {
      beforeEach(() => {
        fireEvent.click(
          screen.getByRole('button', {
            name: `${TRANSLATIONS.platform.workspaceSettings.general.roleStat}: ${TRANSLATIONS.platform.workspaceSettings.roleNames.member}`,
          }),
        );
      });

      test('THEN invitations offer only grantable roles', () => {
        expect(optionNames()).toEqual([
          'Manager',
          TRANSLATIONS.platform.workspaceSettings.roleNames.member,
          TRANSLATIONS.platform.workspaceSettings.roleNames.viewer,
        ]);
      });
    });

    describe('WHEN a member is moved to a grantable role', () => {
      beforeEach(() => {
        fireEvent.click(
          screen.getByRole('button', {
            name: changeRoleLabel(TRANSLATIONS.platform.workspaceSettings.roleNames.member),
          }),
        );
        fireEvent.click(screen.getByRole('option', { name: TRANSLATIONS.platform.workspaceSettings.roleNames.viewer }));
      });

      test('THEN the new role is assigned', () => {
        expect(onAssignRole).toHaveBeenCalledExactlyOnceWith('u-member', 'role-viewer');
      });
    });

    describe('WHEN the current role of a member is picked again', () => {
      beforeEach(() => {
        fireEvent.click(
          screen.getByRole('button', {
            name: changeRoleLabel(TRANSLATIONS.platform.workspaceSettings.roleNames.member),
          }),
        );
        fireEvent.click(screen.getByRole('option', { name: TRANSLATIONS.platform.workspaceSettings.roleNames.member }));
      });

      test('THEN nothing is assigned and the picker closes', () => {
        expect(onAssignRole).not.toHaveBeenCalled();
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      });
    });
  });

  describe('GIVEN the workspace owner', () => {
    beforeEach(() => {
      renderSection('u-owner', OWNER_ROLE);
    });

    describe('WHEN the member list renders', () => {
      test('THEN every other member can be re-roled and removed', () => {
        expect(screen.getByRole('button', { name: changeRoleLabel('Admin') })).toBeInTheDocument();
        expect(
          screen.getAllByRole('button', { name: TRANSLATIONS.platform.workspaceSettings.members.remove }),
        ).toHaveLength(3);
        expect(
          screen.getAllByRole('button', { name: TRANSLATIONS.platform.workspaceSettings.members.revoke }),
        ).toHaveLength(2);
      });
    });

    describe('WHEN the role picker of a member opens', () => {
      beforeEach(() => {
        fireEvent.click(
          screen.getByRole('button', {
            name: changeRoleLabel(TRANSLATIONS.platform.workspaceSettings.roleNames.member),
          }),
        );
      });

      test('THEN every role is offered, the owner role included', () => {
        expect(optionNames()).toEqual([
          TRANSLATIONS.platform.workspaceSettings.roleNames.owner,
          'Admin',
          'Manager',
          TRANSLATIONS.platform.workspaceSettings.roleNames.member,
          TRANSLATIONS.platform.workspaceSettings.roleNames.viewer,
        ]);
      });
    });
  });
});
