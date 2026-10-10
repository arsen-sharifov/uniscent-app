'use client';

import { useId } from 'react';

import { SettingsInput } from './SettingsInput';

interface IPasswordFieldProps {
  label: string;
  autoComplete: 'current-password' | 'new-password';
  value: string;
  onChange: (value: string) => void;
  minLength?: number;
}

export const PasswordField = ({ label, autoComplete, value, onChange, minLength }: IPasswordFieldProps) => {
  const id = useId();

  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1 block font-mono-ui text-[10px] font-bold tracking-[0.14em] text-[color:var(--text-label)] uppercase"
      >
        {label}
      </label>
      <SettingsInput
        id={id}
        type="password"
        autoComplete={autoComplete}
        minLength={minLength}
        placeholder={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
};
