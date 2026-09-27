import { clsx } from 'clsx';
import type { LabelHTMLAttributes } from 'react';

interface IAuthLabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  htmlFor: string;
}

export const AuthLabel = ({ htmlFor, className, children, ...rest }: IAuthLabelProps) => (
  <label
    {...rest}
    htmlFor={htmlFor}
    className={clsx(
      'block font-mono-ui text-[10px] font-bold tracking-[0.14em] text-[color:var(--hero-ground-muted)] uppercase',
      className,
    )}
  >
    {children}
  </label>
);
