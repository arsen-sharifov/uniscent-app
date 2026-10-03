import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import type { IChangePasswordPayload, IUserProfileUpdate, TChangePasswordResult } from '@interfaces';
import {
  deleteAccount,
  getMyOwnedSharedWorkspaces,
  getUser,
  updateEmail,
  updatePassword,
  updateUserMetadata,
} from '@api/client';
import { TRANSLATIONS } from '@mocks/i18n';
import { useSettings } from '@/app/platform/components/Settings/hooks';
import { event } from '@/lib/events';

vi.mock('@api/client', async () => ({
  ...(await import('@mocks/canvasApi')),
  ...(await import('@mocks/userApi')),
  ...(await import('@mocks/workspaceApi')),
}));
vi.mock('@/i18n', () => import('@mocks/i18n'));
vi.mock('@/lib/events', () => import('@mocks/events'));

const USER = { id: 'user-1', email: 'user-1@uniscept.dev', user_metadata: { name: 'Arsen' } };
const UPDATED_USER = { id: 'user-1', email: 'user-1@uniscept.dev', user_metadata: { name: 'Ada Lovelace' } };

const USER_RESPONSE = { data: { user: USER }, error: null } as never;
const UPDATED_USER_RESPONSE = { data: { user: UPDATED_USER }, error: null } as never;
const NO_USER_RESPONSE = { data: { user: null }, error: null } as never;

const errorResponse = (error: object) => ({ data: { user: null }, error }) as never;

const PROFILE_UPDATE: IUserProfileUpdate = { name: 'Ada Lovelace', avatarIcon: null };
const PASSWORD_PAYLOAD: IChangePasswordPayload = { currentPassword: 'old-secret', newPassword: 'new-secret' };

const OUTAGE_ERROR = { code: 'unexpected_failure', status: 500 };
const SAVE_ERROR = { code: 'save_failed', status: 500 };

let settings: { current: ReturnType<typeof useSettings> };

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(async () => {
  cleanup();
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('useSettings', () => {
  describe('GIVEN a signed-in user behind the api', () => {
    beforeEach(() => {
      vi.mocked(getUser).mockResolvedValue(USER_RESPONSE);

      settings = renderHook(() => useSettings()).result;
    });

    describe('WHEN the initial load is still in flight', () => {
      test('THEN the settings report loading without a user', () => {
        expect(settings.current.loading).toBe(true);
        expect(settings.current.user).toBeNull();
      });
    });

    describe('WHEN the initial load settles', () => {
      beforeEach(async () => {
        await act(async () => {
          await vi.advanceTimersByTimeAsync(0);
        });
      });

      test('THEN the user is exposed', () => {
        expect(settings.current.loading).toBe(false);
        expect(settings.current.user).toEqual(USER);
        expect(getUser).toHaveBeenCalledTimes(1);
      });

      test('THEN the account deletion and its shared workspace check pass through to the api', () => {
        expect(settings.current.deleteAccount).toBe(deleteAccount);
        expect(settings.current.getMyOwnedSharedWorkspaces).toBe(getMyOwnedSharedWorkspaces);
      });
    });
  });

  describe('GIVEN a loaded account with the api accepting changes', () => {
    beforeEach(async () => {
      vi.mocked(getUser).mockResolvedValue(USER_RESPONSE);
      vi.mocked(updateUserMetadata).mockResolvedValue(UPDATED_USER_RESPONSE);
      vi.mocked(updateEmail).mockResolvedValue(USER_RESPONSE);
      vi.mocked(updatePassword).mockResolvedValue(true);

      settings = renderHook(() => useSettings()).result;
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
    });

    describe('WHEN the profile is updated', () => {
      beforeEach(async () => {
        await act(async () => {
          await settings.current.updateProfile(PROFILE_UPDATE);
        });
      });

      test('THEN the refreshed user lands in state and the update persists', () => {
        expect(settings.current.user).toEqual(UPDATED_USER);
        expect(updateUserMetadata).toHaveBeenCalledExactlyOnceWith(PROFILE_UPDATE);
      });
    });

    describe('WHEN the email is changed', () => {
      beforeEach(async () => {
        await act(async () => {
          await settings.current.changeEmail('next@uniscept.dev');
        });
      });

      test('THEN the new email reaches the api and the user stays', () => {
        expect(updateEmail).toHaveBeenCalledExactlyOnceWith('next@uniscept.dev');
        expect(settings.current.user).toEqual(USER);
      });
    });

    describe('WHEN the password changes with the correct current password', () => {
      let result: TChangePasswordResult;

      beforeEach(async () => {
        await act(async () => {
          result = await settings.current.changePassword(PASSWORD_PAYLOAD);
        });
      });

      test('THEN both passwords go to the server check and the change is reported', () => {
        expect(result).toBe('updated');
        expect(updatePassword).toHaveBeenCalledExactlyOnceWith(
          PASSWORD_PAYLOAD.currentPassword,
          PASSWORD_PAYLOAD.newPassword,
        );
      });
    });
  });

  describe('GIVEN a loaded account whose current password the server rejects', () => {
    let result: TChangePasswordResult;

    beforeEach(async () => {
      vi.mocked(getUser).mockResolvedValue(USER_RESPONSE);
      vi.mocked(updatePassword).mockResolvedValue(false);

      settings = renderHook(() => useSettings()).result;
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
    });

    describe('WHEN the password change is attempted', () => {
      beforeEach(async () => {
        await act(async () => {
          result = await settings.current.changePassword(PASSWORD_PAYLOAD);
        });
      });

      test('THEN the incorrect current password is reported', () => {
        expect(result).toBe('incorrectCurrentPassword');
      });
    });
  });

  describe('GIVEN a loaded account with the api rejecting changes', () => {
    beforeEach(async () => {
      vi.mocked(getUser).mockResolvedValue(USER_RESPONSE);
      vi.mocked(updateUserMetadata).mockResolvedValue(errorResponse(SAVE_ERROR));
      vi.mocked(updateEmail).mockResolvedValue(errorResponse(SAVE_ERROR));
      vi.mocked(updatePassword).mockRejectedValue(OUTAGE_ERROR);

      settings = renderHook(() => useSettings()).result;
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
    });

    describe('WHEN the profile update is submitted', () => {
      test('THEN the update rejects and the user stays', async () => {
        await expect(settings.current.updateProfile(PROFILE_UPDATE)).rejects.toBe(SAVE_ERROR);
        expect(settings.current.user).toEqual(USER);
      });
    });

    describe('WHEN the email change is submitted', () => {
      test('THEN the change rejects with the api error', async () => {
        await expect(settings.current.changeEmail('next@uniscept.dev')).rejects.toBe(SAVE_ERROR);
      });
    });

    describe('WHEN the password change hits an auth outage', () => {
      test('THEN the change rejects with the api error', async () => {
        await expect(settings.current.changePassword(PASSWORD_PAYLOAD)).rejects.toBe(OUTAGE_ERROR);
      });
    });
  });

  describe('GIVEN no signed-in user behind the api', () => {
    beforeEach(async () => {
      vi.mocked(getUser).mockResolvedValue(NO_USER_RESPONSE);

      settings = renderHook(() => useSettings()).result;
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
    });

    describe('WHEN the initial load settles', () => {
      test('THEN loading ends without a user', () => {
        expect(settings.current.loading).toBe(false);
        expect(settings.current.user).toBeNull();
      });
    });
  });

  describe('GIVEN an initial load that fails on the api', () => {
    beforeEach(async () => {
      vi.mocked(getUser).mockRejectedValue(new Error('db down'));

      settings = renderHook(() => useSettings()).result;
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
    });

    describe('WHEN the failure settles', () => {
      test('THEN loading ends and the failure surfaces', () => {
        expect(settings.current.loading).toBe(false);
        expect(settings.current.user).toBeNull();
        expect(event.error).toHaveBeenCalledExactlyOnceWith(expect.any(Error), {
          title: TRANSLATIONS.common.errorTitles.loadFailed,
          context: 'settings.loadUser',
        });
      });
    });
  });
});
