'use client';

import { clsx } from 'clsx';
import type { KeyboardEvent, MouseEvent } from 'react';

import type { IFlattenedItem } from '@interfaces';

import { ItemIcon } from './ItemIcon';
import { ItemLabel } from './ItemLabel';
import { ItemRowButton } from './ItemRowButton';
import { NavItemMarks } from './NavItemMarks';
import { getNavItemIcon } from '../../utils';

interface INavItemButtonProps {
  item: IFlattenedItem;
  isActive: boolean;
  isSelected: boolean;
  isEditing: boolean;
  isDropTarget: boolean;
  showsTools: boolean;
  editValue: string;
  setEditValue: (value: string) => void;
  inputRef: (element: HTMLInputElement | null) => void;
  commitRename: () => void;
  handleKeyDown: (event: KeyboardEvent) => void;
  onClick: (event: MouseEvent) => void;
}

export const NavItemButton = ({
  item,
  isActive,
  isSelected,
  isEditing,
  isDropTarget,
  showsTools,
  editValue,
  setEditValue,
  inputRef,
  commitRename,
  handleKeyDown,
  onClick,
}: INavItemButtonProps) => {
  const isFolder = item.type === 'folder';
  const isHighlighted = isActive || isDropTarget;

  return (
    <ItemRowButton
      role="treeitem"
      aria-level={item.depth + 1}
      aria-expanded={isFolder ? !item.collapsed : undefined}
      aria-selected={isSelected || undefined}
      isActive={isActive}
      isSelected={isSelected}
      onClick={onClick}
      className={clsx(
        'px-2 py-1.5',
        isFolder && item.childCount === 0 ? 'cursor-default' : 'cursor-pointer',
        isFolder && !isActive && 'font-medium',
        isDropTarget &&
          'bg-[color:var(--accent-soft)] !text-[color:var(--accent-text)] !ring-2 !ring-[color:var(--accent)] ring-inset',
      )}
    >
      <ItemIcon
        icon={getNavItemIcon(item)}
        isHighlighted={isFolder ? isHighlighted : isActive}
        hidesOnHover={showsTools}
      />
      <ItemLabel
        name={item.name}
        isEditing={isEditing}
        editValue={editValue}
        setEditValue={setEditValue}
        inputRef={inputRef}
        commitRename={commitRename}
        handleKeyDown={handleKeyDown}
      />
      {!isEditing && (
        <NavItemMarks
          item={item}
          isActive={isActive}
          isSelected={isSelected}
          isHighlighted={isHighlighted}
          hidesOnHover={showsTools}
        />
      )}
    </ItemRowButton>
  );
};
