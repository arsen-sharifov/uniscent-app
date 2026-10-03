'use client';

import { clsx } from 'clsx';
import { type ReactNode, useState } from 'react';

interface IListProps {
  trigger: (open: boolean, toggle: () => void) => ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
}

export const List = ({ trigger, children, defaultOpen = false }: IListProps) => {
  const [open, setOpen] = useState(defaultOpen);
  const toggle = () => setOpen((previous) => !previous);

  return (
    <div>
      {trigger(open, toggle)}
      <div
        className={clsx(
          'grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none',
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
      >
        <div inert={!open} className="overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
};
