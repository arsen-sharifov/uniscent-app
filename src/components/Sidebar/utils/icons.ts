import { FileText, Folder, FolderOpen, type LucideIcon } from 'lucide-react';

import type { IFlattenedItem } from '@interfaces';

export const getNavItemIcon = ({ type, childCount, collapsed }: IFlattenedItem): LucideIcon => {
  if (type === 'thread') return FileText;
  if (childCount === 0 || collapsed) return Folder;

  return FolderOpen;
};
