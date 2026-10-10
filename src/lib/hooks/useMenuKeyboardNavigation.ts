'use client';

import { type KeyboardEvent, type RefObject, useCallback } from 'react';

import type { IUseMenuKeyboardNavigationOptions } from '@interfaces';

const MENU_OPEN_KEYS: ReadonlySet<string> = new Set(['ArrowDown', 'ArrowUp']);

export const useMenuKeyboardNavigation = (
  menuRef: RefObject<HTMLElement | null>,
  { itemRole = 'menuitem', onOpen, onClose }: IUseMenuKeyboardNavigationOptions = {},
) => {
  const getItems = useCallback(
    () => Array.from(menuRef.current?.querySelectorAll<HTMLElement>(`[role="${itemRole}"]`) ?? []),
    [menuRef, itemRole],
  );

  const focusItem = useCallback(
    (index: number) => {
      const items = getItems();
      items.forEach((item, position) => {
        item.tabIndex = position === index ? 0 : -1;
      });
      items[index]?.focus();
    },
    [getItems],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        if (!onOpen || !MENU_OPEN_KEYS.has(event.key)) return;

        event.preventDefault();
        onOpen();

        return;
      }

      if (event.key === 'Tab') {
        onClose?.();

        return;
      }

      const items = getItems();
      if (items.length === 0) return;
      const active = document.activeElement;
      const current = active instanceof HTMLElement ? items.indexOf(active) : -1;
      const targets: Record<string, number> = {
        ArrowDown: (current + 1) % items.length,
        ArrowUp: (Math.max(current, 0) - 1 + items.length) % items.length,
        Home: 0,
        End: items.length - 1,
      };
      const next = targets[event.key];
      if (next === undefined) return;
      event.preventDefault();
      focusItem(next);
    },
    [menuRef, getItems, focusItem, onOpen, onClose],
  );

  return { focusItem, handleKeyDown };
};
