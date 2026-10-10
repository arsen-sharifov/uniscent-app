'use client';

import { clsx } from 'clsx';

interface ISettingsSwitchProps {
  checked: boolean;
  label: string;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}

export const SettingsSwitch = ({ checked, label, onChange, disabled = false }: ISettingsSwitchProps) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    onClick={() => onChange(!checked)}
    disabled={disabled}
    className={clsx(
      'relative h-5 w-9 shrink-0 rounded-full transition-[background-color,transform] duration-200 ease-out',
      'focus-visible:ring-2 focus-visible:ring-[color:var(--ring-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--surface-panel)] focus-visible:outline-none',
      'motion-reduce:transition-none',
      disabled && 'cursor-not-allowed',
      !disabled && 'cursor-pointer active:scale-95',
      checked ? 'bg-[color:var(--accent)]' : 'bg-[color:var(--border-strong)]',
      !disabled && checked && 'hover:bg-[color:var(--accent-strong)]',
      !disabled && !checked && 'hover:bg-[color:var(--text-subtle)]',
    )}
  >
    <span
      className={clsx(
        'absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-[color:var(--pip)] shadow-[var(--shadow-pip)] transition-transform duration-200 ease-out motion-reduce:transition-none',
        checked ? 'translate-x-4' : 'translate-x-0',
      )}
    />
  </button>
);
