import { clsx } from 'clsx';

interface IDropLineIndicatorProps {
  position: 'before' | 'after';
  leftOffset?: number;
}

export const DropLineIndicator = ({ position, leftOffset }: IDropLineIndicatorProps) => (
  <div
    style={leftOffset !== undefined ? { left: leftOffset } : undefined}
    className={clsx(
      'pointer-events-none absolute right-1 z-20 h-0.5 rounded-full bg-[color:var(--accent)]',
      leftOffset === undefined && 'left-5',
      position === 'before' ? '-top-[1px]' : '-bottom-[1px]',
    )}
  >
    <div className="absolute top-1/2 left-0 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-[color:var(--accent)] ring-[3px] ring-[color:var(--accent-soft)]" />
  </div>
);
