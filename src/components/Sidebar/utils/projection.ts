import type { IFlattenedItem, IProjection, TDropZone, TNavItem } from '@interfaces';

import { DROP_ZONE_HYSTERESIS_PX, FOLDER_INSIDE_THRESHOLD, LEAF_SPLIT_THRESHOLD, MAX_DEPTH } from '../consts';

const countDescendants = (items: TNavItem[]): number =>
  items.reduce((sum, item) => sum + 1 + (item.type === 'folder' ? countDescendants(item.items) : 0), 0);

export const flattenTree = (
  items: TNavItem[],
  collapsedIds: Set<string>,
  parentId: string | null = null,
  depth = 0,
): IFlattenedItem[] =>
  items.flatMap((item, index) => {
    const isFolder = item.type === 'folder';
    const collapsed = isFolder && collapsedIds.has(item.id);
    const children = isFolder && !collapsed ? flattenTree(item.items, collapsedIds, item.id, depth + 1) : [];
    const childCount = collapsed ? countDescendants(item.items) : children.length;

    const flatItem: IFlattenedItem = {
      id: item.id,
      name: item.name,
      type: item.type,
      parentId,
      depth,
      index,
      collapsed,
      childCount,
      resolved: item.type === 'thread' ? item.resolved : undefined,
    };

    return [flatItem, ...children];
  });

const isDescendantOrSelf = (flatItems: IFlattenedItem[], itemId: string, potentialAncestorId: string): boolean => {
  if (itemId === potentialAncestorId) return true;
  const parentId = flatItems.find((item) => item.id === itemId)?.parentId;

  return !!parentId && isDescendantOrSelf(flatItems, parentId, potentialAncestorId);
};

export const getProjection = (
  flatItems: IFlattenedItem[],
  activeId: string,
  overId: string,
  zone: TDropZone,
  subtreeDepth: number,
): IProjection | null => {
  if (activeId === overId) return null;

  const activeIndex = flatItems.findIndex((item) => item.id === activeId);
  const overIndex = flatItems.findIndex((item) => item.id === overId);
  if (activeIndex === -1 || overIndex === -1) return null;

  const activeItem = flatItems[activeIndex] as IFlattenedItem;
  const overItem = flatItems[overIndex] as IFlattenedItem;
  const maxDepth = MAX_DEPTH - subtreeDepth;

  if (zone === 'inside' && overItem.type === 'folder' && overItem.id !== activeId) {
    const depth = overItem.depth + 1;
    if (depth <= maxDepth) {
      if (activeItem.type !== 'folder' || !isDescendantOrSelf(flatItems, overItem.id, activeId)) {
        return { depth, parentId: overItem.id, zone: 'inside' };
      }
    }
  }

  if (overItem.depth > maxDepth) return null;

  const parentId = overItem.parentId;
  if (activeItem.type === 'folder' && parentId && isDescendantOrSelf(flatItems, parentId, activeId)) return null;

  return { depth: overItem.depth, parentId, zone: zone === 'inside' ? 'before' : zone };
};

const findAnchorAtParent = (items: IFlattenedItem[], id: string, targetParentId: string | null): string | null => {
  const node = items.find((item) => item.id === id);
  if (!node) return null;
  if (node.parentId === targetParentId) return node.id;

  return node.parentId ? findAnchorAtParent(items, node.parentId, targetParentId) : null;
};

export const getDropPosition = (
  items: IFlattenedItem[],
  activeId: string,
  overId: string,
  projection: IProjection,
): number => {
  if (projection.zone === 'inside') return 0;
  const siblings = items.filter((item) => item.id !== activeId && item.parentId === projection.parentId);
  const anchorId = findAnchorAtParent(items, overId, projection.parentId);
  const anchorIndex = siblings.findIndex((item) => item.id === anchorId);
  if (anchorIndex === -1) return siblings.length;

  return anchorIndex + (projection.zone === 'after' ? 1 : 0);
};

const resolveFolderZone = (ratio: number, previous: TDropZone, sameTarget: boolean, buffer: number): TDropZone => {
  if (!sameTarget) return ratio < FOLDER_INSIDE_THRESHOLD ? 'before' : 'inside';
  if (previous === 'before') return ratio > FOLDER_INSIDE_THRESHOLD + buffer ? 'inside' : 'before';
  if (previous === 'inside') return ratio < FOLDER_INSIDE_THRESHOLD - buffer ? 'before' : 'inside';

  return ratio < FOLDER_INSIDE_THRESHOLD ? 'before' : 'inside';
};

const resolveLeafZone = (ratio: number, previous: TDropZone, sameTarget: boolean, buffer: number): TDropZone => {
  if (!sameTarget) return ratio < LEAF_SPLIT_THRESHOLD ? 'before' : 'after';
  if (previous === 'before') return ratio > LEAF_SPLIT_THRESHOLD + buffer ? 'after' : 'before';

  return ratio < LEAF_SPLIT_THRESHOLD - buffer ? 'before' : 'after';
};

export const resolveDropZone = (
  isFolder: boolean,
  ratio: number,
  previous: TDropZone,
  sameTarget: boolean,
  rowHeight: number,
): TDropZone => {
  const buffer = sameTarget ? DROP_ZONE_HYSTERESIS_PX / rowHeight : 0;

  return isFolder
    ? resolveFolderZone(ratio, previous, sameTarget, buffer)
    : resolveLeafZone(ratio, previous, sameTarget, buffer);
};

export const resolveKeyboardDropZone = (
  items: readonly { id: string }[],
  activeId: string,
  overId: string,
): Exclude<TDropZone, 'inside'> => {
  const overIndex = items.findIndex((item) => item.id === overId);
  const activeIndex = items.findIndex((item) => item.id === activeId);

  return overIndex > activeIndex ? 'after' : 'before';
};

export const removeChildrenOf = (flatItems: IFlattenedItem[], ids: Set<string>): IFlattenedItem[] => {
  const excluded = flatItems.reduce((accumulator, item) => {
    if (item.parentId && (ids.has(item.parentId) || accumulator.has(item.parentId))) {
      accumulator.add(item.id);
    }

    return accumulator;
  }, new Set<string>());

  return flatItems.filter((item) => !excluded.has(item.id));
};
