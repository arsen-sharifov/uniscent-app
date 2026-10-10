'use client';

import type { LucideIcon } from 'lucide-react';

import type { TTourAnchor } from '@interfaces';

interface IStructureActionButtonProps {
  icon: LucideIcon;
  title: string;
  tour: TTourAnchor;
  onClick: () => void;
}

export const StructureActionButton = ({ icon: Icon, title, tour, onClick }: IStructureActionButtonProps) => (
  <button
    type="button"
    data-tour={tour}
    onClick={onClick}
    className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-md text-[color:var(--text-muted)] transition-colors duration-150 hover:bg-[color:var(--surface-overlay)] hover:text-[color:var(--text-strong)] focus-visible:ring-2 focus-visible:ring-[color:var(--ring-focus)] focus-visible:outline-none active:bg-[color:var(--accent-soft)] active:text-[color:var(--accent-text)] motion-reduce:transition-none"
    title={title}
  >
    <Icon className="h-4 w-4" strokeWidth={1.9} />
  </button>
);
