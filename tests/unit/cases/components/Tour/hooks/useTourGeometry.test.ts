import { act, cleanup, renderHook, type RenderHookResult } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import type { IAnchorRect, ITrackedGeometry } from '@interfaces';
import { LOST_TARGET_MS } from '@constants';
import { domRect, elementAt, stubAnimationFrame, stubPerformanceNow } from '@mocks/browser';
import { useTourGeometry } from '@/components/Tour/hooks';
import { joinAnchors } from '@/lib/onboarding';

const FRAME_MS = 16;

const HELP_RECT: IAnchorRect = { top: 820, left: 1380, width: 36, height: 36 };

const MOVED_RECT: IAnchorRect = { top: 760, left: 1380, width: 36, height: 36 };

const COVER_RECT: IAnchorRect = { top: 40, left: 150, width: 1240, height: 820 };

const CREATE_RECT: IAnchorRect = { top: 130, left: 180, width: 90, height: 24 };

const SWITCHER_RECT: IAnchorRect = { top: 60, left: 10, width: 250, height: 50 };

const WORKSPACE_ANCHORS = joinAnchors(['sidebarWorkspaceCreate', 'sidebarWorkspaceSwitcher']);

let frames: ReturnType<typeof stubAnimationFrame>;
let clock: ReturnType<typeof stubPerformanceNow>;
let view: RenderHookResult<ITrackedGeometry, { anchorKey: string }>;

beforeEach(() => {
  frames = stubAnimationFrame();
  clock = stubPerformanceNow();
  Object.defineProperty(document, 'elementsFromPoint', {
    configurable: true,
    value: () => [...document.querySelectorAll('[role="dialog"]')],
  });
});

afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
  Reflect.deleteProperty(document, 'elementsFromPoint');
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('useTourGeometry', () => {
  describe('GIVEN a step whose target is on screen', () => {
    beforeEach(() => {
      document.body.append(elementAt({ 'data-tour': 'toolbarHelp' }, HELP_RECT));
      view = renderHook(({ anchorKey }: { anchorKey: string }) => useTourGeometry(anchorKey, ''), {
        initialProps: { anchorKey: 'toolbarHelp' },
      });
    });

    describe('WHEN the first frame reads the screen', () => {
      beforeEach(() => {
        clock.advance(FRAME_MS);
        act(() => frames.flush());
      });

      test('THEN the target is spotlighted and stays reachable', () => {
        expect(view.result.current).toMatchObject({
          anchor: 'toolbarHelp',
          rect: HELP_RECT,
          blocked: null,
          lit: [HELP_RECT],
          open: [HELP_RECT],
          lastRect: HELP_RECT,
          lost: false,
        });
      });
    });
  });

  describe('GIVEN a target that the first frame has already spotlighted', () => {
    let target: HTMLElement;

    beforeEach(() => {
      target = elementAt({ 'data-tour': 'toolbarHelp' }, HELP_RECT);
      document.body.append(target);
      view = renderHook(({ anchorKey }: { anchorKey: string }) => useTourGeometry(anchorKey, ''), {
        initialProps: { anchorKey: 'toolbarHelp' },
      });
      clock.advance(FRAME_MS);
      act(() => frames.flush());
    });

    describe('WHEN the target moves and the next frame runs', () => {
      beforeEach(() => {
        vi.mocked(target.getBoundingClientRect).mockReturnValue(domRect(MOVED_RECT));
        clock.advance(FRAME_MS);
        act(() => frames.flush());
      });

      test('THEN the spotlight follows it on that frame', () => {
        expect(view.result.current).toMatchObject({
          rect: MOVED_RECT,
          lit: [MOVED_RECT],
          open: [MOVED_RECT],
          lastRect: MOVED_RECT,
        });
      });
    });

    describe('WHEN a dialog covers it for less than the lost-target delay', () => {
      beforeEach(() => {
        document.body.append(elementAt({ role: 'dialog' }, COVER_RECT));
        clock.advance(FRAME_MS);
        act(() => frames.flush());
        clock.advance(LOST_TARGET_MS - 1);
        act(() => frames.flush());
      });

      test('THEN the target stays spotlighted as before', () => {
        expect(view.result.current).toMatchObject({
          rect: HELP_RECT,
          blocked: null,
          lit: [HELP_RECT],
          open: [HELP_RECT],
        });
      });
    });

    describe('WHEN the dialog stays over it for the whole delay', () => {
      beforeEach(() => {
        document.body.append(elementAt({ role: 'dialog' }, COVER_RECT));
        clock.advance(FRAME_MS);
        act(() => frames.flush());
        clock.advance(LOST_TARGET_MS);
        act(() => frames.flush());
      });

      test('THEN the dialog takes over the spotlight and is the only way through', () => {
        expect(view.result.current).toMatchObject({
          rect: HELP_RECT,
          blocked: COVER_RECT,
          lit: [COVER_RECT],
          open: [COVER_RECT],
        });
      });
    });

    describe('WHEN the target leaves the screen for less than the lost-target delay', () => {
      beforeEach(() => {
        target.remove();
        clock.advance(FRAME_MS);
        act(() => frames.flush());
        clock.advance(LOST_TARGET_MS - 1);
        act(() => frames.flush());
      });

      test('THEN the spotlight holds on its last box and nothing is reported lost yet', () => {
        expect(view.result.current).toMatchObject({ rect: HELP_RECT, lost: false });
      });
    });

    describe('WHEN the target stays away for exactly the lost-target delay', () => {
      beforeEach(() => {
        target.remove();
        clock.advance(FRAME_MS);
        act(() => frames.flush());
        clock.advance(LOST_TARGET_MS);
        act(() => frames.flush());
      });

      test('THEN it is reported lost after one delay, not two', () => {
        expect(view.result.current).toMatchObject({ rect: null, anchor: null, lost: true, lastRect: HELP_RECT });
      });
    });

    describe('WHEN the target leaves the screen and stays away', () => {
      beforeEach(() => {
        target.remove();
        clock.advance(FRAME_MS);
        act(() => frames.flush());
        clock.advance(LOST_TARGET_MS);
        act(() => frames.flush());
        clock.advance(LOST_TARGET_MS);
        act(() => frames.flush());
      });

      test('THEN it is reported lost and its last box stays available for the card', () => {
        expect(view.result.current).toMatchObject({ rect: null, anchor: null, lost: true, lastRect: HELP_RECT });
      });
    });

    describe('WHEN the step changes to another anchor before the next frame reads it', () => {
      beforeEach(() => {
        view.rerender({ anchorKey: 'toolbarExport' });
      });

      test('THEN the reading of the previous step is dropped and only its last box is kept', () => {
        expect(view.result.current).toEqual({
          rect: null,
          anchor: null,
          blocked: null,
          lit: [],
          open: [],
          lastRect: HELP_RECT,
          lost: false,
        });
      });
    });

    describe('WHEN the tour closes', () => {
      beforeEach(() => {
        view.unmount();
      });

      test('THEN no further frame is requested', () => {
        expect(frames.pending()).toBe(0);
      });
    });
  });

  describe('GIVEN a step whose target a dialog covers from the start', () => {
    beforeEach(() => {
      document.body.append(
        elementAt({ 'data-tour': 'toolbarHelp' }, HELP_RECT),
        elementAt({ role: 'dialog' }, COVER_RECT),
      );
      view = renderHook(({ anchorKey }: { anchorKey: string }) => useTourGeometry(anchorKey, ''), {
        initialProps: { anchorKey: 'toolbarHelp' },
      });
    });

    describe('WHEN the first frame reads the screen', () => {
      beforeEach(() => {
        clock.advance(FRAME_MS);
        act(() => frames.flush());
      });

      test('THEN the dialog is reported at once instead of after the lost-target delay', () => {
        expect(view.result.current).toMatchObject({ rect: HELP_RECT, blocked: COVER_RECT });
      });
    });
  });

  describe('GIVEN a target that a dialog already covers', () => {
    beforeEach(() => {
      document.body.append(
        elementAt({ 'data-tour': 'toolbarHelp' }, HELP_RECT),
        elementAt({ role: 'dialog' }, COVER_RECT),
      );
      view = renderHook(({ anchorKey }: { anchorKey: string }) => useTourGeometry(anchorKey, ''), {
        initialProps: { anchorKey: 'toolbarHelp' },
      });
      clock.advance(FRAME_MS);
      act(() => frames.flush());
      clock.advance(LOST_TARGET_MS);
      act(() => frames.flush());
    });

    describe('WHEN the dialog closes', () => {
      beforeEach(() => {
        document.querySelector('[role="dialog"]')?.remove();
        clock.advance(FRAME_MS);
        act(() => frames.flush());
      });

      test('THEN the target is spotlighted again on the next frame', () => {
        expect(view.result.current).toMatchObject({
          rect: HELP_RECT,
          blocked: null,
          lit: [HELP_RECT],
          open: [HELP_RECT],
        });
      });
    });
  });

  describe('GIVEN a step whose specific anchor is spotlighted ahead of its broader fallback', () => {
    beforeEach(() => {
      document.body.append(
        elementAt({ 'data-tour': 'sidebarWorkspaceCreate' }, CREATE_RECT),
        elementAt({ 'data-tour': 'sidebarWorkspaceSwitcher' }, SWITCHER_RECT),
      );
      view = renderHook(({ anchorKey }: { anchorKey: string }) => useTourGeometry(anchorKey, ''), {
        initialProps: { anchorKey: WORKSPACE_ANCHORS },
      });
      clock.advance(FRAME_MS);
      act(() => frames.flush());
    });

    describe('WHEN the specific anchor leaves for less than the lost-target delay', () => {
      beforeEach(() => {
        document.querySelector('[data-tour="sidebarWorkspaceCreate"]')?.remove();
        clock.advance(FRAME_MS);
        act(() => frames.flush());
        clock.advance(LOST_TARGET_MS - 1);
        act(() => frames.flush());
      });

      test('THEN the spotlight holds on the specific anchor', () => {
        expect(view.result.current).toMatchObject({ anchor: 'sidebarWorkspaceCreate', rect: CREATE_RECT });
      });
    });

    describe('WHEN the specific anchor stays away for the whole delay', () => {
      beforeEach(() => {
        document.querySelector('[data-tour="sidebarWorkspaceCreate"]')?.remove();
        clock.advance(FRAME_MS);
        act(() => frames.flush());
        clock.advance(LOST_TARGET_MS);
        act(() => frames.flush());
      });

      test('THEN the broader fallback takes over the spotlight', () => {
        expect(view.result.current).toMatchObject({
          anchor: 'sidebarWorkspaceSwitcher',
          rect: SWITCHER_RECT,
          lost: false,
        });
      });
    });
  });

  describe('GIVEN a step whose broader fallback is spotlighted while its specific anchor is missing', () => {
    beforeEach(() => {
      document.body.append(elementAt({ 'data-tour': 'sidebarWorkspaceSwitcher' }, SWITCHER_RECT));
      view = renderHook(({ anchorKey }: { anchorKey: string }) => useTourGeometry(anchorKey, ''), {
        initialProps: { anchorKey: WORKSPACE_ANCHORS },
      });
      clock.advance(FRAME_MS);
      act(() => frames.flush());
    });

    describe('WHEN the specific anchor appears', () => {
      beforeEach(() => {
        document.body.append(elementAt({ 'data-tour': 'sidebarWorkspaceCreate' }, CREATE_RECT));
        clock.advance(FRAME_MS);
        act(() => frames.flush());
      });

      test('THEN the spotlight moves to it on the next frame', () => {
        expect(view.result.current).toMatchObject({ anchor: 'sidebarWorkspaceCreate', rect: CREATE_RECT });
      });
    });
  });

  describe('GIVEN a step whose target is not on screen', () => {
    beforeEach(() => {
      view = renderHook(({ anchorKey }: { anchorKey: string }) => useTourGeometry(anchorKey, ''), {
        initialProps: { anchorKey: 'toolbarHelp' },
      });
    });

    describe('WHEN frames find nothing for less than the lost-target delay', () => {
      beforeEach(() => {
        clock.advance(FRAME_MS);
        act(() => frames.flush());
        clock.advance(LOST_TARGET_MS - 1);
        act(() => frames.flush());
      });

      test('THEN the target is not reported lost yet', () => {
        expect(view.result.current).toMatchObject({ rect: null, lost: false });
      });
    });

    describe('WHEN frames find nothing for the whole delay', () => {
      beforeEach(() => {
        clock.advance(FRAME_MS);
        act(() => frames.flush());
        clock.advance(LOST_TARGET_MS);
        act(() => frames.flush());
      });

      test('THEN the target is reported lost', () => {
        expect(view.result.current).toMatchObject({ rect: null, lastRect: null, lost: true });
      });
    });
  });

  describe('GIVEN a step without an anchor', () => {
    beforeEach(() => {
      view = renderHook(({ anchorKey }: { anchorKey: string }) => useTourGeometry(anchorKey, ''), {
        initialProps: { anchorKey: '' },
      });
    });

    describe('WHEN frames run past the lost-target delay', () => {
      beforeEach(() => {
        clock.advance(FRAME_MS);
        act(() => frames.flush());
        clock.advance(LOST_TARGET_MS);
        act(() => frames.flush());
      });

      test('THEN nothing is spotlighted and nothing is reported lost', () => {
        expect(view.result.current).toMatchObject({ rect: null, anchor: null, lit: [], open: [], lost: false });
      });
    });
  });
});
