'use client';

import { clsx } from 'clsx';
import { Info } from 'lucide-react';
import { cloneElement, useCallback, useId, useState, type HTMLAttributes, type ReactElement } from 'react';

import { useEscapeKey } from '@hooks';
import { useTranslations } from '@/i18n';

interface ITooltipProps {
  text: string;
  children?: ReactElement<HTMLAttributes<HTMLElement>>;
  position?: 'top' | 'bottom';
}

export const Tooltip = ({ text, children, position = 'top' }: ITooltipProps) => {
  const t = useTranslations();
  const isTop = position === 'top';
  const tooltipId = useId();
  const [dismissed, setDismissed] = useState(false);
  const dismiss = useCallback(() => setDismissed(true), []);
  const restore = () => setDismissed(false);

  useEscapeKey(dismiss, !dismissed);

  const trigger = children ?? (
    <button
      type="button"
      aria-label={t.common.moreInfo}
      className="flex cursor-help rounded-full text-[color:var(--text-subtle)] focus-visible:ring-2 focus-visible:ring-[color:var(--ring-focus)] focus-visible:outline-none"
    >
      <Info aria-hidden className="h-3.5 w-3.5" />
    </button>
  );

  return (
    <div className="group relative" onMouseEnter={restore} onFocus={restore}>
      {cloneElement(trigger, { 'aria-describedby': tooltipId })}
      <div
        role="tooltip"
        id={tooltipId}
        className={clsx(
          'pointer-events-none absolute left-1/2 w-max max-w-64 -translate-x-1/2 rounded-md bg-[color:var(--text-strong)] px-2 py-1 font-grotesk text-xs text-[color:var(--surface)] opacity-0 shadow-[var(--shadow-pip)] transition-opacity duration-200 motion-reduce:transition-none',
          !dismissed && 'group-focus-within:opacity-100 group-hover:opacity-100',
          isTop ? 'bottom-full mb-1.5' : 'top-full mt-1.5',
        )}
      >
        {text}
        <div
          className={clsx(
            'absolute left-1/2 -translate-x-1/2 border-4 border-transparent',
            isTop ? 'top-full border-t-[color:var(--text-strong)]' : 'bottom-full border-b-[color:var(--text-strong)]',
          )}
        />
      </div>
    </div>
  );
};
