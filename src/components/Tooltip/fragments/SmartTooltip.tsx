'use client';

import { clsx } from 'clsx';
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import type { ITooltipPosition, TTooltipPlacement } from '@interfaces';
import { useEscapeKey, useMounted, useViewportChange } from '@hooks';

import { choosePlacement, computeTooltipPosition } from '../utils';

interface ISmartTooltipProps {
  content: ReactNode;
  children: ReactNode;
  placement?: TTooltipPlacement;
  delay?: number;
  onlyIfTruncated?: boolean;
  className?: string;
  panelClassName?: string;
  disabled?: boolean;
}

export const SmartTooltip = ({
  content,
  children,
  placement = 'top',
  delay = 350,
  onlyIfTruncated = false,
  className,
  panelClassName,
  disabled = false,
}: ISmartTooltipProps) => {
  const mounted = useMounted();
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number | null>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<ITooltipPosition | null>(null);

  const place = useCallback(() => {
    const triggerRect = triggerRef.current?.getBoundingClientRect();
    const tooltipRect = tooltipRef.current?.getBoundingClientRect();
    if (!triggerRect || !tooltipRect) return;

    const tooltipSize = { width: tooltipRect.width, height: tooltipRect.height };
    const chosen = choosePlacement(placement, triggerRect, tooltipSize);
    setPosition(computeTooltipPosition(chosen, triggerRect, tooltipSize));
  }, [placement]);

  useLayoutEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(place);

    return () => cancelAnimationFrame(id);
  }, [open, place]);

  const close = useCallback(() => {
    setOpen(false);
    setPosition(null);
  }, []);

  useViewportChange({ onScroll: close, onResize: close, enabled: open, capture: true });
  useEscapeKey(close, open);

  const cancel = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleEnter = () => {
    if (disabled) return;
    cancel();
    timerRef.current = window.setTimeout(() => {
      const trigger = triggerRef.current;
      if (!trigger) return;
      if (onlyIfTruncated && trigger.scrollWidth <= trigger.clientWidth + 1) return;
      setOpen(true);
    }, delay);
  };

  const handleLeave = () => {
    cancel();
    close();
  };

  useEffect(() => () => cancel(), []);

  const isHorizontal = position?.placement === 'left' || position?.placement === 'right';

  const arrowStyle: CSSProperties = isHorizontal
    ? { top: Math.max(8, position?.arrowTop ?? 0) }
    : { left: Math.max(10, position?.arrowLeft ?? 0) };

  return (
    <>
      <span
        ref={triggerRef}
        className={className}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        onFocus={handleEnter}
        onBlur={handleLeave}
      >
        {children}
      </span>
      {open &&
        mounted &&
        createPortal(
          <div
            ref={tooltipRef}
            role="tooltip"
            style={{
              position: 'fixed',
              top: position?.top ?? -9999,
              left: position?.left ?? -9999,
              opacity: position ? 1 : 0,
            }}
            className={clsx(
              'pointer-events-none z-[60] max-w-xs rounded-md bg-[color:var(--text-strong)] px-2 py-1 font-grotesk text-xs text-[color:var(--surface)] shadow-[var(--shadow-pip)] transition-opacity duration-150 motion-reduce:transition-none',
              panelClassName,
            )}
          >
            {content}
            <span
              aria-hidden="true"
              style={arrowStyle}
              className={clsx(
                'pointer-events-none absolute h-2 w-2 rotate-45 bg-[color:var(--text-strong)]',
                position?.placement === 'top' && '-bottom-[5px] -translate-x-1/2',
                position?.placement === 'bottom' && '-top-[5px] -translate-x-1/2',
                position?.placement === 'left' && '-right-[5px] -translate-y-1/2',
                position?.placement === 'right' && '-left-[5px] -translate-y-1/2',
              )}
            />
          </div>,
          document.body,
        )}
    </>
  );
};
