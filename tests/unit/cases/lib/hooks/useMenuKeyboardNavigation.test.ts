import { renderHook } from '@testing-library/react';
import type { KeyboardEvent } from 'react';
import { afterEach, beforeEach, describe, expect, test, vi, type Mock } from 'vitest';

import { useMenuKeyboardNavigation } from '@hooks';

const trigger = document.createElement('button');
const menu = document.createElement('div');
const items = ['first', 'second', 'third'].map((label) => {
  const item = document.createElement('button');
  item.setAttribute('role', 'menuitem');
  item.textContent = label;

  return item;
});

menu.append(...items);

const listbox = document.createElement('div');
const options = ['first', 'second'].map((label) => {
  const option = document.createElement('button');
  option.setAttribute('role', 'option');
  option.textContent = label;

  return option;
});

listbox.append(...options);

let navigation: ReturnType<typeof useMenuKeyboardNavigation>;
let preventDefault: ReturnType<typeof vi.fn>;
let onOpen: Mock<() => void>;
let onClose: Mock<() => void>;

const press = (key: string, target: Element) => {
  preventDefault = vi.fn();
  navigation.handleKeyDown({ key, preventDefault, target } as unknown as KeyboardEvent<HTMLElement>);
};

const pressInMenu = (key: string) => press(key, document.activeElement ?? menu);
const pressOnTrigger = (key: string) => press(key, trigger);

beforeEach(() => {
  document.body.append(trigger, menu);
  onOpen = vi.fn();
  onClose = vi.fn();
  navigation = renderHook(() => useMenuKeyboardNavigation({ current: menu }, { onOpen, onClose })).result.current;
});

afterEach(() => {
  trigger.remove();
  menu.remove();
  listbox.remove();
});

describe('useMenuKeyboardNavigation', () => {
  describe('GIVEN a menu with three items', () => {
    describe('WHEN the first item is focused through the hook', () => {
      beforeEach(() => {
        navigation.focusItem(0);
      });

      test('THEN only that item stays in the tab order', () => {
        expect(document.activeElement).toBe(items[0]);
        expect(items.map((item) => item.tabIndex)).toEqual([0, -1, -1]);
      });
    });

    describe('WHEN ArrowDown is pressed on the first item', () => {
      beforeEach(() => {
        navigation.focusItem(0);
        pressInMenu('ArrowDown');
      });

      test('THEN focus moves to the next item and the key is consumed', () => {
        expect(document.activeElement).toBe(items[1]);
        expect(preventDefault).toHaveBeenCalledTimes(1);
        expect(onOpen).not.toHaveBeenCalled();
      });
    });

    describe('WHEN ArrowUp is pressed on the first item', () => {
      beforeEach(() => {
        navigation.focusItem(0);
        pressInMenu('ArrowUp');
      });

      test('THEN focus wraps to the last item', () => {
        expect(document.activeElement).toBe(items[2]);
      });
    });

    describe('WHEN End and then Home are pressed', () => {
      beforeEach(() => {
        navigation.focusItem(1);
        pressInMenu('End');
        pressInMenu('Home');
      });

      test('THEN focus lands on the first item', () => {
        expect(document.activeElement).toBe(items[0]);
      });
    });

    describe('WHEN an unrelated key is pressed', () => {
      beforeEach(() => {
        navigation.focusItem(0);
        pressInMenu('Enter');
      });

      test('THEN focus stays put and the key is left alone', () => {
        expect(document.activeElement).toBe(items[0]);
        expect(preventDefault).not.toHaveBeenCalled();
        expect(onClose).not.toHaveBeenCalled();
      });
    });

    describe('WHEN ArrowUp is pressed while nothing inside the menu is focused', () => {
      beforeEach(() => {
        press('ArrowUp', menu);
      });

      test('THEN focus starts from the last item', () => {
        expect(document.activeElement).toBe(items[2]);
      });
    });

    describe('WHEN Tab is pressed inside the menu', () => {
      beforeEach(() => {
        navigation.focusItem(1);
        pressInMenu('Tab');
      });

      test('THEN the menu is asked to close and the browser keeps moving focus', () => {
        expect(onClose).toHaveBeenCalledTimes(1);
        expect(preventDefault).not.toHaveBeenCalled();
        expect(document.activeElement).toBe(items[1]);
      });
    });
  });

  describe('GIVEN a trigger button outside the menu', () => {
    describe('WHEN an arrow key is pressed on the trigger', () => {
      beforeEach(() => {
        pressOnTrigger('ArrowDown');
      });

      test('THEN the menu is asked to open instead of moving focus', () => {
        expect(onOpen).toHaveBeenCalledTimes(1);
        expect(preventDefault).toHaveBeenCalledTimes(1);
        expect(document.activeElement).not.toBe(items[0]);
      });
    });

    describe('WHEN Tab or Enter is pressed on the trigger', () => {
      beforeEach(() => {
        pressOnTrigger('Tab');
        pressOnTrigger('Enter');
      });

      test('THEN the trigger keeps its native behaviour', () => {
        expect(onOpen).not.toHaveBeenCalled();
        expect(onClose).not.toHaveBeenCalled();
        expect(preventDefault).not.toHaveBeenCalled();
      });
    });
  });

  describe('GIVEN a menu without open and close callbacks', () => {
    beforeEach(() => {
      navigation = renderHook(() => useMenuKeyboardNavigation({ current: menu })).result.current;
    });

    describe('WHEN Tab is pressed inside the menu and an arrow key on the trigger', () => {
      beforeEach(() => {
        press('Tab', menu);
        pressOnTrigger('ArrowDown');
      });

      test('THEN both keys are left alone', () => {
        expect(preventDefault).not.toHaveBeenCalled();
      });
    });
  });

  describe('GIVEN a listbox whose items are options', () => {
    beforeEach(() => {
      document.body.append(listbox);
      navigation = renderHook(() => useMenuKeyboardNavigation({ current: listbox }, { itemRole: 'option' })).result
        .current;
    });

    describe('WHEN ArrowDown is pressed on the first option', () => {
      beforeEach(() => {
        navigation.focusItem(0);
        pressInMenu('ArrowDown');
      });

      test('THEN focus moves to the second option', () => {
        expect(document.activeElement).toBe(options[1]);
        expect(preventDefault).toHaveBeenCalledTimes(1);
      });
    });
  });
});
