import { clsx } from 'clsx';
import type { LucideIcon } from 'lucide-react';

interface IItemIconProps {
  icon: LucideIcon;
  isHighlighted: boolean;
  hidesOnHover: boolean;
}

export const ItemIcon = ({ icon: Icon, isHighlighted, hidesOnHover }: IItemIconProps) => (
  <span className="relative h-4 w-4 shrink-0">
    <Icon
      className={clsx(
        'absolute inset-0 h-4 w-4 transition-opacity duration-150 motion-reduce:transition-none',
        isHighlighted ? 'text-[color:var(--accent-text)]' : 'text-[color:var(--text-muted)]',
        hidesOnHover && 'group-hover/item:opacity-0',
      )}
    />
  </span>
);
