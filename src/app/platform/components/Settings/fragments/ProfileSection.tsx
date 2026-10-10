'use client';

import type { User } from '@supabase/supabase-js';
import { useMemo, useState } from 'react';

import type { IUserMetadata, IUserProfileUpdate, TAvatarIcon } from '@interfaces';
import { AVATAR_ICONS, BADGES, EMAIL_PATTERN, MAX_NAME_LENGTH } from '@constants';
import { useAsyncAction } from '@hooks';
import { Avatar, Badge, BadgeConstellation, getInitials } from '@/components';
import { useTranslations } from '@/i18n';
import { useBadgeStore } from '@/lib/badges';
import { event } from '@/lib/events';
import { isAvatarIcon, resolveEarnedBadges } from '@/lib/utils';

import { PickerCard } from './PickerCard';
import { SectionHeader } from './SectionHeader';
import { SettingsInput } from './SettingsInput';
import { SettingsPrimaryButton } from './SettingsPrimaryButton';

interface IProfileSectionProps {
  user: User | null;
  onUpdateProfile: (update: IUserProfileUpdate) => Promise<void>;
  onUpdateEmail: (email: string) => Promise<void>;
}

export const ProfileSection = ({ user, onUpdateProfile, onUpdateEmail }: IProfileSectionProps) => {
  const t = useTranslations();

  const metadata = user?.user_metadata as IUserMetadata | undefined;
  const userName = metadata?.name ?? '';
  const userEmail = user?.email ?? '';
  const storedAvatarIcon = metadata?.avatarIcon;
  const userAvatarIcon: TAvatarIcon | null = isAvatarIcon(storedAvatarIcon) ? storedAvatarIcon : null;
  const storedBadges = metadata?.badges;
  const sessionBadges = useBadgeStore((state) => state.earned);
  const earnedBadges = useMemo(() => sessionBadges ?? resolveEarnedBadges(storedBadges), [sessionBadges, storedBadges]);

  const [name, setName] = useState(userName);
  const [avatarIcon, setAvatarIcon] = useState<TAvatarIcon | null>(userAvatarIcon);
  const [email, setEmail] = useState(userEmail);
  const save = useAsyncAction();
  const emailChange = useAsyncAction();

  const trimmedName = name.trim();
  const nameChanged = name !== userName;
  const avatarIconChanged = avatarIcon !== userAvatarIcon;
  const profileChanged = nameChanged || avatarIconChanged;
  const emailChanged = email !== userEmail;
  const emailIsValid = EMAIL_PATTERN.test(email.trim());

  const earnedSet = useMemo(() => new Set(earnedBadges), [earnedBadges]);
  const earnedCount = earnedSet.size;

  const constellationPips = useMemo(
    () =>
      BADGES.map((definition) => ({
        id: definition.id,
        icon: definition.icon,
        label: t.platform.settings.profile.badges[definition.labelKey],
        earned: earnedSet.has(definition.id),
      })),
    [t.platform.settings.profile.badges, earnedSet],
  );

  const initialsPreview = getInitials(trimmedName || userEmail);

  return (
    <div className="space-y-4">
      <section className="relative overflow-hidden rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-elevated)] px-5 py-2.5">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-16 -right-20 h-40 w-40 rounded-full bg-[color:var(--accent-soft)] opacity-50 blur-3xl"
        />
        <div className="relative flex items-center gap-4">
          <Avatar
            name={trimmedName || userEmail}
            icon={avatarIcon}
            size="lg"
            className="shadow-[0_18px_38px_-22px_var(--accent-glow)]"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate font-grotesk text-[18px] leading-tight font-semibold tracking-tight text-[color:var(--text-strong)]">
              {trimmedName || t.platform.settings.profile.unnamed}
            </p>
            <p className="mt-0.5 truncate text-[12px] tracking-tight text-[color:var(--text-muted)]">{userEmail}</p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <BadgeConstellation pips={constellationPips} />
            <span className="font-mono-ui text-[10px] tracking-[0.14em] text-[color:var(--text-label)] uppercase">
              {earnedCount}/{BADGES.length}
            </span>
          </div>
        </div>
      </section>

      <section>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <SectionHeader
              title={t.platform.settings.profile.displayName}
              caption={`${trimmedName.length}/${MAX_NAME_LENGTH}`}
              className="mb-1.5"
            />
            <SettingsInput
              type="text"
              value={name}
              maxLength={MAX_NAME_LENGTH}
              aria-label={t.platform.settings.profile.displayName}
              placeholder={t.platform.settings.profile.namePlaceholder}
              onChange={(inputEvent) => setName(inputEvent.target.value)}
            />
          </div>
          <div>
            <header className="mb-1.5 flex items-baseline justify-between">
              <h3 className="font-mono-ui text-[10px] font-bold tracking-[0.14em] text-[color:var(--text-label)] uppercase">
                {t.platform.settings.profile.email}
              </h3>
              {emailChanged && !emailIsValid && (
                <span className="font-mono-ui text-[10px] tracking-[0.14em] text-[color:var(--status-error)] uppercase">
                  {t.platform.settings.profile.emailInvalid}
                </span>
              )}
            </header>
            <div className="flex gap-2">
              <div className="min-w-0 flex-1">
                <SettingsInput
                  type="email"
                  value={email}
                  aria-label={t.platform.settings.profile.email}
                  onChange={(inputEvent) => setEmail(inputEvent.target.value)}
                />
              </div>
              <SettingsPrimaryButton
                onClick={() =>
                  emailChange.run(async () => {
                    await onUpdateEmail(email.trim());
                    event.info(t.platform.settings.profile.emailChangeSent);
                  }, t.platform.settings.profile.emailChangeFailed)
                }
                disabled={emailChange.loading || !emailChanged || !emailIsValid}
              >
                {emailChange.loading
                  ? t.platform.settings.profile.changingEmail
                  : t.platform.settings.profile.changeEmail}
              </SettingsPrimaryButton>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-[color:var(--border)] pt-3.5">
        <SectionHeader
          title={t.platform.settings.profile.avatarTitle}
          caption={t('platform.settings.profile.avatarOptionCount', { count: AVATAR_ICONS.length + 1 })}
          className="mb-3"
        />

        <div
          role="radiogroup"
          aria-label={t.platform.settings.profile.avatarTitle}
          className="grid grid-cols-3 gap-3 sm:grid-cols-7"
        >
          <PickerCard
            active={avatarIcon === null}
            label={t.platform.settings.profile.initialsLabel}
            onSelect={() => setAvatarIcon(null)}
            variant="initials"
          >
            <span className="font-mono-ui text-[17px] font-semibold tracking-[0.06em] text-[color:var(--text-strong)]">
              {initialsPreview}
            </span>
          </PickerCard>

          {AVATAR_ICONS.map(({ id, icon: AvatarIcon, labelKey }) => (
            <PickerCard
              key={id}
              active={id === avatarIcon}
              label={t.platform.settings.profile.avatarIcons[labelKey]}
              onSelect={() => setAvatarIcon(id)}
            >
              <AvatarIcon size={24} strokeWidth={1.75} className="shrink-0" aria-hidden />
            </PickerCard>
          ))}
        </div>
      </section>

      <section className="border-t border-[color:var(--border)] pt-3.5">
        <SectionHeader
          title={t.platform.settings.profile.badgesTitle}
          caption={`${earnedCount}/${BADGES.length}`}
          className="mb-3"
        />

        <div className="grid grid-cols-4 gap-3 sm:grid-cols-8">
          {BADGES.map((definition) => (
            <Badge
              key={definition.id}
              icon={definition.icon}
              label={t.platform.settings.profile.badges[definition.labelKey]}
              unlock={t.platform.settings.profile.badges[definition.unlockKey]}
              earned={earnedSet.has(definition.id)}
            />
          ))}
        </div>
      </section>

      <section className="flex items-center justify-end gap-3 border-t border-[color:var(--border)] pt-3.5">
        <div className="min-w-0 flex-1 truncate text-[11.5px] leading-snug">
          {save.success && (
            <span className="text-[color:var(--status-success)]">{t.platform.settings.profile.saved}</span>
          )}
        </div>
        <SettingsPrimaryButton
          onClick={() =>
            save.run(
              () =>
                onUpdateProfile({
                  ...(nameChanged && { name: trimmedName }),
                  ...(avatarIconChanged && { avatarIcon }),
                }),
              t.platform.settings.profile.saveFailed,
            )
          }
          disabled={save.loading || !profileChanged || (nameChanged && !trimmedName)}
        >
          {save.loading ? t.platform.settings.profile.saving : t.platform.settings.profile.save}
        </SettingsPrimaryButton>
      </section>
    </div>
  );
};
