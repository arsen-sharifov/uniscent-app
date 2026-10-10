'use client';

import { clsx } from 'clsx';
import type { LucideIcon } from 'lucide-react';

import type { TItemActionTone, TTourAnchor } from '@interfaces';

import { ITEM_ACTION_TONES } from '../../consts';

interface IItemActionButtonProps {
  icon: LucideIcon;
  tone: TItemActionTone;
  title: string;
  onClick: () => void;
  tour?: TTourAnchor;
}

export const ItemActionButton = ({ icon: Icon, tone, title, onClick, tour }: IItemActionButtonProps) => (
  <button
    type="button"
    data-tour={tour}
    onClick={onClick}
    className={clsx(
      'rounded-lg p-1 text-[color:var(--text-muted)] transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-[color:var(--ring-focus)] focus-visible:outline-none motion-reduce:transition-none',
      ITEM_ACTION_TONES[tone],
    )}
    title={title}
  >
    <Icon className="h-3 w-3" />
  </button>
);
