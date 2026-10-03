import { clsx } from 'clsx';

import type { IBadgePip } from '@interfaces';

interface IBadgeConstellationProps {
  pips: readonly IBadgePip[];
}

export const BadgeConstellation = ({ pips }: IBadgeConstellationProps) => (
  <div className="flex items-center gap-1">
    {pips.map(({ id, icon: Icon, label, earned }) => (
      <span
        key={id}
        role="img"
        aria-label={label}
        title={label}
        className={clsx(
          'flex h-6 w-6 items-center justify-center rounded-full transition-transform duration-200 ease-out hover:-translate-y-0.5 motion-reduce:transition-none',
          earned
            ? 'bg-[color:var(--accent)] text-[color:var(--on-accent)]'
            : 'border border-[color:var(--border-strong)] bg-[color:var(--surface-overlay)] text-[color:var(--text-subtle)]',
        )}
      >
        <Icon className="h-3 w-3" strokeWidth={earned ? 2 : 1.7} />
      </span>
    ))}
  </div>
);
