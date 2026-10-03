import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { clearLocale, TRANSLATIONS } from '@mocks/i18n';
import { router } from '@mocks/navigation';
import { getUser, signOut, USER_UNAVAILABLE } from '@mocks/userApi';
import { UserMenu } from '@/app/platform/components/UserMenu';
import { event } from '@/lib/events';
import { useOnboardingStore } from '@/lib/onboarding';

vi.mock('next/navigation', () => import('@mocks/navigation'));
vi.mock('@api/client', () => import('@mocks/userApi'));
vi.mock('@/i18n', () => import('@mocks/i18n'));
vi.mock('@/lib/events', () => import('@mocks/events'));

const onSettingsClick = vi.fn();

afterEach(() => useOnboardingStore.getState().forget());

describe('UserMenu', () => {
  describe('GIVEN a failed profile request', () => {
    beforeEach(() => {
      getUser.mockRejectedValue(new Error('Profile unavailable'));
    });

    describe('WHEN the user opens the menu after loading settles', () => {
      beforeEach(async () => {
        render(<UserMenu />);
        fireEvent.click(await screen.findByText(TRANSLATIONS.common.userAvatar));
      });

      test('THEN settings and sign out remain available', () => {
        expect(screen.getByRole('button', { name: TRANSLATIONS.platform.settings.title })).toBeEnabled();
        expect(screen.getByRole('button', { name: TRANSLATIONS.platform.sidebar.signOut })).toBeEnabled();
      });
    });
  });

  describe('GIVEN a completed request without a user profile', () => {
    beforeEach(() => {
      getUser.mockResolvedValue(USER_UNAVAILABLE);
    });

    describe('WHEN the user opens the menu', () => {
      beforeEach(async () => {
        render(<UserMenu />);
        fireEvent.click(await screen.findByText(TRANSLATIONS.common.userAvatar));
      });

      test('THEN sign out remains available', () => {
        expect(screen.getByRole('button', { name: TRANSLATIONS.platform.sidebar.signOut })).toBeEnabled();
      });
    });

    describe('WHEN the user opens Settings from the menu', () => {
      beforeEach(async () => {
        render(<UserMenu onSettingsClick={onSettingsClick} />);
        fireEvent.click(await screen.findByText(TRANSLATIONS.common.userAvatar));
        fireEvent.click(screen.getByRole('button', { name: TRANSLATIONS.platform.settings.title }));
      });

      test('THEN Settings opens with the focus on the menu trigger, which the dialog returns to when it closes', () => {
        expect(onSettingsClick).toHaveBeenCalledOnce();
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: new RegExp(TRANSLATIONS.common.userAvatar) })).toHaveFocus();
      });
    });
  });

  describe('GIVEN tour progress loaded for the signed-in account', () => {
    beforeEach(() => {
      getUser.mockResolvedValue(USER_UNAVAILABLE);
      clearLocale.mockResolvedValue(undefined);
      useOnboardingStore.getState().hydrate('user-1', { offerAnswered: true, completedGuides: ['base'] });
    });

    describe('WHEN the user signs out', () => {
      beforeEach(async () => {
        signOut.mockResolvedValue(undefined);
        render(<UserMenu />);
        fireEvent.click(await screen.findByText(TRANSLATIONS.common.userAvatar));
        fireEvent.click(screen.getByRole('button', { name: TRANSLATIONS.platform.sidebar.signOut }));
        await vi.waitUntil(() => router.push.mock.calls.length > 0);
      });

      test('THEN the progress is forgotten before the sign-in page opens', () => {
        expect(useOnboardingStore.getState()).toMatchObject({ loaded: false, userId: null, completedGuides: [] });
        expect(router.push).toHaveBeenCalledExactlyOnceWith('/login');
      });

      test('THEN every session of the account is signed out, not only this one', () => {
        expect(signOut).toHaveBeenCalledExactlyOnceWith();
      });
    });

    describe('WHEN signing out fails on the api after the local session is gone', () => {
      beforeEach(async () => {
        signOut.mockRejectedValue(new Error('network down'));
        render(<UserMenu />);
        fireEvent.click(await screen.findByText(TRANSLATIONS.common.userAvatar));
        fireEvent.click(screen.getByRole('button', { name: TRANSLATIONS.platform.sidebar.signOut }));
        await vi.waitUntil(() => router.push.mock.calls.length > 0);
      });

      test('THEN the failure is reported without a toast', () => {
        expect(event.error).toHaveBeenCalledExactlyOnceWith(expect.any(Error), {
          toast: false,
          context: 'auth.signOut',
        });
      });

      test('THEN the device state is still cleared and the sign-in page opens', () => {
        expect(useOnboardingStore.getState()).toMatchObject({ loaded: false, userId: null, completedGuides: [] });
        expect(clearLocale).toHaveBeenCalledTimes(1);
        expect(router.push).toHaveBeenCalledExactlyOnceWith('/login');
      });
    });

    describe('WHEN clearing the language cookie fails', () => {
      beforeEach(async () => {
        signOut.mockResolvedValue(undefined);
        clearLocale.mockRejectedValue(new Error('cookie store down'));
        render(<UserMenu />);
        fireEvent.click(await screen.findByText(TRANSLATIONS.common.userAvatar));
        fireEvent.click(screen.getByRole('button', { name: TRANSLATIONS.platform.sidebar.signOut }));
        await vi.waitUntil(() => router.push.mock.calls.length > 0);
      });

      test('THEN the sign-in page still opens', () => {
        expect(router.push).toHaveBeenCalledExactlyOnceWith('/login');
      });

      test('THEN the failure is reported without a toast', () => {
        expect(event.error).toHaveBeenCalledExactlyOnceWith(expect.any(Error), {
          toast: false,
          context: 'auth.clearLocale',
        });
      });
    });
  });
});
