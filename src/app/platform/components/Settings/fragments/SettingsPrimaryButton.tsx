import type { ButtonHTMLAttributes } from 'react';

type TSettingsPrimaryButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export const SettingsPrimaryButton = ({ type = 'button', ...rest }: TSettingsPrimaryButtonProps) => (
  <button
    type={type}
    {...rest}
    className="cursor-pointer rounded-lg bg-[color:var(--accent)] px-5 py-2 font-grotesk text-sm font-medium text-[color:var(--on-accent)] shadow-[0_10px_28px_-12px_var(--accent-glow)] transition-[background-color,box-shadow,transform,opacity] duration-200 ease-out hover:bg-[color:var(--accent-strong)] focus-visible:ring-2 focus-visible:ring-[color:var(--ring-focus)] focus-visible:outline-none active:translate-y-px active:bg-[color:var(--accent)] disabled:cursor-not-allowed disabled:bg-[color:var(--surface-overlay)] disabled:text-[color:var(--text-subtle)] disabled:shadow-none disabled:hover:bg-[color:var(--surface-overlay)] disabled:active:translate-y-0 motion-reduce:transition-none"
  />
);
