import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { TRANSLATIONS } from '@mocks/i18n';
import { PREFERENCES } from '@mocks/preferences';
import { getUser, USER_UNAVAILABLE } from '@mocks/userApi';
import { Settings } from '@/app/platform/components/Settings';

vi.mock('next/navigation', () => import('@mocks/navigation'));
vi.mock('@api/client', async () => ({
  ...(await import('@mocks/userApi')),
  ...(await import('@mocks/workspaceApi')),
}));
vi.mock('@/i18n', () => import('@mocks/i18n'));
vi.mock('@/lib/events', () => import('@mocks/events'));

const onClose = vi.fn();
const updatePreference = vi.fn();

describe('Settings', () => {
  describe('GIVEN the settings modal for a loaded account', () => {
    beforeEach(async () => {
      getUser.mockResolvedValue(USER_UNAVAILABLE);
      await act(async () => {
        render(<Settings onClose={onClose} preferences={PREFERENCES} updatePreference={updatePreference} />);
      });
    });

    describe('WHEN it opens', () => {
      test('THEN the dialog is named by the heading of the active section', () => {
        expect(
          screen.getByRole('dialog', { name: TRANSLATIONS.platform.settings.sections.profile }),
        ).toBeInTheDocument();
      });
    });

    describe('WHEN another section is picked', () => {
      beforeEach(() => {
        fireEvent.click(screen.getByRole('button', { name: TRANSLATIONS.platform.settings.sections.appearance }));
      });

      test('THEN the dialog name follows the heading', () => {
        expect(
          screen.getByRole('dialog', { name: TRANSLATIONS.platform.settings.sections.appearance }),
        ).toBeInTheDocument();
      });
    });
  });
});
