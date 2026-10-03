import { clsx } from 'clsx';
import type { ReactNode } from 'react';

import type { TTheme } from '@interfaces';

interface IThemedSurfaceProps {
  themeId: TTheme;
  className?: string;
  children: ReactNode;
}

export const ThemedSurface = ({ themeId, className, children }: IThemedSurfaceProps) => (
  <div
    data-theme={themeId}
    className={clsx(
      'relative isolate overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--app-bg)] text-[color:var(--text)]',
      className,
    )}
  >
    {children}
  </div>
);
