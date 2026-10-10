import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { TRANSLATIONS } from '@mocks/i18n';
import { ExpandToggle } from '@/components/Canvas/fragments';

vi.mock('@/i18n', () => import('@mocks/i18n'));

const onToggle = vi.fn();
const onPageClick = vi.fn();
const onPagePress = vi.fn();

beforeEach(() => {
  document.body.addEventListener('click', onPageClick);
  document.body.addEventListener('mousedown', onPagePress);
});

afterEach(() => {
  document.body.removeEventListener('click', onPageClick);
  document.body.removeEventListener('mousedown', onPagePress);
});

describe('ExpandToggle', () => {
  describe('GIVEN a collapsed label', () => {
    beforeEach(() => {
      render(<ExpandToggle expanded={false} onToggle={onToggle} />);
    });

    describe('WHEN the toggle renders', () => {
      test('THEN it offers to show more and is left out of exports', () => {
        expect(screen.getByRole('button', { name: TRANSLATIONS.platform.canvas.node.showMore })).toHaveAttribute(
          'data-export-omit',
        );
      });
    });

    describe('WHEN the toggle is clicked', () => {
      beforeEach(() => {
        fireEvent.click(screen.getByRole('button', { name: TRANSLATIONS.platform.canvas.node.showMore }));
      });

      test('THEN the label toggles once without the click reaching the canvas', () => {
        expect(onToggle).toHaveBeenCalledOnce();
        expect(onPageClick).not.toHaveBeenCalled();
      });
    });

    describe('WHEN the pointer goes down on the toggle', () => {
      beforeEach(() => {
        fireEvent.mouseDown(screen.getByRole('button', { name: TRANSLATIONS.platform.canvas.node.showMore }));
      });

      test('THEN the press does not reach the canvas', () => {
        expect(onPagePress).not.toHaveBeenCalled();
      });
    });
  });

  describe('GIVEN an expanded label', () => {
    beforeEach(() => {
      render(<ExpandToggle expanded onToggle={onToggle} />);
    });

    describe('WHEN the toggle renders', () => {
      test('THEN it offers to show less with the chevron turned up', () => {
        expect(screen.getByRole('button', { name: TRANSLATIONS.platform.canvas.node.showLess })).toBeInTheDocument();
        expect(
          screen.getByRole('button', { name: TRANSLATIONS.platform.canvas.node.showLess }).querySelector('svg'),
        ).toHaveClass('rotate-180');
      });
    });
  });
});
