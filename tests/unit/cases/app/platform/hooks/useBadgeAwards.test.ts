import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { createCommentOp } from '@mocks/canvas';
import { event } from '@mocks/events';
import { TRANSLATIONS } from '@mocks/i18n';
import { addUserBadge, getUser } from '@mocks/userApi';
import { useBadgeAwards } from '@/app/platform/hooks';
import { awardBadge, useBadgeStore } from '@/lib/badges';
import { emitCanvasOperation } from '@/lib/canvas';

vi.mock('@api/client', () => import('@mocks/userApi'));
vi.mock('@/i18n', () => import('@mocks/i18n'));
vi.mock('@/lib/events', () => import('@mocks/events'));

const mountHydrated = async () => {
  const hook = renderHook(() => useBadgeAwards());
  await vi.waitUntil(() => useBadgeStore.getState().earned !== null);

  return hook;
};

afterEach(() => useBadgeStore.getState().forget());

describe('useBadgeAwards', () => {
  describe('GIVEN an account with stored badges', () => {
    beforeEach(() => {
      getUser.mockResolvedValue({ data: { user: { id: 'user-1', user_metadata: { badges: ['founder', 'voice'] } } } });
      addUserBadge.mockResolvedValue(undefined);
    });

    describe('WHEN the platform mounts it', () => {
      beforeEach(mountHydrated);

      test('THEN the stored badges are loaded', () => {
        expect(useBadgeStore.getState().earned).toEqual(['founder', 'voice']);
      });
    });

    describe('WHEN a new badge is awarded', () => {
      beforeEach(async () => {
        await mountHydrated();
        act(() => awardBadge('critic'));
      });

      test('THEN a toast names the badge and how it was earned', () => {
        expect(event.success).toHaveBeenCalledExactlyOnceWith(
          TRANSLATIONS.platform.settings.profile.badges.criticUnlock,
          {
            title: `New badge: ${TRANSLATIONS.platform.settings.profile.badges.badgeCritic}`,
          },
        );
      });
    });

    describe('WHEN a badge is awarded quietly', () => {
      beforeEach(async () => {
        await mountHydrated();
        act(() => awardBadge('initiate', { quiet: true }));
      });

      test('THEN no toast is shown', () => {
        expect(useBadgeStore.getState().earned).toContain('initiate');
        expect(event.success).not.toHaveBeenCalled();
      });
    });

    describe('WHEN a comment is posted on the canvas', () => {
      beforeEach(async () => {
        await mountHydrated();
        act(() => emitCanvasOperation(createCommentOp('c1')));
      });

      test('THEN nothing is announced for a badge already earned', () => {
        expect(event.success).not.toHaveBeenCalled();
        expect(addUserBadge).not.toHaveBeenCalled();
      });
    });

    describe('WHEN the platform unmounts', () => {
      beforeEach(async () => {
        const { unmount } = await mountHydrated();
        unmount();
        emitCanvasOperation(createCommentOp('c1'));
      });

      test('THEN the badges are forgotten and the canvas is no longer watched', () => {
        expect(useBadgeStore.getState().earned).toBeNull();
        expect(addUserBadge).not.toHaveBeenCalled();
      });
    });
  });

  describe('GIVEN an account without badges', () => {
    beforeEach(() => {
      getUser.mockResolvedValue({ data: { user: { id: 'user-1', user_metadata: {} } } });
      addUserBadge.mockResolvedValue(undefined);
    });

    describe('WHEN a comment is posted on the canvas', () => {
      beforeEach(async () => {
        await mountHydrated();
        act(() => emitCanvasOperation(createCommentOp('c1')));
        await vi.waitUntil(() => addUserBadge.mock.calls.length > 0);
      });

      test('THEN Voice is earned, announced and saved', () => {
        expect(useBadgeStore.getState().earned).toEqual(['founder', 'voice']);
        expect(event.success).toHaveBeenCalledExactlyOnceWith(
          TRANSLATIONS.platform.settings.profile.badges.voiceUnlock,
          {
            title: `New badge: ${TRANSLATIONS.platform.settings.profile.badges.badgeVoice}`,
          },
        );
        expect(addUserBadge).toHaveBeenCalledExactlyOnceWith('voice');
      });
    });
  });

  describe('GIVEN the account cannot be loaded', () => {
    const loadError = new Error('auth down');

    beforeEach(() => {
      getUser.mockRejectedValue(loadError);
    });

    describe('WHEN the platform mounts it', () => {
      beforeEach(async () => {
        renderHook(() => useBadgeAwards());
        await vi.waitUntil(() => vi.mocked(event.error).mock.calls.length > 0);
      });

      test('THEN the failure is logged without a toast and nothing is announced', () => {
        expect(event.error).toHaveBeenCalledExactlyOnceWith(loadError, { toast: false, context: 'badges.load' });
        expect(useBadgeStore.getState().earned).toBeNull();
      });
    });
  });
});
