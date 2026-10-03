'use client';

import { clsx } from 'clsx';
import { CheckCircle2, ChevronRight } from 'lucide-react';

import type { IFlattenedItem } from '@interfaces';

import { useTranslations } from '@/i18n';

import { SelectedCheck } from './SelectedCheck';

interface INavItemMarksProps {
  item: IFlattenedItem;
  isActive: boolean;
  isSelected: boolean;
  isHighlighted: boolean;
  hidesOnHover: boolean;
}

export const NavItemMarks = ({ item, isActive, isSelected, isHighlighted, hidesOnHover }: INavItemMarksProps) => {
  const t = useTranslations();

  return (
    <>
      {item.type === 'thread' && item.resolved && !isSelected && (
        <span
          data-tour={isActive ? 'sidebarThreadResolved' : undefined}
          aria-label={t.platform.sidebar.resolved}
          title={t.platform.sidebar.resolved}
          className={clsx(
            'ml-auto flex shrink-0 items-center transition-opacity duration-150 motion-reduce:transition-none',
            hidesOnHover && 'group-hover/item:opacity-0',
          )}
        >
          <CheckCircle2 className="h-3.5 w-3.5 text-[color:var(--decision)]" strokeWidth={2.25} />
        </span>
      )}
      {isSelected && <SelectedCheck />}
      {!isSelected && item.type === 'folder' && item.childCount > 0 && (
        <ChevronRight
          aria-hidden="true"
          className={clsx(
            'ml-auto h-3 w-3 shrink-0 transition-[transform,opacity,color] duration-150 motion-reduce:transition-none',
            hidesOnHover && 'group-hover/item:opacity-0',
            !item.collapsed && 'rotate-90',
            isHighlighted ? 'text-[color:var(--accent-text)]' : 'text-[color:var(--text-subtle)]',
          )}
        />
      )}
    </>
  );
};
