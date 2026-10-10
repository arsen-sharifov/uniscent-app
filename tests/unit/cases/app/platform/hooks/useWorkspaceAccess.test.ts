import { act, renderHook } from '@testing-library/react';
import { createTranslator } from 'next-intl';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { getMyWorkspacePermissions, getUser } from '@api/client';
import { TRANSLATIONS } from '@mocks/i18n';
import { EDIT_ACCESS } from '@mocks/roles';
import { useWorkspaceAccess } from '@/app/platform/hooks';
import { useTranslations } from '@/i18n';
import { usePermissionsStore } from '@/lib/stores';

vi.mock('@api/client', async () => ({
  ...(await import('@mocks/userApi')),
  ...(await import('@mocks/workspaceApi')),
}));
vi.mock('@/i18n', async () => ({ ...(await import('@mocks/i18n')), useTranslations: vi.fn() }));
vi.mock('@/lib/events', () => import('@mocks/events'));

const USER_RESPONSE = { data: { user: { id: 'user-1' } }, error: null } as never;

const freshTranslator = () => Object.assign(createTranslator({ locale: 'en', messages: TRANSLATIONS }), TRANSLATIONS);

let rerenderAccess: () => void;

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  usePermissionsStore.getState().clearAccess();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('useWorkspaceAccess', () => {
  describe('GIVEN access loaded for the active workspace', () => {
    beforeEach(async () => {
      vi.mocked(useTranslations).mockReturnValue(freshTranslator());
      vi.mocked(getUser).mockResolvedValue(USER_RESPONSE);
      vi.mocked(getMyWorkspacePermissions).mockResolvedValue(EDIT_ACCESS);
      rerenderAccess = renderHook(() => useWorkspaceAccess('ws-1')).rerender;
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
    });

    describe('WHEN the interface language changes', () => {
      beforeEach(async () => {
        vi.mocked(useTranslations).mockReturnValue(freshTranslator());
        act(() => rerenderAccess());
        await act(async () => {
          await vi.advanceTimersByTimeAsync(0);
        });
      });

      test('THEN the loaded access is neither cleared nor fetched again', () => {
        expect(getMyWorkspacePermissions).toHaveBeenCalledOnce();
        expect(usePermissionsStore.getState()).toMatchObject({
          workspaceId: 'ws-1',
          userId: 'user-1',
          resolved: true,
          canEditCanvas: true,
        });
      });
    });
  });
});
