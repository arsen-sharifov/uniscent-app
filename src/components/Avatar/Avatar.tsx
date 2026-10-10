'use client';

import { clsx } from 'clsx';

import type { TAvatarIcon, TAvatarSize } from '@interfaces';
import { AVATAR_ICON_BY_ID } from '@constants';
import { useTranslations } from '@/i18n';

import { ICON_SIZE_PX, SIZE_CLASS } from './consts';
import { getInitials } from './utils';

interface IAvatarProps {
  name: string;
  icon?: TAvatarIcon | null;
  size?: TAvatarSize;
  className?: string;
}

export const Avatar = ({ name, icon, size = 'lg', className }: IAvatarProps) => {
  const t = useTranslations();
  const AvatarIcon = icon ? AVATAR_ICON_BY_ID[icon] : null;

  return (
    <span
      role="img"
      aria-label={name || t.common.userAvatar}
      className={clsx(
        'relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[color:var(--accent-soft)] font-mono-ui font-bold text-[color:var(--accent-text)] uppercase ring-1 ring-[color:var(--border-strong)]',
        SIZE_CLASS[size],
        className,
      )}
    >
      {AvatarIcon ? (
        <AvatarIcon size={ICON_SIZE_PX[size]} strokeWidth={1.75} className="shrink-0" aria-hidden />
      ) : (
        getInitials(name)
      )}
    </span>
  );
};
