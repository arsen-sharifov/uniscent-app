import { clsx } from 'clsx';

interface IToolSelectionMarkProps {
  ink?: string;
  isSelected: boolean;
}

export const ToolSelectionMark = ({ ink, isSelected }: IToolSelectionMarkProps) => (
  <span
    aria-hidden
    style={ink ? { backgroundColor: ink } : undefined}
    className={clsx(
      'pointer-events-none absolute top-1/2 right-0 h-6 w-[3px] -translate-y-1/2 rounded-l-full',
      !ink && 'bg-[color:var(--accent)]',
      'transition-opacity duration-200 ease-out motion-reduce:transition-none',
      isSelected ? 'opacity-100' : 'opacity-0',
    )}
  />
);
