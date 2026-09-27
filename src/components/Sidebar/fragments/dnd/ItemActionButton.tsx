'use client';

import { clsx } from 'clsx';
import type { LucideIcon } from 'lucide-react';

import type { TItemActionTone } from '@interfaces';

import { useTranslations } from '@/i18n';

import { ITEM_ACTION_TONES } from '../../consts';

interface IItemActionButtonProps {
  icon: LucideIcon;
  tone: TItemActionTone;
  title: string;
  onClick: () => void;
  isLocked?: boolean;
  tour?: string;
}

export const ItemActionButton = ({ icon: Icon, tone, title, onClick, isLocked, tour }: IItemActionButtonProps) => {
  const translations = useTranslations();

  return (
    <button
      type="button"
      data-tour={tour}
      onClick={isLocked ? undefined : onClick}
      aria-disabled={isLocked}
      className={clsx(
        'rounded-lg p-1 text-[color:var(--text-muted)] transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-[color:var(--ring-focus)] focus-visible:outline-none motion-reduce:transition-none',
        isLocked ? 'cursor-not-allowed opacity-50' : ITEM_ACTION_TONES[tone],
      )}
      title={isLocked ? translations.common.noPermission : title}
    >
      <Icon className="h-3 w-3" />
    </button>
  );
};
