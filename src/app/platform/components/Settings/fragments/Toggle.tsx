'use client';

import { clsx } from 'clsx';
import type { LucideIcon } from 'lucide-react';

import { SettingsSwitch } from './SettingsSwitch';

interface IToggleProps {
  icon: LucideIcon;
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}

export const Toggle = ({ icon: Icon, label, description, checked, onChange, disabled }: IToggleProps) => (
  <div className={clsx('flex items-center gap-3', disabled && 'opacity-60')}>
    <Icon
      className={clsx(
        'h-4 w-4 shrink-0',
        checked && !disabled ? 'text-[color:var(--accent-text)]' : 'text-[color:var(--text-subtle)]',
      )}
    />
    <div className="flex-1">
      <span className="font-grotesk text-sm font-medium text-[color:var(--text)]">{label}</span>
      <p className="text-xs leading-snug text-[color:var(--text-muted)]">{description}</p>
    </div>
    <SettingsSwitch checked={checked} label={label} onChange={onChange} disabled={disabled} />
  </div>
);
