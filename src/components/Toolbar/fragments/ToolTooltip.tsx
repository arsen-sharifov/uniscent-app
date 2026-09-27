import { clsx } from 'clsx';

import type { IToolItem } from '@interfaces';

import { renderShortcut } from '../utils';

interface IToolTooltipProps {
  tool: IToolItem | null;
  top: number;
  visible: boolean;
}

export const ToolTooltip = ({ tool, top, visible }: IToolTooltipProps) => {
  return (
    <div
      role="tooltip"
      aria-hidden={!visible}
      className={clsx(
        'pointer-events-none fixed right-[4.75rem] z-50 transition-[opacity,transform] duration-150 ease-out motion-reduce:transition-none',
        visible ? 'translate-x-0 opacity-100' : 'translate-x-1 opacity-0',
      )}
      style={{ top }}
    >
      <div className="relative flex -translate-y-1/2 items-center gap-2 rounded-md bg-[color:var(--text-strong)] px-2 py-1 shadow-[var(--shadow-pip)]">
        <span className="font-grotesk text-xs font-medium tracking-tight text-[color:var(--surface)]">
          {tool?.label ?? ''}
        </span>

        {tool?.shortcut && (
          <div className="flex shrink-0 items-center gap-1 border-l border-[color:var(--surface)]/20 pl-2">
            {renderShortcut(tool.shortcut).map((token) => (
              <kbd
                key={token}
                className="flex h-[18px] min-w-[18px] items-center justify-center rounded-md border border-[color:var(--surface)]/20 bg-[color:var(--surface)]/12 px-1.5 font-mono-ui text-[10px] font-medium text-[color:var(--surface)]"
              >
                {token}
              </kbd>
            ))}
          </div>
        )}

        <span
          aria-hidden
          className="absolute top-1/2 -right-1 h-2 w-2 -translate-y-1/2 rotate-45 bg-[color:var(--text-strong)]"
        />
      </div>
    </div>
  );
};
