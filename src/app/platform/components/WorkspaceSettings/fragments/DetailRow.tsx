import { clsx } from 'clsx';
import type { LucideIcon } from 'lucide-react';

interface IDetailRowProps {
  icon: LucideIcon;
  label: string;
  value: string;
  mono?: boolean;
}

export const DetailRow = ({ icon: Icon, label, value, mono = false }: IDetailRowProps) => (
  <div className="flex items-center gap-3 py-3.5">
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[color:var(--surface-overlay)] text-[color:var(--text-subtle)]">
      <Icon className="h-4 w-4" aria-hidden />
    </span>
    <span className="min-w-0 truncate font-mono-ui text-[10px] font-bold tracking-[0.14em] text-[color:var(--text-label)] uppercase">
      {label}
    </span>
    <span
      className={clsx(
        'ml-auto min-w-0 truncate pl-3 text-right',
        mono
          ? 'font-mono-ui text-[11px] text-[color:var(--text)] tabular-nums'
          : 'font-grotesk text-sm font-medium text-[color:var(--text-strong)]',
      )}
    >
      {value}
    </span>
  </div>
);
