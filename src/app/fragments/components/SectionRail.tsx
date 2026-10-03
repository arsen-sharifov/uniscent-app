'use client';

import { clsx } from 'clsx';

interface ISectionRailProps {
  labels: string[];
  activeIndex: number;
  onSelect: (index: number) => void;
}

export const SectionRail = ({ labels, activeIndex, onSelect }: ISectionRailProps) => (
  <nav
    aria-label={labels[0]}
    className="fixed top-1/2 right-5 z-40 hidden -translate-y-1/2 flex-col items-center gap-2.5 lg:flex"
  >
    {labels.map((label, index) => (
      <button
        key={label}
        type="button"
        onClick={() => onSelect(index)}
        aria-label={label}
        aria-current={index === activeIndex || undefined}
        className={clsx(
          'cursor-pointer rounded-full transition-all duration-300 focus-visible:ring-2 focus-visible:ring-[color:var(--hero-lime-glow)] focus-visible:outline-none motion-reduce:transition-none',
          index === activeIndex
            ? 'h-5 w-1.5 bg-[color:var(--hero-lime)] shadow-[0_0_10px_var(--hero-lime-glow)]'
            : 'h-1.5 w-1.5 bg-[color:var(--hero-rail)] hover:bg-[color:var(--hero-rail-hover)]',
        )}
      />
    ))}
  </nav>
);
