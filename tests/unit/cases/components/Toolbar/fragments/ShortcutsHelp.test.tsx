import { fireEvent, render, screen, within } from '@testing-library/react';
import { Hand, Undo2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { IToolGroup } from '@interfaces';

import { TRANSLATIONS } from '@mocks/i18n';
import { ShortcutsHelp } from '@/components/Toolbar/fragments';

vi.mock('@/i18n', () => import('@mocks/i18n'));

const GROUPS: IToolGroup[] = [
  {
    id: 'navigation',
    label: 'Navigation',
    tools: [
      { id: 'pan', icon: Hand, label: 'Pan', shortcut: 'H' },
      { id: 'undo', icon: Undo2, label: 'Undo', shortcut: '⌘⇧Z', kind: 'action' },
    ],
  },
];

const onClose = vi.fn();

let rerender: (ui: ReactNode) => void;

const scrim = () => screen.getAllByRole('button', { hidden: true }).find((button) => button.closest('dialog') === null);

const withTrigger = (open: boolean) => (
  <>
    <button type="button">Canvas</button>
    <ShortcutsHelp open={open} groups={GROUPS} onClose={onClose} />
  </>
);

describe('ShortcutsHelp', () => {
  describe('GIVEN the open sheet', () => {
    beforeEach(() => {
      render(<ShortcutsHelp open groups={GROUPS} activeTool="pan" onClose={onClose} />);
    });

    describe('WHEN it renders', () => {
      test('THEN a native modal dialog lists every shortcut key', () => {
        const dialog = screen.getByRole('dialog', { name: TRANSLATIONS.platform.canvas.shortcuts.ariaLabel });

        expect(dialog.tagName).toBe('DIALOG');
        expect(dialog).toHaveAttribute('aria-modal', 'true');
        expect(within(dialog).getAllByText('⌘')).toHaveLength(1);
        expect(within(dialog).getByText('⇧')).toBeInTheDocument();
        expect(within(dialog).getAllByText('Z')).toHaveLength(1);
        expect(within(dialog).getByText('H')).toBeInTheDocument();
      });

      test('THEN the close button in the header is the only close control assistive technology sees', () => {
        const [close, ...others] = screen.getAllByRole('button', {
          name: TRANSLATIONS.platform.canvas.shortcuts.closeAriaLabel,
        });

        expect(others).toHaveLength(0);
        expect(close).toHaveFocus();
        expect(screen.getByRole('dialog')).toContainElement(close ?? null);
        expect(scrim()).toHaveAttribute('aria-hidden', 'true');
      });
    });

    describe('WHEN the scrim is clicked', () => {
      beforeEach(() => {
        fireEvent.click(scrim()!);
      });

      test('THEN the sheet asks to close', () => {
        expect(onClose).toHaveBeenCalledOnce();
      });
    });

    describe('WHEN something inside the sheet is clicked', () => {
      beforeEach(() => {
        fireEvent.click(screen.getByText('Navigation'));
      });

      test('THEN the sheet stays open', () => {
        expect(onClose).not.toHaveBeenCalled();
      });
    });
  });

  describe('GIVEN the sheet opened while another control held focus', () => {
    beforeEach(() => {
      rerender = render(withTrigger(false)).rerender;
      screen.getByRole('button', { name: 'Canvas' }).focus();
      rerender(withTrigger(true));
    });

    describe('WHEN it closes', () => {
      beforeEach(() => {
        rerender(withTrigger(false));
      });

      test('THEN focus returns to that control', () => {
        expect(screen.getByRole('button', { name: 'Canvas' })).toHaveFocus();
      });
    });
  });

  describe('GIVEN the closed sheet', () => {
    describe('WHEN it renders', () => {
      beforeEach(() => {
        render(<ShortcutsHelp open={false} groups={GROUPS} onClose={onClose} />);
      });

      test('THEN nothing is shown', () => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });
  });
});
