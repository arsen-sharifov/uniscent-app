import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { IWorkspace } from '@interfaces';
import { getWorkspace } from '@api/client';
import { TRANSLATIONS } from '@mocks/i18n';
import { WorkspaceSettings } from '@/app/platform/components/WorkspaceSettings';

vi.mock('@api/client', async () => ({
  ...(await import('@mocks/userApi')),
  ...(await import('@mocks/workspaceApi')),
}));
vi.mock('@/i18n', () => import('@mocks/i18n'));
vi.mock('@/lib/events', () => import('@mocks/events'));

const onRename = vi.fn();
const onClose = vi.fn();

describe('WorkspaceSettings', () => {
  describe('GIVEN workspace settings that are still loading', () => {
    beforeEach(() => {
      vi.mocked(getWorkspace).mockReturnValue(Promise.withResolvers<IWorkspace>().promise);
      render(
        <WorkspaceSettings workspaceId="ws-1" workspaceName="Product Lab" onRename={onRename} onClose={onClose} />,
      );
    });

    describe('WHEN the modal opens', () => {
      test('THEN the dialog is named by the heading of the active section', () => {
        expect(
          screen.getByRole('dialog', { name: TRANSLATIONS.platform.workspaceSettings.sections.general }),
        ).toBeInTheDocument();
      });
    });

    describe('WHEN another section is picked', () => {
      beforeEach(() => {
        fireEvent.click(screen.getByRole('button', { name: TRANSLATIONS.platform.workspaceSettings.sections.members }));
      });

      test('THEN the dialog name follows the heading', () => {
        expect(
          screen.getByRole('dialog', { name: TRANSLATIONS.platform.workspaceSettings.sections.members }),
        ).toBeInTheDocument();
      });
    });
  });
});
