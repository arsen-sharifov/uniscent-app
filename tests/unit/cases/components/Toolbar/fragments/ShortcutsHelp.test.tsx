import { fireEvent, render, screen, within } from '@testing-library/react';
import { Hand, Undo2 } from 'lucide-react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { IToolGroup } from '@interfaces';

import { TRANSLATIONS } from '@mocks/i18n';
import { ShortcutsHelp } from '@/components/Toolbar/fragments';

vi.mock('@/i18n', () => import('@mocks/i18n'));

const copy = TRANSLATIONS.platform.canvas.shortcuts;

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

describe('ShortcutsHelp', () => {
  describe('GIVEN the open sheet', () => {
    beforeEach(() => {
      render(<ShortcutsHelp open groups={GROUPS} activeTool="pan" onClose={onClose} />);
    });

    describe('WHEN it renders', () => {
      test('THEN a native modal dialog lists every shortcut key', () => {
        const dialog = screen.getByRole('dialog', { name: copy.ariaLabel });

        expect(dialog.tagName).toBe('DIALOG');
        expect(dialog).toHaveAttribute('aria-modal', 'true');
        expect(within(dialog).getAllByText('⌘')).toHaveLength(1);
        expect(within(dialog).getByText('⇧')).toBeInTheDocument();
        expect(within(dialog).getAllByText('Z')).toHaveLength(1);
        expect(within(dialog).getByText('H')).toBeInTheDocument();
      });
    });

    describe('WHEN the scrim is clicked', () => {
      beforeEach(() => {
        const closeButtons = screen.getAllByRole('button', { name: TRANSLATIONS.common.close });
        const scrim = closeButtons.find((button) => !screen.getByRole('dialog').contains(button));
        fireEvent.click(scrim!);
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
