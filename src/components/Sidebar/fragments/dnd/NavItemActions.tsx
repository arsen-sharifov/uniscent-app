'use client';

import { Pencil, Plus, Trash2 } from 'lucide-react';

import type { IFlattenedItem, TNavItemType } from '@interfaces';

import { useTranslations } from '@/i18n';

import { ItemActionButton } from './ItemActionButton';
import { ItemActionsToolbar } from './ItemActionsToolbar';

interface INavItemActionsProps {
  item: IFlattenedItem;
  isActive: boolean;
  isSelected: boolean;
  startEditing: (id: string, name: string) => void;
  onRequestDelete?: (id: string, name: string, type: TNavItemType) => void;
  onCreateThread?: (folderId?: string) => void;
}

export const NavItemActions = ({
  item,
  isActive,
  isSelected,
  startEditing,
  onRequestDelete,
  onCreateThread,
}: INavItemActionsProps) => {
  const t = useTranslations();

  return (
    <ItemActionsToolbar isActive={isActive} isSelected={isSelected}>
      {item.type === 'folder' && (
        <ItemActionButton
          icon={Plus}
          tone="accent"
          title={t.platform.sidebar.newThread}
          onClick={() => onCreateThread?.(item.id)}
        />
      )}
      <ItemActionButton
        icon={Pencil}
        tone="neutral"
        title={t.platform.sidebar.rename}
        onClick={() => startEditing(item.id, item.name)}
      />
      <ItemActionButton
        icon={Trash2}
        tone="danger"
        title={t.platform.sidebar.delete}
        onClick={() => onRequestDelete?.(item.id, item.name, item.type)}
      />
    </ItemActionsToolbar>
  );
};
