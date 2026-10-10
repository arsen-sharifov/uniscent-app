import { clsx } from 'clsx';

interface ISectionHeaderProps {
  title: string;
  caption: string;
  description?: string;
  danger?: boolean;
  className?: string;
}

export const SectionHeader = ({ title, caption, description, danger = false, className }: ISectionHeaderProps) => (
  <header className={className}>
    <div
      className={clsx(
        'flex items-baseline justify-between font-mono-ui text-[10px] tracking-[0.14em] uppercase',
        danger ? 'text-[color:var(--status-error)]' : 'text-[color:var(--text-label)]',
      )}
    >
      <h3 className="font-bold">{title}</h3>
      <span>{caption}</span>
    </div>
    {description && (
      <p className="mt-1 mb-4 max-w-md text-[12.5px] leading-relaxed text-[color:var(--text-muted)]">{description}</p>
    )}
  </header>
);
