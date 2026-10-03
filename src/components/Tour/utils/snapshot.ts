import type { TNavItem, TTourAnchor } from '@interfaces';

export const countFolders = (items: readonly TNavItem[]): number =>
  items.reduce((total, item) => (item.type === 'folder' ? total + 1 + countFolders(item.items) : total), 0);

export const countNestedThreads = (items: readonly TNavItem[], insideFolder = false): number =>
  items.reduce((total, item) => {
    if (item.type === 'thread') return insideFolder ? total + 1 : total;

    return total + countNestedThreads(item.items, true);
  }, 0);

export const sameAnchors = (first: ReadonlySet<TTourAnchor>, second: ReadonlySet<TTourAnchor>): boolean =>
  first.size === second.size && [...first].every((anchor) => second.has(anchor));
