import { clsx } from 'clsx';
import { Check, Copy, type LucideProps, type icons } from 'lucide-react';
import { useState } from 'react';

import { COPY_FEEDBACK_DELAY_MS } from '../../../consts';

interface IIconCellProps extends Pick<LucideProps, 'absoluteStrokeWidth' | 'color' | 'size' | 'strokeWidth'> {
  name: string;
  Icon: (typeof icons)[keyof typeof icons];
  onCopy: (name: string) => void;
}

export const IconCell = ({ name, Icon, size, color, strokeWidth, absoluteStrokeWidth, onCopy }: IIconCellProps) => {
  const [copied, setCopied] = useState(false);

  const handle = () => {
    navigator.clipboard?.writeText(`<${name} />`);
    onCopy(name);
    setCopied(true);
    window.setTimeout(() => setCopied(false), COPY_FEEDBACK_DELAY_MS);
  };

  return (
    <button
      type="button"
      onClick={handle}
      className="group relative flex h-[88px] flex-col items-center justify-center gap-1.5 rounded-md border border-[color:var(--border)] bg-[color:var(--surface-elevated)] p-2 transition-colors hover:border-[color:var(--border-strong)] hover:bg-[color:var(--surface-overlay)] focus-visible:ring-2 focus-visible:ring-[color:var(--ring-focus)] focus-visible:outline-none"
      title={`Copy <${name} />`}
    >
      <Icon
        size={size}
        color={color}
        strokeWidth={strokeWidth}
        absoluteStrokeWidth={absoluteStrokeWidth}
        className="shrink-0 text-[color:var(--text)] transition-transform duration-150 group-hover:scale-110"
      />
      <span className="w-full truncate text-center font-mono-ui text-[9.5px] tracking-[0.04em] text-[color:var(--text-muted)]">
        {name}
      </span>
      <span
        className={clsx(
          'absolute top-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-md transition-opacity',
          copied
            ? 'bg-[color:var(--status-success-soft)] text-[color:var(--status-success)] opacity-100'
            : 'bg-[color:var(--surface-overlay)] text-[color:var(--text-subtle)] opacity-0 group-hover:opacity-100',
        )}
      >
        {copied ? <Check className="h-3 w-3" strokeWidth={2.5} /> : <Copy className="h-3 w-3" strokeWidth={2} />}
      </span>
    </button>
  );
};
