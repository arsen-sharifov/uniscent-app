import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { TRANSLATIONS } from '@mocks/i18n';
import { workspaceRole } from '@mocks/roles';
import { RoleListItem } from '@/app/platform/components/WorkspaceSettings/fragments';

vi.mock('@/i18n', () => import('@mocks/i18n'));

const onEdit = vi.fn();
const onDelete = vi.fn();

const listedPermissions = () =>
  within(screen.getByRole('list', { name: TRANSLATIONS.platform.workspaceSettings.roles.permissionsLabel }))
    .getAllByRole('listitem')
    .map((item) => item.textContent);

describe('RoleListItem', () => {
  describe('GIVEN a role that grants editing and commenting only', () => {
    beforeEach(() => {
      render(
        <RoleListItem
          role={workspaceRole('role-editor', { name: 'Editor', canManageStructure: false })}
          canManage={false}
          canDelete={false}
          onEdit={onEdit}
          onDelete={onDelete}
        />,
      );
    });

    describe('WHEN it renders', () => {
      test('THEN the granted permissions are listed by name for assistive technology', () => {
        expect(listedPermissions()).toEqual([
          TRANSLATIONS.platform.workspaceSettings.permissions.canEditCanvas.name,
          TRANSLATIONS.platform.workspaceSettings.permissions.canComment.name,
        ]);
      });

      test('THEN the decorative permission pips and their tooltips stay out of the accessibility tree', () => {
        expect(screen.queryAllByRole('tooltip')).toEqual([]);
      });

      test('THEN its single member is counted in the singular', () => {
        expect(screen.getByText('1 member')).toBeInTheDocument();
      });
    });
  });
});
