import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { MAX_NAME_LENGTH } from '@constants';
import { TRANSLATIONS } from '@mocks/i18n';
import { FULL_ACCESS, workspaceRole } from '@mocks/roles';
import { RoleEditor } from '@/app/platform/components/WorkspaceSettings/fragments';

vi.mock('@/i18n', () => import('@mocks/i18n'));

const MANAGER_ROLE = workspaceRole('role-manager', { name: 'Manager', canManageRoles: true });

const permissionSwitch = (name: string) => screen.queryByRole('switch', { name });

describe('RoleEditor', () => {
  describe('GIVEN a role manager creating a role', () => {
    beforeEach(() => {
      render(<RoleEditor role={null} granter={MANAGER_ROLE} onSave={vi.fn()} onCancel={vi.fn()} />);
    });

    describe('WHEN the name field renders', () => {
      test('THEN it is labelled and capped at the shared name length', () => {
        expect(
          screen.getByRole('textbox', { name: TRANSLATIONS.platform.workspaceSettings.roles.nameLabel }),
        ).toHaveAttribute('maxlength', String(MAX_NAME_LENGTH));
      });
    });

    describe('WHEN the icon choices render', () => {
      test('THEN each icon is named in the interface language, with the default one checked', () => {
        expect(
          screen.getByRole('radio', { name: TRANSLATIONS.platform.workspaceSettings.roleIcons.shield }),
        ).toHaveAttribute('aria-checked', 'true');
        expect(
          screen.getByRole('radio', { name: TRANSLATIONS.platform.workspaceSettings.roleIcons.penTool }),
        ).toHaveAttribute('aria-checked', 'false');
      });
    });

    describe('WHEN the permission switches render', () => {
      test('THEN only the permissions the manager holds are offered', () => {
        expect(
          permissionSwitch(TRANSLATIONS.platform.workspaceSettings.permissions.canEditCanvas.name),
        ).toBeInTheDocument();
        expect(
          permissionSwitch(TRANSLATIONS.platform.workspaceSettings.permissions.canManageRoles.name),
        ).toBeInTheDocument();
        expect(
          permissionSwitch(TRANSLATIONS.platform.workspaceSettings.permissions.canManageMembers.name),
        ).not.toBeInTheDocument();
        expect(
          permissionSwitch(TRANSLATIONS.platform.workspaceSettings.permissions.canManageWorkspace.name),
        ).not.toBeInTheDocument();
      });
    });

    describe('WHEN a held permission is switched on', () => {
      beforeEach(() => {
        fireEvent.click(permissionSwitch(TRANSLATIONS.platform.workspaceSettings.permissions.canManageRoles.name)!);
      });

      test('THEN the switch turns on', () => {
        expect(
          permissionSwitch(TRANSLATIONS.platform.workspaceSettings.permissions.canManageRoles.name),
        ).toHaveAttribute('aria-checked', 'true');
      });
    });
  });

  describe('GIVEN the workspace owner creating a role', () => {
    beforeEach(() => {
      render(<RoleEditor role={null} granter={FULL_ACCESS} onSave={vi.fn()} onCancel={vi.fn()} />);
    });

    describe('WHEN the permission switches render', () => {
      test('THEN every permission is offered', () => {
        expect(screen.getAllByRole('switch')).toHaveLength(
          Object.keys(TRANSLATIONS.platform.workspaceSettings.permissions).length,
        );
      });
    });
  });
});
