import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { TRANSLATIONS } from '@mocks/i18n';
import { NonForwardingTrigger } from '@mocks/tooltip';
import { Tooltip } from '@/components/Tooltip';

vi.mock('@/i18n', () => import('@mocks/i18n'));

const HELP = 'Required during closed beta.';

const onTriggerFocus = vi.fn();

describe('Tooltip', () => {
  describe('GIVEN a tooltip with the default info trigger', () => {
    beforeEach(() => {
      render(<Tooltip text={HELP} />);
    });

    describe('WHEN it renders', () => {
      test('THEN the trigger is a named button that keyboard users can reach and that carries the help text', () => {
        const trigger = screen.getByRole('button', { name: TRANSLATIONS.common.moreInfo });

        expect(trigger).toHaveAttribute('type', 'button');
        expect(trigger).toHaveAccessibleDescription(HELP);
      });
    });
  });

  describe('GIVEN a tooltip whose info trigger has keyboard focus', () => {
    beforeEach(() => {
      render(<Tooltip text={HELP} />);
      act(() => screen.getByRole('button', { name: TRANSLATIONS.common.moreInfo }).focus());
    });

    describe('WHEN it renders', () => {
      test('THEN the help text shows while the trigger area is hovered or holds focus', () => {
        expect(screen.getByRole('tooltip')).toHaveClass('group-hover:opacity-100', 'group-focus-within:opacity-100');
        expect(screen.getByRole('tooltip').closest('.group')).toContainElement(
          screen.getByRole('button', { name: TRANSLATIONS.common.moreInfo }),
        );
      });
    });

    describe('WHEN the pointer leaves while focus stays on the trigger', () => {
      beforeEach(() => {
        fireEvent.mouseLeave(screen.getByRole('button', { name: TRANSLATIONS.common.moreInfo }));
      });

      test('THEN the help text keeps showing', () => {
        expect(screen.getByRole('tooltip')).toHaveClass('group-focus-within:opacity-100');
        expect(screen.getByRole('button', { name: TRANSLATIONS.common.moreInfo })).toHaveFocus();
      });
    });

    describe('WHEN Escape is pressed', () => {
      beforeEach(() => {
        fireEvent.keyDown(window, { key: 'Escape' });
      });

      test('THEN the help text hides while focus stays on the trigger', () => {
        expect(screen.getByRole('tooltip')).toHaveClass('opacity-0');
        expect(screen.getByRole('tooltip')).not.toHaveClass('group-hover:opacity-100');
        expect(screen.getByRole('tooltip')).not.toHaveClass('group-focus-within:opacity-100');
        expect(screen.getByRole('button', { name: TRANSLATIONS.common.moreInfo })).toHaveFocus();
      });
    });

    describe('WHEN Escape is pressed and the pointer then leaves', () => {
      beforeEach(() => {
        fireEvent.keyDown(window, { key: 'Escape' });
        fireEvent.mouseLeave(screen.getByRole('button', { name: TRANSLATIONS.common.moreInfo }));
      });

      test('THEN the help text stays hidden', () => {
        expect(screen.getByRole('tooltip')).not.toHaveClass('group-focus-within:opacity-100');
      });
    });

    describe('WHEN Escape is pressed and focus then returns to the trigger', () => {
      beforeEach(() => {
        fireEvent.keyDown(window, { key: 'Escape' });
        act(() => screen.getByRole('button', { name: TRANSLATIONS.common.moreInfo }).blur());
        act(() => screen.getByRole('button', { name: TRANSLATIONS.common.moreInfo }).focus());
      });

      test('THEN the help text shows again', () => {
        expect(screen.getByRole('tooltip')).toHaveClass('group-hover:opacity-100', 'group-focus-within:opacity-100');
      });
    });
  });

  describe('GIVEN a tooltip around a custom trigger with its own focus handler', () => {
    beforeEach(() => {
      render(
        <Tooltip text={HELP}>
          <button type="button" onFocus={onTriggerFocus}>
            Invite code
          </button>
        </Tooltip>,
      );
    });

    describe('WHEN it renders', () => {
      test('THEN the custom trigger is described by the help text and no extra button appears', () => {
        expect(screen.getByRole('button', { name: 'Invite code' })).toHaveAccessibleDescription(HELP);
        expect(screen.getAllByRole('button')).toHaveLength(1);
      });
    });

    describe('WHEN the trigger gains focus', () => {
      beforeEach(() => {
        act(() => screen.getByRole('button', { name: 'Invite code' }).focus());
      });

      test('THEN its own focus handler still runs', () => {
        expect(onTriggerFocus).toHaveBeenCalledOnce();
      });
    });

    describe('WHEN Escape is pressed and the pointer then enters the trigger', () => {
      beforeEach(() => {
        fireEvent.keyDown(window, { key: 'Escape' });
        fireEvent.mouseEnter(screen.getByRole('button', { name: 'Invite code' }));
      });

      test('THEN the help text shows again', () => {
        expect(screen.getByRole('tooltip')).toHaveClass('group-hover:opacity-100', 'group-focus-within:opacity-100');
      });
    });
  });

  describe('GIVEN a tooltip around a focused trigger component that does not forward props', () => {
    beforeEach(() => {
      render(
        <Tooltip text={HELP}>
          <NonForwardingTrigger />
        </Tooltip>,
      );
      act(() => screen.getByRole('button').focus());
    });

    describe('WHEN it renders', () => {
      test('THEN the help text shows while the trigger area is hovered or holds focus', () => {
        expect(screen.getByRole('tooltip')).toHaveClass('group-hover:opacity-100', 'group-focus-within:opacity-100');
        expect(screen.getByRole('tooltip').closest('.group')).toContainElement(screen.getByRole('button'));
      });
    });

    describe('WHEN Escape is pressed', () => {
      beforeEach(() => {
        fireEvent.keyDown(window, { key: 'Escape' });
      });

      test('THEN the help text hides', () => {
        expect(screen.getByRole('tooltip')).not.toHaveClass('group-focus-within:opacity-100');
      });
    });
  });
});
