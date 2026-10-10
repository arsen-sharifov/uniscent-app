import type { InputHTMLAttributes } from 'react';

import { AuthInput } from './AuthInput';
import { AuthLabel } from './AuthLabel';

interface IAuthFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
}

export const AuthField = ({ id, label, children, ...rest }: IAuthFieldProps) => (
  <div>
    <AuthLabel htmlFor={id} className="mb-1.5">
      {label}
    </AuthLabel>
    <AuthInput id={id} {...rest} />
    {children}
  </div>
);
