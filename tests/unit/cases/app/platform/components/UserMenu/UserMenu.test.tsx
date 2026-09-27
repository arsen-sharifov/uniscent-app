import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { TRANSLATIONS } from '@mocks/i18n';
import { router } from '@mocks/navigation';
import { getUser, signOut, USER_UNAVAILABLE } from '@mocks/userApi';
import { UserMenu } from '@/app/platform/components/UserMenu';
import { useOnboardingStore } from '@/lib/onboarding';

vi.mock('next/navigation', () => import('@mocks/navigation'));
vi.mock('@api/client', () => import('@mocks/userApi'));
vi.mock('@/i18n', () => import('@mocks/i18n'));
vi.mock('@/lib/events', () => import('@mocks/events'));

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
  });

  describe('GIVEN tour progress loaded for the signed-in account', () => {
    beforeEach(() => {
      getUser.mockResolvedValue(USER_UNAVAILABLE);
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
    });

    describe('WHEN signing out fails on the api', () => {
      beforeEach(async () => {
        signOut.mockRejectedValue(new Error('network down'));
        render(<UserMenu />);
        fireEvent.click(await screen.findByText(TRANSLATIONS.common.userAvatar));
        fireEvent.click(screen.getByRole('button', { name: TRANSLATIONS.platform.sidebar.signOut }));
        await vi.waitUntil(() => router.push.mock.calls.length > 0);
      });

      test('THEN the progress is forgotten all the same', () => {
        expect(useOnboardingStore.getState()).toMatchObject({ loaded: false, userId: null, completedGuides: [] });
      });
    });
  });
});
