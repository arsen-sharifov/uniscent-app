import type { InputHTMLAttributes } from 'react';

type TSettingsInputProps = InputHTMLAttributes<HTMLInputElement>;

export const SettingsInput = (props: TSettingsInputProps) => (
  <input
    {...props}
    className="w-full rounded-lg border border-[color:var(--border-strong)] bg-[color:var(--surface-soft)] px-3 py-2 font-grotesk text-sm text-[color:var(--text)] transition-[border-color,background-color,box-shadow] duration-200 ease-out outline-none placeholder:text-[color:var(--text-muted)] user-invalid:border-[color:var(--status-error)] hover:border-[color:var(--text-subtle)] user-invalid:hover:border-[color:var(--status-error)] focus:border-[color:var(--accent)] user-invalid:focus:border-[color:var(--status-error)] focus-visible:ring-2 focus-visible:ring-[color:var(--ring-focus)] focus-visible:outline-none user-invalid:focus-visible:ring-[color:var(--status-error-soft)] disabled:cursor-not-allowed disabled:border-[color:var(--border)] disabled:text-[color:var(--text-subtle)] disabled:hover:border-[color:var(--border)] motion-reduce:transition-none"
  />
);
