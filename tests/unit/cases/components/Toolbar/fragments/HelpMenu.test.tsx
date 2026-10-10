import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { TRANSLATIONS } from '@mocks/i18n';
import { HelpMenu } from '@/components/Toolbar/fragments';
import { useOnboardingStore } from '@/lib/onboarding';

vi.mock('@/i18n', () => import('@mocks/i18n'));

const onShortcuts = vi.fn();

const helpButton = () => screen.getByRole('button', { name: TRANSLATIONS.platform.onboarding.menuLabel });
const menuItem = (name: string) => screen.getByRole('menuitem', { name });
const openWithPointer = () => fireEvent.click(helpButton(), { detail: 1 });

beforeEach(() => {
  useOnboardingStore.setState({ offerOpen: false, pickerOpen: false, run: null, hint: null });
  render(<HelpMenu onShortcuts={onShortcuts} />);
});

describe('HelpMenu', () => {
  describe('GIVEN the help control at the foot of the toolbar', () => {
    describe('WHEN it is clicked with the pointer', () => {
      beforeEach(() => {
        openWithPointer();
      });

      test('THEN the menu opens with the shortcuts and one entry for the tour and guides, and takes focus itself', () => {
        expect(screen.getAllByRole('menuitem').map((item) => item.textContent)).toEqual([
          TRANSLATIONS.platform.onboarding.menuShortcuts,
          TRANSLATIONS.platform.onboarding.menuGuides,
        ]);
        expect(screen.getByRole('menu')).toHaveFocus();
        expect(helpButton()).toHaveAttribute('aria-expanded', 'true');
      });
    });

    describe('WHEN it is activated from the keyboard', () => {
      beforeEach(() => {
        fireEvent.click(helpButton(), { detail: 0 });
      });

      test('THEN the shortcuts item is focused', () => {
        expect(menuItem(TRANSLATIONS.platform.onboarding.menuShortcuts)).toHaveFocus();
      });
    });

    describe('WHEN an arrow key is pressed on it', () => {
      beforeEach(() => {
        fireEvent.keyDown(helpButton(), { key: 'ArrowDown' });
      });

      test('THEN the menu opens on the shortcuts item', () => {
        expect(menuItem(TRANSLATIONS.platform.onboarding.menuShortcuts)).toHaveFocus();
      });
    });

    describe('WHEN the shortcuts item is chosen', () => {
      beforeEach(() => {
        openWithPointer();
        fireEvent.click(menuItem(TRANSLATIONS.platform.onboarding.menuShortcuts));
      });

      test('THEN the sheet is requested, the menu closes and the help button holds focus for the sheet to return to', () => {
        expect(onShortcuts).toHaveBeenCalledTimes(1);
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
        expect(helpButton()).toHaveFocus();
      });
    });

    describe('WHEN the tour and guides entry is chosen', () => {
      beforeEach(() => {
        openWithPointer();
        fireEvent.click(menuItem(TRANSLATIONS.platform.onboarding.menuGuides));
      });

      test('THEN the picker opens, the menu closes and the help button holds focus for the picker to return to', () => {
        expect(useOnboardingStore.getState().pickerOpen).toBe(true);
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
        expect(helpButton()).toHaveFocus();
      });
    });

    describe('WHEN it is opened while Nodi points at it', () => {
      beforeEach(() => {
        act(() => useOnboardingStore.setState({ hint: 'afterDecline' }));
        openWithPointer();
      });

      test('THEN the pointer steps aside for the menu', () => {
        expect(useOnboardingStore.getState().hint).toBeNull();
      });
    });

    describe('WHEN the user leaves the open menu with Escape', () => {
      beforeEach(() => {
        openWithPointer();
        fireEvent.keyDown(window, { key: 'Escape' });
      });

      test('THEN the menu closes and focus returns to the button', () => {
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
        expect(helpButton()).toHaveFocus();
      });
    });

    describe('WHEN the user clicks outside the open menu', () => {
      beforeEach(() => {
        openWithPointer();
        fireEvent.mouseDown(document.body);
      });

      test('THEN the menu closes without moving focus', () => {
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
        expect(helpButton()).not.toHaveFocus();
      });
    });

    describe('WHEN it is clicked again while the menu is open', () => {
      beforeEach(() => {
        openWithPointer();
        openWithPointer();
      });

      test('THEN the menu closes', () => {
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
        expect(helpButton()).toHaveAttribute('aria-expanded', 'false');
      });
    });
  });
});
