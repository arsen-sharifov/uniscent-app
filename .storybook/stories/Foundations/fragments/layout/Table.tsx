import { clsx } from 'clsx';
import type { ReactNode } from 'react';

interface ITableColumn {
  id: string;
  label: string;
  width?: string;
  align?: 'left' | 'right';
}

interface ITableProps {
  columns: ITableColumn[];
  children: ReactNode;
}

export const Table = ({ columns, children }: ITableProps) => {
  const columnTemplate = columns.map((column) => column.width ?? 'minmax(0, 1fr)').join(' ');

  return (
    <div
      className="overflow-hidden rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-elevated)]"
      style={{ ['--table-tpl' as string]: columnTemplate }}
    >
      <div
        className="grid items-center gap-x-4 border-b border-[color:var(--border)] bg-[color:var(--surface-soft)] px-4 py-2.5"
        style={{ gridTemplateColumns: columnTemplate }}
      >
        {columns.map((column) => (
          <span
            key={column.id}
            className={clsx(
              'truncate font-mono-ui text-[9.5px] font-semibold tracking-[0.22em] text-[color:var(--text-subtle)] uppercase',
              column.align === 'right' && 'text-right',
            )}
          >
            {column.label}
          </span>
        ))}
      </div>
      <div>{children}</div>
    </div>
  );
};
