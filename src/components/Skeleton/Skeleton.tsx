import { clsx } from 'clsx';

interface ISkeletonProps {
  className?: string;
}

export const Skeleton = ({ className }: ISkeletonProps) => (
  <span aria-hidden className={clsx('skeleton relative block overflow-hidden bg-[color:var(--skeleton)]', className)}>
    <span className="absolute inset-0 animate-skeleton-sweep bg-gradient-to-r from-transparent via-[color:var(--skeleton)] to-transparent motion-reduce:animate-none" />
  </span>
);
