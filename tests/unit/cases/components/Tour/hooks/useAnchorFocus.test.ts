import { cleanup, renderHook, type RenderHookResult } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import type { TTourAnchor } from '@interfaces';
import { TOUR_FOCUS_ATTRIBUTE } from '@constants';
import { elementAt } from '@mocks/browser';
import { useAnchorFocus } from '@/components/Tour/hooks';

const toolbarButton = (anchor: TTourAnchor, size: number): HTMLElement =>
  elementAt({ 'data-tour': anchor }, { width: size, height: size }, 'button');

let view: RenderHookResult<void, { anchor: TTourAnchor | null }>;

afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('useAnchorFocus', () => {
  describe('GIVEN the help and export buttons are on screen', () => {
    beforeEach(() => {
      document.body.append(toolbarButton('toolbarHelp', 36), toolbarButton('toolbarExport', 36));
    });

    describe('WHEN a step focuses the help button', () => {
      beforeEach(() => {
        renderHook(() => useAnchorFocus('toolbarHelp'));
      });

      test('THEN only the help button is marked as the focused anchor', () => {
        expect(document.querySelector('[data-tour="toolbarHelp"]')).toHaveAttribute(TOUR_FOCUS_ATTRIBUTE);
        expect(document.querySelector('[data-tour="toolbarExport"]')).not.toHaveAttribute(TOUR_FOCUS_ATTRIBUTE);
      });
    });

    describe('WHEN a step without an anchor renders', () => {
      beforeEach(() => {
        renderHook(() => useAnchorFocus(null));
      });

      test('THEN no button is marked', () => {
        expect(document.querySelector(`[${TOUR_FOCUS_ATTRIBUTE}]`)).toBeNull();
      });
    });
  });

  describe('GIVEN a step that focused the help button', () => {
    beforeEach(() => {
      document.body.append(toolbarButton('toolbarHelp', 36), toolbarButton('toolbarExport', 36));
      view = renderHook(({ anchor }: { anchor: TTourAnchor | null }) => useAnchorFocus(anchor), {
        initialProps: { anchor: 'toolbarHelp' as TTourAnchor | null },
      });
    });

    describe('WHEN the next step focuses the export button', () => {
      beforeEach(() => {
        view.rerender({ anchor: 'toolbarExport' });
      });

      test('THEN the mark moves from the help button to the export button', () => {
        expect(document.querySelector('[data-tour="toolbarHelp"]')).not.toHaveAttribute(TOUR_FOCUS_ATTRIBUTE);
        expect(document.querySelector('[data-tour="toolbarExport"]')).toHaveAttribute(TOUR_FOCUS_ATTRIBUTE);
      });
    });

    describe('WHEN the tour closes', () => {
      beforeEach(() => {
        view.unmount();
      });

      test('THEN no button keeps the mark', () => {
        expect(document.querySelector(`[${TOUR_FOCUS_ATTRIBUTE}]`)).toBeNull();
      });
    });
  });

  describe('GIVEN the help button is collapsed to nothing', () => {
    beforeEach(() => {
      document.body.append(toolbarButton('toolbarHelp', 0));
    });

    describe('WHEN a step focuses it', () => {
      beforeEach(() => {
        renderHook(() => useAnchorFocus('toolbarHelp'));
      });

      test('THEN it is not marked', () => {
        expect(document.querySelector('[data-tour="toolbarHelp"]')).not.toHaveAttribute(TOUR_FOCUS_ATTRIBUTE);
      });
    });
  });
});
