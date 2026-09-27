'use client';

import type { User } from '@supabase/supabase-js';
import { clsx } from 'clsx';
import { ChevronsUpDown, LogOut, Settings } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import type { IUserMetadata, TAvatarIcon } from '@interfaces';
import { PREFERENCES_STORAGE_KEY } from '@constants';
import { getUser, signOut } from '@api/client';
import { Avatar, Popover, Skeleton } from '@/components';
import { useTranslations, clearLocale } from '@/i18n';
import { event } from '@/lib/events';
import { useOnboardingStore } from '@/lib/onboarding';
import { isAvatarIcon } from '@/lib/utils';

interface IUserMenuProps {
  onSettingsClick?: () => void;
}

export const UserMenu = ({ onSettingsClick }: IUserMenuProps) => {
  const router = useRouter();
  const translations = useTranslations();
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<User | null>();
  const forget = useOnboardingStore((state) => state.forget);

  useEffect(() => {
    let cancelled = false;
    getUser()
      .then(({ data }) => {
        if (!cancelled) {
          setUser(data.user);
        }
      })
      .catch((error) => {
        if (cancelled) return;

        setUser(null);
        event.error(error, { toast: false, context: 'userMenu.loadUser' });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const metadata = user?.user_metadata as IUserMetadata | undefined;
  const displayName = metadata?.name || user?.email?.split('@')[0] || translations.common.userAvatar;
  const email = user?.email ?? '';
  const storedAvatarIcon = metadata?.avatarIcon;
  const avatarIcon: TAvatarIcon | null = isAvatarIcon(storedAvatarIcon) ? storedAvatarIcon : null;

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      event.error(error, { toast: false, context: 'auth.signOut' });
    } finally {
      forget();
      localStorage.removeItem(PREFERENCES_STORAGE_KEY);
      await clearLocale();
      router.push('/login');
    }
  };

  if (user === undefined) {
    return (
      <div aria-hidden className="flex w-full items-center gap-2 px-2 py-1.5">
        <Skeleton className="h-7 w-7 shrink-0 rounded-full" />
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-2 w-32" />
        </span>
      </div>
    );
  }

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      placement="top-start"
      offset={6}
      panelClassName="w-[var(--ws-popover-w,15rem)]"
      renderTrigger={(trigger) => (
        <button
          type="button"
          {...trigger}
          data-tour="sidebarUserMenu"
          className={clsx(
            'group flex w-full min-w-0 items-center gap-2 rounded-xl px-2 py-1.5 text-left transition-colors',
            open ? 'bg-[color:var(--surface-overlay)]' : 'hover:bg-[color:var(--surface-overlay)]',
          )}
        >
          <Avatar name={displayName} icon={avatarIcon} size="sm" />
          <span className="flex min-w-0 flex-1 flex-col leading-tight">
            <span className="truncate text-sm font-medium text-[color:var(--text-strong)]">{displayName}</span>
            <span className="truncate font-mono-ui text-[10px] text-[color:var(--text-label)]">{email}</span>
          </span>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-[color:var(--text-subtle)] transition-colors group-hover:text-[color:var(--text)]" />
        </button>
      )}
    >
      <div className="flex items-center gap-3 border-b border-[color:var(--border)] px-3 py-3">
        <Avatar name={displayName} icon={avatarIcon} size="md" />
        <div className="flex min-w-0 flex-col leading-tight">
          <span className="truncate text-sm font-medium text-[color:var(--text-strong)]">{displayName}</span>
          <span className="truncate font-mono-ui text-[10px] text-[color:var(--text-label)]">{email}</span>
        </div>
      </div>
      <div className="space-y-0.5 p-1.5">
        <button
          type="button"
          data-tour="userMenuSettings"
          onClick={() => {
            setOpen(false);
            onSettingsClick?.();
          }}
          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-[color:var(--text)] transition-colors hover:bg-[color:var(--surface-overlay)] hover:text-[color:var(--text-strong)]"
        >
          <Settings className="h-3.5 w-3.5 text-[color:var(--text-muted)]" />
          <span>{translations.platform.settings.title}</span>
        </button>
        <button
          type="button"
          onClick={handleSignOut}
          className="group flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-[color:var(--text)] transition-colors hover:bg-[color:var(--status-error-bg)] hover:text-[color:var(--status-error)]"
        >
          <LogOut className="h-3.5 w-3.5 text-[color:var(--text-muted)] transition-colors group-hover:text-[color:var(--status-error)]" />
          <span>{translations.platform.sidebar.signOut}</span>
        </button>
      </div>
    </Popover>
  );
};
