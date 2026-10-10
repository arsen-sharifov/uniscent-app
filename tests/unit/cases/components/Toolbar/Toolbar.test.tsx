import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { TRANSLATIONS } from '@mocks/i18n';
import { Toolbar } from '@/components/Toolbar';
import { useOnboardingStore } from '@/lib/onboarding';

vi.mock('@/i18n', () => import('@mocks/i18n'));

const helpButton = () => screen.getByRole('button', { name: TRANSLATIONS.platform.onboarding.menuLabel });

beforeEach(() => {
  useOnboardingStore.setState({ offerOpen: false, pickerOpen: false, run: null, hint: null });
});

afterEach(() => {
  useOnboardingStore.getState().forget();
});

describe('Toolbar', () => {
  describe('GIVEN a toolbar without tool groups', () => {
    beforeEach(() => {
      render(<Toolbar groups={[]} />);
    });

    describe('WHEN it renders', () => {
      test('THEN the help section draws no divider above it', () => {
        expect(helpButton().closest('div.mx-2')).not.toHaveClass('border-t');
      });
    });
  });

  describe('GIVEN a toolbar with tool groups', () => {
    beforeEach(() => {
      render(<Toolbar groups={[{ id: 'navigate', label: 'Navigate', tools: [] }]} />);
    });

    describe('WHEN it renders', () => {
      test('THEN the help section is divided from the tools', () => {
        expect(helpButton().closest('div.mx-2')).toHaveClass('border-t');
      });
    });
  });

  describe('GIVEN the shortcuts sheet opened from the help menu', () => {
    beforeEach(() => {
      render(<Toolbar />);
      fireEvent.click(helpButton(), { detail: 1 });
      fireEvent.click(screen.getByRole('menuitem', { name: TRANSLATIONS.platform.onboarding.menuShortcuts }));
    });

    describe('WHEN the sheet opens', () => {
      test('THEN it takes focus from the closed menu', () => {
        expect(
          screen.getByRole('button', { name: TRANSLATIONS.platform.canvas.shortcuts.closeAriaLabel }),
        ).toHaveFocus();
      });
    });

    describe('WHEN the sheet is closed with Escape', () => {
      beforeEach(() => {
        fireEvent.keyDown(window, { key: 'Escape' });
      });

      test('THEN focus returns to the help button', () => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(helpButton()).toHaveFocus();
      });
    });
  });
});
