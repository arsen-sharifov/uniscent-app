import { clsx } from 'clsx';

interface ILogoProps {
  className?: string;
}

export const Logo = ({ className }: ILogoProps) => (
  <span className={clsx('font-grotesk font-extrabold tracking-[-0.02em] select-none', className)}>Uniscept</span>
);
