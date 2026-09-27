import type { IFolder, IFolderItem, IThread, TNavItem } from '@interfaces';

const flattenTreeAll = (items: TNavItem[]): TNavItem[] =>
  items.flatMap((item) => (item.type === 'folder' ? [item, ...flattenTreeAll(item.items)] : [item]));

export const findInTree = (items: TNavItem[], id: string): TNavItem | null =>
  flattenTreeAll(items).find((item) => item.id === id) ?? null;

export const findFirstThread = (items: TNavItem[]): string | null =>
  flattenTreeAll(items).find((item) => item.type === 'thread')?.id ?? null;

export const findParentId = (
  items: TNavItem[],
  id: string,
  parentId: string | null = null,
): string | null | undefined => {
  if (items.some((item) => item.id === id)) return parentId;

  return items
    .filter((item) => item.type === 'folder')
    .map((folder) => findParentId(folder.items, id, folder.id))
    .find((result) => result !== undefined);
};

export const getSiblings = (items: TNavItem[], parentId: string | null): TNavItem[] => {
  if (!parentId) return items;
  const parent = findInTree(items, parentId);

  return parent?.type === 'folder' ? parent.items : [];
};

export const containsThread = (item: TNavItem, threadId: string): boolean => {
  if (item.type === 'thread') return item.id === threadId;

  return item.items.some((child) => containsThread(child, threadId));
};

export const updateNavItemName = (items: TNavItem[], id: string, name: string): TNavItem[] =>
  items.map((item) => {
    if (item.id === id) return { ...item, name };
    if (item.type === 'folder') return { ...item, items: updateNavItemName(item.items, id, name) };

    return item;
  });

export const setThreadAnswered = (items: TNavItem[], threadId: string, answered: boolean): TNavItem[] =>
  items.map((item) => {
    if (item.type === 'folder') return { ...item, items: setThreadAnswered(item.items, threadId, answered) };
    if (item.id === threadId) return { ...item, answered };

    return item;
  });

export const removeFromTree = (items: TNavItem[], id: string): TNavItem[] =>
  items
    .filter((item) => item.id !== id)
    .map((item) => (item.type === 'folder' ? { ...item, items: removeFromTree(item.items, id) } : item));

export const insertIntoTree = (
  items: TNavItem[],
  item: TNavItem,
  parentId: string | null,
  position: number,
): TNavItem[] => {
  if (!parentId) {
    const result = [...items];
    result.splice(position, 0, item);

    return result;
  }

  return items.map((node) => {
    if (node.type !== 'folder') return node;
    if (node.id === parentId) {
      const newItems = [...node.items];
      newItems.splice(position, 0, item);

      return { ...node, items: newItems };
    }

    return {
      ...node,
      items: insertIntoTree(node.items, item, parentId, position),
    };
  });
};

export const filterTree = (items: TNavItem[], query: string): TNavItem[] => {
  if (!query) return items;
  const needle = query.toLowerCase();

  const walk = (list: TNavItem[]): TNavItem[] =>
    list.flatMap<TNavItem>((item) => {
      const selfMatches = item.name.toLowerCase().includes(needle);

      if (item.type === 'thread') return selfMatches ? [item] : [];

      const matchedChildren = walk(item.items);
      if (!selfMatches && matchedChildren.length === 0) return [];

      return [
        {
          ...item,
          items: selfMatches && matchedChildren.length === 0 ? item.items : matchedChildren,
        },
      ];
    });

  return walk(items);
};

export const buildNavTree = (folders: IFolder[], threads: IThread[]): TNavItem[] => {
  const folderMap = new Map<string, IFolderItem>(
    folders.map((folder) => [folder.id, { type: 'folder', id: folder.id, name: folder.name, items: [] }]),
  );

  const entries: {
    parentId: string | null;
    item: TNavItem;
    position: number;
  }[] = [
    ...folders.map((folder) => ({
      parentId: folder.parentFolderId && folderMap.has(folder.parentFolderId) ? folder.parentFolderId : null,
      item: folderMap.get(folder.id) as TNavItem,
      position: folder.position,
    })),
    ...threads.map((thread) => ({
      parentId: thread.folderId && folderMap.has(thread.folderId) ? thread.folderId : null,
      item: {
        type: 'thread',
        id: thread.id,
        name: thread.name,
        answered: thread.hasAnswer,
      } as TNavItem,
      position: thread.position,
    })),
  ];

  const childrenByParent = entries.reduce((acc, { parentId, item, position }) => {
    const list = acc.get(parentId) ?? [];
    list.push({ item, position });
    acc.set(parentId, list);

    return acc;
  }, new Map<string | null, { item: TNavItem; position: number }[]>());

  childrenByParent.forEach((children, parentId) => {
    children.sort((a, b) => a.position - b.position);
    if (parentId) {
      const parent = folderMap.get(parentId);
      if (parent) parent.items = children.map((c) => c.item);
    }
  });

  return (childrenByParent.get(null) ?? []).map((c) => c.item);
};
