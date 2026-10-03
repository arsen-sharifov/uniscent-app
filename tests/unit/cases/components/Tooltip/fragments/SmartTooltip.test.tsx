import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { domRect, stubAnimationFrame } from '@mocks/browser';
import { SmartTooltip } from '@/components/Tooltip';

const DELAY_MS = 350;

let frames: ReturnType<typeof stubAnimationFrame>;
let trigger: HTMLElement;

beforeEach(() => {
  vi.useFakeTimers();
  frames = stubAnimationFrame();
  render(<SmartTooltip content="Rename thread">Thread</SmartTooltip>);
  trigger = screen.getByText('Thread');
  vi.spyOn(trigger, 'getBoundingClientRect').mockReturnValue(
    domRect({ top: 300, bottom: 320, left: 400, right: 500, width: 100, height: 20 }),
  );
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('SmartTooltip', () => {
  describe('GIVEN a trigger under the pointer', () => {
    beforeEach(() => {
      fireEvent.mouseEnter(trigger);
    });

    describe('WHEN the delay elapses and the tooltip is measured', () => {
      beforeEach(() => {
        act(() => vi.advanceTimersByTime(DELAY_MS));
        act(() => frames.flush());
      });

      test('THEN it shows next to the trigger', () => {
        expect(screen.getByRole('tooltip')).toHaveTextContent('Rename thread');
        expect(screen.getByRole('tooltip')).toHaveStyle({ opacity: '1' });
      });
    });
  });

  describe('GIVEN a shown tooltip', () => {
    beforeEach(() => {
      fireEvent.mouseEnter(trigger);
      act(() => vi.advanceTimersByTime(DELAY_MS));
      act(() => frames.flush());
    });

    describe('WHEN Escape is pressed', () => {
      beforeEach(() => {
        fireEvent.keyDown(window, { key: 'Escape' });
      });

      test('THEN it hides while the pointer stays on the trigger', () => {
        expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
      });
    });
  });

  describe('GIVEN a tooltip that was shown once and then left', () => {
    beforeEach(() => {
      fireEvent.mouseEnter(trigger);
      act(() => vi.advanceTimersByTime(DELAY_MS));
      act(() => frames.flush());
      fireEvent.mouseLeave(trigger);
      vi.mocked(trigger.getBoundingClientRect).mockReturnValue(
        domRect({ top: 600, bottom: 620, left: 100, right: 200, width: 100, height: 20 }),
      );
    });

    describe('WHEN it opens again after the trigger moved', () => {
      beforeEach(() => {
        fireEvent.mouseEnter(trigger);
        act(() => vi.advanceTimersByTime(DELAY_MS));
      });

      test('THEN it stays hidden until it has measured the new spot', () => {
        expect(screen.getByRole('tooltip')).toHaveStyle({ opacity: '0' });
      });
    });
  });
});
