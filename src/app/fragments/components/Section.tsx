import { clsx } from 'clsx';
import type { ReactNode } from 'react';

import type { TLandingSectionGround } from '@interfaces';

import { LANDING_SECTION_GROUND_CLASSES } from '../consts';

interface ISectionProps {
  id?: string;
  ground?: TLandingSectionGround;
  snap?: boolean;
  tight?: boolean;
  children: ReactNode;
  className?: string;
}

export const Section = ({ id, ground = 'field', snap = true, tight = false, children, className }: ISectionProps) => (
  <section
    id={id}
    className={clsx(
      'relative z-[1] flex flex-col justify-center overflow-hidden border-t border-[color:var(--hero-hairline-soft)] px-6',
      tight ? 'pt-5 pb-11' : 'pt-12 pb-20 lg:pt-14 lg:pb-24',
      snap ? 'min-h-[calc(100svh-5rem)] snap-start' : 'flex-1',
      LANDING_SECTION_GROUND_CLASSES[ground],
      className,
    )}
  >
    {children}
  </section>
);
