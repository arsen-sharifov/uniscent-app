import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { useFocusTrap } from '@hooks';

const container = document.createElement('div');
const first = document.createElement('button');
const last = document.createElement('button');
const tourCard = document.createElement('dialog');
const tourCardFirst = document.createElement('button');
const tourCardLast = document.createElement('button');
const innerContainer = document.createElement('div');
const innerFirst = document.createElement('button');
const innerLast = document.createElement('button');

container.tabIndex = -1;
container.append(first, last);
tourCard.setAttribute('data-tour-card', '');
tourCard.append(tourCardFirst, tourCardLast);
innerContainer.append(innerFirst, innerLast);

let tabEvent: KeyboardEvent;

beforeEach(() => {
  document.body.append(container);
});

afterEach(() => {
  container.remove();
  tourCard.remove();
  innerContainer.remove();
});

describe('useFocusTrap', () => {
  describe('GIVEN an active trap around two focusable elements', () => {
    beforeEach(() => {
      renderHook(() => useFocusTrap({ current: container }, true));
    });

    describe('WHEN Tab is pressed on the last element', () => {
      beforeEach(() => {
        last.focus();
        tabEvent = new KeyboardEvent('keydown', { key: 'Tab', cancelable: true });
        document.dispatchEvent(tabEvent);
      });

      test('THEN the focus wraps to the first element', () => {
        expect(document.activeElement).toBe(first);
        expect(tabEvent.defaultPrevented).toBe(true);
      });
    });

    describe('WHEN Shift+Tab is pressed on the first element', () => {
      beforeEach(() => {
        first.focus();
        tabEvent = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, cancelable: true });
        document.dispatchEvent(tabEvent);
      });

      test('THEN the focus wraps to the last element', () => {
        expect(document.activeElement).toBe(last);
        expect(tabEvent.defaultPrevented).toBe(true);
      });
    });

    describe('WHEN Tab is pressed away from the boundaries', () => {
      beforeEach(() => {
        first.focus();
        tabEvent = new KeyboardEvent('keydown', { key: 'Tab', cancelable: true });
        document.dispatchEvent(tabEvent);
      });

      test('THEN the focus is left to the browser', () => {
        expect(document.activeElement).toBe(first);
        expect(tabEvent.defaultPrevented).toBe(false);
      });
    });

    describe('WHEN Shift+Tab is pressed while the container itself holds focus', () => {
      beforeEach(() => {
        container.focus();
        tabEvent = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, cancelable: true });
        document.dispatchEvent(tabEvent);
      });

      test('THEN the focus wraps to the last element instead of leaving the trap', () => {
        expect(document.activeElement).toBe(last);
        expect(tabEvent.defaultPrevented).toBe(true);
      });
    });

    describe('WHEN Shift+Tab is pressed on the last element', () => {
      beforeEach(() => {
        last.focus();
        tabEvent = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, cancelable: true });
        document.dispatchEvent(tabEvent);
      });

      test('THEN the focus does not wrap', () => {
        expect(document.activeElement).toBe(last);
        expect(tabEvent.defaultPrevented).toBe(false);
      });
    });
  });

  describe('GIVEN an active trap while the tour card is open', () => {
    beforeEach(() => {
      document.body.append(tourCard);
      renderHook(() => useFocusTrap({ current: container }, true));
    });

    describe('WHEN Tab is pressed on the last element', () => {
      beforeEach(() => {
        last.focus();
        tabEvent = new KeyboardEvent('keydown', { key: 'Tab', cancelable: true });
        document.dispatchEvent(tabEvent);
      });

      test('THEN the focus moves to the first control of the tour card', () => {
        expect(document.activeElement).toBe(tourCardFirst);
        expect(tabEvent.defaultPrevented).toBe(true);
      });
    });

    describe('WHEN Tab is pressed on the last control of the tour card', () => {
      beforeEach(() => {
        tourCardLast.focus();
        tabEvent = new KeyboardEvent('keydown', { key: 'Tab', cancelable: true });
        document.dispatchEvent(tabEvent);
      });

      test('THEN the focus returns to the first element of the trap', () => {
        expect(document.activeElement).toBe(first);
        expect(tabEvent.defaultPrevented).toBe(true);
      });
    });

    describe('WHEN Shift+Tab is pressed on the first element', () => {
      beforeEach(() => {
        first.focus();
        tabEvent = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, cancelable: true });
        document.dispatchEvent(tabEvent);
      });

      test('THEN the focus moves to the last control of the tour card', () => {
        expect(document.activeElement).toBe(tourCardLast);
        expect(tabEvent.defaultPrevented).toBe(true);
      });
    });

    describe('WHEN Shift+Tab is pressed on the first control of the tour card', () => {
      beforeEach(() => {
        tourCardFirst.focus();
        tabEvent = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, cancelable: true });
        document.dispatchEvent(tabEvent);
      });

      test('THEN the focus returns to the last element of the trap', () => {
        expect(document.activeElement).toBe(last);
        expect(tabEvent.defaultPrevented).toBe(true);
      });
    });

    describe('WHEN Tab is pressed between the controls of the tour card', () => {
      beforeEach(() => {
        tourCardFirst.focus();
        tabEvent = new KeyboardEvent('keydown', { key: 'Tab', cancelable: true });
        document.dispatchEvent(tabEvent);
      });

      test('THEN the focus is left to the browser', () => {
        expect(document.activeElement).toBe(tourCardFirst);
        expect(tabEvent.defaultPrevented).toBe(false);
      });
    });
  });

  describe('GIVEN a trap opened over another active trap while the tour card is open', () => {
    beforeEach(() => {
      document.body.append(innerContainer, tourCard);
      renderHook(() => useFocusTrap({ current: container }, true));
      renderHook(() => useFocusTrap({ current: innerContainer }, true));
    });

    describe('WHEN Tab is pressed on the last element of the newer trap', () => {
      beforeEach(() => {
        innerLast.focus();
        tabEvent = new KeyboardEvent('keydown', { key: 'Tab', cancelable: true });
        document.dispatchEvent(tabEvent);
      });

      test('THEN the focus moves to the first control of the tour card', () => {
        expect(document.activeElement).toBe(tourCardFirst);
      });
    });

    describe('WHEN Tab is pressed on the last control of the tour card', () => {
      beforeEach(() => {
        tourCardLast.focus();
        tabEvent = new KeyboardEvent('keydown', { key: 'Tab', cancelable: true });
        document.dispatchEvent(tabEvent);
      });

      test('THEN the focus returns to the newer trap, not the one beneath it', () => {
        expect(document.activeElement).toBe(innerFirst);
      });
    });

    describe('WHEN Shift+Tab is pressed on the first element of the newer trap', () => {
      beforeEach(() => {
        innerFirst.focus();
        tabEvent = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, cancelable: true });
        document.dispatchEvent(tabEvent);
      });

      test('THEN the focus moves to the last control of the tour card', () => {
        expect(document.activeElement).toBe(tourCardLast);
      });
    });
  });

  describe('GIVEN an active trap without focusable elements', () => {
    beforeEach(() => {
      renderHook(() => useFocusTrap({ current: document.createElement('div') }, true));
    });

    describe('WHEN Tab is pressed', () => {
      beforeEach(() => {
        tabEvent = new KeyboardEvent('keydown', { key: 'Tab', cancelable: true });
        document.dispatchEvent(tabEvent);
      });

      test('THEN the focus is left to the browser', () => {
        expect(tabEvent.defaultPrevented).toBe(false);
      });
    });
  });

  describe('GIVEN an inactive trap', () => {
    beforeEach(() => {
      renderHook(() => useFocusTrap({ current: container }, false));
    });

    describe('WHEN Tab is pressed on the last element', () => {
      beforeEach(() => {
        last.focus();
        tabEvent = new KeyboardEvent('keydown', { key: 'Tab', cancelable: true });
        document.dispatchEvent(tabEvent);
      });

      test('THEN the focus does not wrap', () => {
        expect(document.activeElement).toBe(last);
        expect(tabEvent.defaultPrevented).toBe(false);
      });
    });
  });

  describe('GIVEN an unmounted trap', () => {
    beforeEach(() => {
      renderHook(() => useFocusTrap({ current: container }, true)).unmount();
    });

    describe('WHEN Tab is pressed on the last element', () => {
      beforeEach(() => {
        last.focus();
        tabEvent = new KeyboardEvent('keydown', { key: 'Tab', cancelable: true });
        document.dispatchEvent(tabEvent);
      });

      test('THEN the focus does not wrap', () => {
        expect(document.activeElement).toBe(last);
        expect(tabEvent.defaultPrevented).toBe(false);
      });
    });
  });
});
