import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { Popover } from '@/components/Popover';

const onOpenChange = vi.fn();

describe('Popover', () => {
  describe('GIVEN a closed popover', () => {
    beforeEach(() => {
      render(
        <Popover
          open={false}
          onOpenChange={onOpenChange}
          renderTrigger={(trigger) => (
            <button type="button" {...trigger}>
              Account
            </button>
          )}
        >
          <p>Panel</p>
        </Popover>,
      );
    });

    describe('WHEN it renders', () => {
      test('THEN the trigger is the only tab stop and announces a collapsed dialog', () => {
        const trigger = screen.getByRole('button', { name: 'Account' });

        expect(screen.getAllByRole('button')).toHaveLength(1);
        expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
        expect(trigger).toHaveAttribute('aria-expanded', 'false');
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    describe('WHEN the trigger is clicked', () => {
      beforeEach(() => {
        fireEvent.click(screen.getByRole('button', { name: 'Account' }));
      });

      test('THEN it asks to open', () => {
        expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(true);
      });
    });
  });

  describe('GIVEN an open popover', () => {
    beforeEach(() => {
      render(
        <Popover
          open
          onOpenChange={onOpenChange}
          renderTrigger={(trigger) => (
            <button type="button" {...trigger}>
              Account
            </button>
          )}
        >
          <p>Panel</p>
        </Popover>,
      );
    });

    describe('WHEN it renders', () => {
      test('THEN the panel is a focused native dialog anchored below the expanded trigger', () => {
        const dialog = screen.getByRole('dialog');

        expect(dialog.tagName).toBe('DIALOG');
        expect(dialog).toHaveTextContent('Panel');
        expect(dialog).toHaveFocus();
        expect(dialog.style.position).toBe('fixed');
        expect(screen.getByRole('button', { name: 'Account' })).toHaveAttribute('aria-expanded', 'true');
      });
    });

    describe('WHEN the trigger is clicked', () => {
      beforeEach(() => {
        fireEvent.click(screen.getByRole('button', { name: 'Account' }));
      });

      test('THEN it asks to close', () => {
        expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(false);
      });
    });

    describe('WHEN the pointer goes down inside the panel', () => {
      beforeEach(() => {
        fireEvent.mouseDown(screen.getByText('Panel'));
      });

      test('THEN it stays open', () => {
        expect(onOpenChange).not.toHaveBeenCalled();
      });
    });

    describe('WHEN the pointer goes down outside', () => {
      beforeEach(() => {
        fireEvent.mouseDown(document.body);
      });

      test('THEN it asks to close', () => {
        expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(false);
      });
    });
  });
});
