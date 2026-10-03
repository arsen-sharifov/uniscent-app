'use client';

import { clsx } from 'clsx';
import { useCallback, useRef } from 'react';

import type { IToolItem } from '@interfaces';

import { isCanvasTool } from '@/components/tools';

import { ToolSelectionMark } from './ToolSelectionMark';
import { ICON_STROKE, TOOL_ANCHORS, TOOL_TONES } from '../consts';
import { useFlash } from '../hooks';
import { toAriaShortcut } from '../utils';

interface IToolButtonProps {
  tool: IToolItem;
  active: boolean;
  onClick: (id: string) => void;
  onPointerEnter?: (rect: DOMRect, tool: IToolItem) => void;
  onPointerLeave?: () => void;
}

export const ToolButton = ({ tool, active, onClick, onPointerEnter, onPointerLeave }: IToolButtonProps) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { flash, triggerFlash } = useFlash();
  const isAction = tool.kind === 'action';
  const isSelected = active && !isAction && !tool.disabled;
  const Icon = tool.icon;
  const tone = tool.tone && !tool.disabled ? TOOL_TONES[tool.tone] : null;
  const lit = isSelected || flash;
  const idle = !tool.disabled && !lit;
  const toneFill = lit ? tone?.fill : undefined;
  const toneStyle = tone ? { color: tone.ink, backgroundColor: toneFill } : undefined;

  const handleClick = useCallback(() => {
    if (tool.disabled) return;

    onClick(tool.id);
    if (!isAction) return;

    triggerFlash();
  }, [tool.id, tool.disabled, isAction, onClick, triggerFlash]);

  const handleEnter = useCallback(() => {
    if (!buttonRef.current || !onPointerEnter) return;

    onPointerEnter(buttonRef.current.getBoundingClientRect(), tool);
  }, [onPointerEnter, tool]);

  return (
    <div className="relative flex w-full items-center justify-center">
      <button
        ref={buttonRef}
        type="button"
        data-tour={isCanvasTool(tool.id) ? TOOL_ANCHORS[tool.id] : undefined}
        onClick={handleClick}
        onPointerEnter={handleEnter}
        onPointerLeave={onPointerLeave}
        onFocus={handleEnter}
        onBlur={onPointerLeave}
        disabled={tool.disabled}
        aria-label={tool.label}
        aria-pressed={!isAction ? active : undefined}
        aria-keyshortcuts={toAriaShortcut(tool.shortcut)}
        style={toneStyle}
        className={clsx(
          'flex h-9 w-9 items-center justify-center rounded-lg outline-none',
          'transition-[background-color,color,box-shadow,transform] duration-200 ease-out motion-reduce:transition-none',
          'focus-visible:ring-2 focus-visible:ring-[color:var(--ring-focus)] focus-visible:ring-offset-1 focus-visible:ring-offset-[color:var(--surface)]',
          tool.disabled && 'cursor-not-allowed text-[color:var(--text-muted)] opacity-40',
          !tool.disabled && 'cursor-pointer active:scale-[0.94]',
          idle && 'hover:bg-[color:var(--surface-overlay)] active:bg-[color:var(--surface-overlay)]',
          idle && !tone && 'text-[color:var(--text-muted)] hover:text-[color:var(--text)]',
          isSelected &&
            !tone &&
            'bg-[color:var(--accent-soft)] text-[color:var(--accent-text)] shadow-[0_8px_24px_-12px_var(--accent-glow)]',
          flash && 'scale-[1.06]',
          flash && !tone && 'bg-[color:var(--accent-soft)] text-[color:var(--accent-text)]',
        )}
      >
        <Icon className="h-[17px] w-[17px]" strokeWidth={ICON_STROKE} />
      </button>

      <ToolSelectionMark ink={tone?.ink} isSelected={isSelected} />
    </div>
  );
};
