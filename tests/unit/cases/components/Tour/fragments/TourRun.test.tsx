import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import type { ITourSnapshot, TGuideId, TTourStepKey } from '@interfaces';

import { elementAt, stubAnimationFrame, stubResizeObserver } from '@mocks/browser';
import { TRANSLATIONS } from '@mocks/i18n';
import { NO_TOUR_ACCESS, snapshot } from '@mocks/onboarding';
import { TourRun } from '@/components/Tour';
import { findGuide, useOnboardingStore } from '@/lib/onboarding';

vi.mock('@/i18n', () => import('@mocks/i18n'));

const SWITCHER_RECT = { top: 20, left: 16, width: 240, height: 44 };

const stepIndexOf = (guideId: TGuideId, copyKey: TTourStepKey) =>
  findGuide(guideId)?.steps.findIndex((step) => step.copyKey === copyKey) ?? -1;

const runAt = (guideId: TGuideId, copyKey: TTourStepKey, state: ITourSnapshot) => {
  const guide = findGuide(guideId)!;
  const stepIndex = stepIndexOf(guideId, copyKey);
  useOnboardingStore.setState({ run: { guideId, stepIndex } });
  const { rerender } = render(<TourRun guide={guide} stepIndex={stepIndex} snapshot={state} />);

  return (next: ITourSnapshot) => rerender(<TourRun guide={guide} stepIndex={stepIndex} snapshot={next} />);
};

const spotlightRing = () => document.querySelector('[data-tour-scrim] rect');

let ring: Element | null;

beforeEach(() => {
  stubResizeObserver();
});

afterEach(() => useOnboardingStore.getState().forget());

describe('TourRun', () => {
  describe('GIVEN a step that waits for a workspace', () => {
    describe('WHEN the workspace appears while the step is open', () => {
      beforeEach(() => {
        const rerun = runAt('base', 'baseWorkspace', snapshot());
        rerun(snapshot({ workspaceCount: 1 }));
      });

      test('THEN the run moves on by itself', () => {
        expect(useOnboardingStore.getState().run?.stepIndex).toBe(stepIndexOf('base', 'baseWorkspace') + 1);
      });
    });

    describe('WHEN the workspace already exists on arrival', () => {
      beforeEach(() => {
        runAt('base', 'baseWorkspace', snapshot({ workspaceCount: 1 }));
      });

      test('THEN the step waits to be read and offers next', () => {
        expect(useOnboardingStore.getState().run?.stepIndex).toBe(stepIndexOf('base', 'baseWorkspace'));
        expect(screen.getByText(TRANSLATIONS.platform.onboarding.stepNext)).toBeInTheDocument();
      });
    });
  });

  describe('GIVEN a step that waits for an open thread', () => {
    describe('WHEN the thread that was open on arrival closes', () => {
      beforeEach(() => {
        const rerun = runAt('base', 'baseThread', snapshot({ workspaceCount: 1, threadId: 'thread-1' }));
        rerun(snapshot({ workspaceCount: 1 }));
      });

      test('THEN it waits for the action again instead of offering next', () => {
        expect(useOnboardingStore.getState().run?.stepIndex).toBe(stepIndexOf('base', 'baseThread'));
        expect(screen.queryByText(TRANSLATIONS.platform.onboarding.stepNext)).not.toBeInTheDocument();
        expect(screen.getByText(TRANSLATIONS.platform.onboarding.stepWaiting)).toBeInTheDocument();
      });
    });
  });

  describe('GIVEN a step the account has no right to perform', () => {
    describe('WHEN the run reaches it', () => {
      beforeEach(() => {
        runAt('canvas', 'commentsOpen', snapshot({ threadId: 'thread-1', permissions: NO_TOUR_ACCESS }));
      });

      test('THEN it is skipped', () => {
        expect(useOnboardingStore.getState().run?.stepIndex).toBe(stepIndexOf('canvas', 'commentsOpen') + 1);
      });
    });
  });

  describe('GIVEN a step whose target is on screen', () => {
    beforeEach(() => {
      const frames = stubAnimationFrame();
      document.body.append(elementAt({ 'data-tour': 'sidebarWorkspaceSwitcher' }, SWITCHER_RECT));
      runAt('base', 'baseWorkspace', snapshot());
      act(() => frames.flush());
      ring = spotlightRing();
    });

    afterEach(() => {
      document.querySelector('[data-tour="sidebarWorkspaceSwitcher"]')?.remove();
      vi.unstubAllGlobals();
    });

    describe('WHEN the dimmed area around it is pressed', () => {
      beforeEach(() => {
        fireEvent.pointerDown(document.querySelector('[data-tour-scrim]')!);
      });

      test('THEN the ring around the target pulses again', () => {
        expect(spotlightRing()).toBeInTheDocument();
        expect(spotlightRing()).not.toBe(ring);
      });
    });
  });

  describe('GIVEN a running step', () => {
    describe('WHEN the user leaves the tour', () => {
      beforeEach(() => {
        runAt('base', 'baseIntro', snapshot());
        act(() => screen.getByTitle(TRANSLATIONS.platform.onboarding.quit).click());
      });

      test('THEN the run is dropped and the offer counts as answered', () => {
        expect(useOnboardingStore.getState()).toMatchObject({ run: null, offerAnswered: true });
      });
    });
  });
});
