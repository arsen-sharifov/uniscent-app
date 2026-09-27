import { type ReactNode, useState } from 'react';

import type { IPopoverTrigger, TPopoverPlacement } from '@interfaces';

import { Popover } from '@/components';

interface IPlacementCellProps {
  placement: TPopoverPlacement;
  label: string;
  renderTrigger: (trigger: IPopoverTrigger) => ReactNode;
  content: ReactNode;
  onOpenChange?: (open: boolean) => void;
}

export const PlacementCell = ({ placement, label, renderTrigger, content, onOpenChange }: IPlacementCellProps) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col items-center gap-3">
      <span className="font-mono-ui text-[10px] tracking-[0.18em] text-[color:var(--text-subtle)] uppercase">
        {label}
      </span>
      <Popover
        open={open}
        placement={placement}
        offset={8}
        renderTrigger={renderTrigger}
        onOpenChange={(next) => {
          onOpenChange?.(next);
          setOpen(next);
        }}
      >
        {content}
      </Popover>
    </div>
  );
};
