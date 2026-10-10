'use client';

import { type RefObject, useEffect } from 'react';

import { FOCUSABLE_SELECTOR, TOUR_CARD_SELECTOR } from '@constants';

const activeTraps: ((event: KeyboardEvent) => void)[] = [];

export const useFocusTrap = (containerRef: RefObject<HTMLElement | null>, active: boolean): void => {
  useEffect(() => {
    if (!active) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const container = containerRef.current;
      if (event.key !== 'Tab' || !container || activeTraps.at(-1) !== handleKeyDown) return;

      const groups = [container, document.querySelector<HTMLElement>(TOUR_CARD_SELECTOR)]
        .map((group) => Array.from(group?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? []))
        .filter((focusable) => focusable.length > 0);
      const cycle = groups.flat();
      const current = event.shiftKey && document.activeElement === container ? cycle[0] : document.activeElement;
      const isGroupEdge = groups.some((focusable) => current === (event.shiftKey ? focusable[0] : focusable.at(-1)));
      if (!isGroupEdge) return;

      event.preventDefault();
      const index = cycle.findIndex((element) => element === current);
      cycle.at((index + (event.shiftKey ? -1 : 1)) % cycle.length)!.focus();
    };

    activeTraps.push(handleKeyDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      activeTraps.splice(activeTraps.indexOf(handleKeyDown), 1);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [containerRef, active]);
};
