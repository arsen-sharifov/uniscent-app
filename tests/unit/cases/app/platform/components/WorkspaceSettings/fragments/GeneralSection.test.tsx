import { fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { TRANSLATIONS } from '@mocks/i18n';
import { GeneralSection } from '@/app/platform/components/WorkspaceSettings/fragments';

vi.mock('@/i18n', () => import('@mocks/i18n'));

const onRename = vi.fn();

const nameField = () =>
  screen.getByRole('textbox', { name: TRANSLATIONS.platform.workspaceSettings.general.nameLabel });

describe('GeneralSection', () => {
  describe('GIVEN a manager who typed a new workspace name', () => {
    beforeEach(() => {
      render(
        <NextIntlClientProvider locale="en">
          <GeneralSection
            workspaceId="ws-1"
            initialName="Product Lab"
            createdAt={null}
            memberCount={2}
            currentRoleName={null}
            canManageWorkspace
            onRename={onRename}
          />
        </NextIntlClientProvider>,
      );
      fireEvent.change(nameField(), { target: { value: 'Research' } });
    });

    describe('WHEN Enter is pressed', () => {
      beforeEach(() => {
        fireEvent.keyDown(nameField(), { key: 'Enter' });
      });

      test('THEN the new name is saved', () => {
        expect(onRename).toHaveBeenCalledExactlyOnceWith('ws-1', 'Research');
      });
    });
  });
});
