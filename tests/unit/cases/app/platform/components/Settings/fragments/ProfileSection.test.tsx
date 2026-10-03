import type { User } from '@supabase/supabase-js';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { BADGES, MAX_NAME_LENGTH } from '@constants';
import { TRANSLATIONS } from '@mocks/i18n';
import { ProfileSection } from '@/app/platform/components/Settings/fragments';
import { hydrateBadges, useBadgeStore } from '@/lib/badges';

vi.mock('@/i18n', () => import('@mocks/i18n'));
vi.mock('@/lib/events', () => import('@mocks/events'));

const onUpdateProfile = vi.fn();
const onUpdateEmail = vi.fn();

const userWithBadges = (stored: string[]) => ({ id: 'user-1', user_metadata: { badges: stored } }) as unknown as User;

const lockedBadge = (label: string, unlock: string) => `${label} · ${unlock}`;

afterEach(() => useBadgeStore.getState().forget());

describe('ProfileSection', () => {
  describe('GIVEN the profile of an account', () => {
    beforeEach(() => {
      render(<ProfileSection user={null} onUpdateProfile={onUpdateProfile} onUpdateEmail={onUpdateEmail} />);
    });

    describe('WHEN it renders', () => {
      test('THEN the display name field is labelled and capped at the shared name length', () => {
        expect(
          screen.getByRole('textbox', { name: TRANSLATIONS.platform.settings.profile.displayName }),
        ).toHaveAttribute('maxlength', String(MAX_NAME_LENGTH));
      });

      test('THEN the email field is labelled', () => {
        expect(screen.getByRole('textbox', { name: TRANSLATIONS.platform.settings.profile.email })).toHaveAttribute(
          'type',
          'email',
        );
      });
    });

    describe('WHEN a display name and an email are typed', () => {
      beforeEach(() => {
        fireEvent.change(screen.getByRole('textbox', { name: TRANSLATIONS.platform.settings.profile.displayName }), {
          target: { value: 'Ada' },
        });
        fireEvent.change(screen.getByRole('textbox', { name: TRANSLATIONS.platform.settings.profile.email }), {
          target: { value: 'ada@example.com' },
        });
      });

      test('THEN the profile card previews the typed name and the email field keeps the input', () => {
        expect(screen.getByText('Ada')).toBeInTheDocument();
        expect(screen.getByRole('textbox', { name: TRANSLATIONS.platform.settings.profile.email })).toHaveValue(
          'ada@example.com',
        );
      });
    });
  });

  describe('GIVEN an account with stored badges and no session badges yet', () => {
    beforeEach(() => {
      render(
        <ProfileSection
          user={userWithBadges(['founder', 'voice'])}
          onUpdateProfile={onUpdateProfile}
          onUpdateEmail={onUpdateEmail}
        />,
      );
    });

    describe('WHEN it renders', () => {
      test('THEN the stored badges show as earned out of the whole catalogue', () => {
        expect(
          screen.queryByRole('img', {
            name: lockedBadge(
              TRANSLATIONS.platform.settings.profile.badges.badgeVoice,
              TRANSLATIONS.platform.settings.profile.badges.voiceUnlock,
            ),
          }),
        ).toBeNull();
        expect(screen.getAllByText(`2/${BADGES.length}`)).not.toHaveLength(0);
      });
    });
  });

  describe('GIVEN a badge earned during the session after the account was loaded', () => {
    beforeEach(() => {
      hydrateBadges(['founder', 'voice', 'critic']);
      render(
        <ProfileSection
          user={userWithBadges(['founder', 'voice'])}
          onUpdateProfile={onUpdateProfile}
          onUpdateEmail={onUpdateEmail}
        />,
      );
    });

    describe('WHEN it renders', () => {
      test('THEN the session badges win over the loaded account', () => {
        expect(
          screen.queryByRole('img', {
            name: lockedBadge(
              TRANSLATIONS.platform.settings.profile.badges.badgeCritic,
              TRANSLATIONS.platform.settings.profile.badges.criticUnlock,
            ),
          }),
        ).toBeNull();
        expect(screen.getAllByText(`3/${BADGES.length}`)).not.toHaveLength(0);
      });
    });
  });
});
