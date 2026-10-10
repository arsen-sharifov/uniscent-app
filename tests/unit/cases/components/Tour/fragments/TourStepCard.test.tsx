import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { ITourStep } from '@interfaces';

import { setElementLayout, stubResizeObserver } from '@mocks/browser';
import { TRANSLATIONS } from '@mocks/i18n';
import { TourStepCard } from '@/components/Tour';

vi.mock('@/i18n', () => import('@mocks/i18n'));

const onQuit = vi.fn();
const onNext = vi.fn();

const ACTION_STEP: ITourStep = { copyKey: 'baseThread', placement: 'right', pose: 'point', isDone: () => false };

const READ_STEP: ITourStep = { copyKey: 'baseIntro', placement: 'center', pose: 'think' };

const ERGO_STEP: ITourStep = { copyKey: 'exampleCapsule', placement: 'bottom', pose: 'point', speaker: 'ergo' };

const RECT = { top: 120, left: 40, width: 180, height: 32 };

let observer: ReturnType<typeof stubResizeObserver>;

const renderCard = (overrides: Partial<Parameters<typeof TourStepCard>[0]> = {}) => {
  const { container } = render(
    <TourStepCard
      step={ACTION_STEP}
      rect={RECT}
      lost={false}
      settling={false}
      blocked={false}
      done={false}
      index={2}
      total={16}
      onQuit={onQuit}
      {...overrides}
    />,
  );

  setElementLayout(container.querySelector<HTMLElement>('[data-tour-card]')!, { offsetWidth: 400, offsetHeight: 220 });
  act(() => observer.resize());
};

const card = (title: string) => screen.getByRole('dialog', { name: title });

const button = (name: string) => screen.queryByRole('button', { name });

beforeEach(() => {
  observer = stubResizeObserver();
});

describe('TourStepCard', () => {
  describe('GIVEN a step that waits for an action', () => {
    describe('WHEN it is shown', () => {
      beforeEach(() => {
        renderCard();
      });

      test('THEN it names the step, counts it, and waits without a next button', () => {
        expect(card(TRANSLATIONS.platform.onboarding.steps.baseThread.title)).toHaveTextContent(
          TRANSLATIONS.platform.onboarding.steps.baseThread.body,
        );
        expect(card(TRANSLATIONS.platform.onboarding.steps.baseThread.title)).toHaveTextContent('step 3 of 16');
        expect(card(TRANSLATIONS.platform.onboarding.steps.baseThread.title)).toHaveTextContent(
          TRANSLATIONS.platform.onboarding.stepWaiting,
        );
        expect(button(TRANSLATIONS.platform.onboarding.stepNext)).not.toBeInTheDocument();
      });
    });

    describe('WHEN the step was already satisfied on arrival', () => {
      beforeEach(() => {
        renderCard({ done: true, onNext });
        fireEvent.click(button(TRANSLATIONS.platform.onboarding.stepNext)!);
      });

      test('THEN it says so and lets the user move on', () => {
        expect(card(TRANSLATIONS.platform.onboarding.steps.baseThread.title)).toHaveTextContent(
          TRANSLATIONS.platform.onboarding.stepDone,
        );
        expect(onNext).toHaveBeenCalledTimes(1);
      });
    });

    describe('WHEN its target is gone', () => {
      beforeEach(() => {
        renderCard({ lost: true, rect: null });
      });

      test('THEN it warns that the target is missing', () => {
        expect(card(TRANSLATIONS.platform.onboarding.steps.baseThread.title)).toHaveTextContent(
          TRANSLATIONS.platform.onboarding.stepLostTarget,
        );
      });
    });

    describe('WHEN something else covers the target', () => {
      beforeEach(() => {
        renderCard({ blocked: true, onNext });
      });

      test('THEN it asks to close the cover instead and offers no next button', () => {
        expect(card(TRANSLATIONS.platform.onboarding.blockedTitle)).toHaveTextContent(
          TRANSLATIONS.platform.onboarding.blockedBody,
        );
        expect(card(TRANSLATIONS.platform.onboarding.blockedTitle)).toHaveTextContent(
          TRANSLATIONS.platform.onboarding.blockedStatus,
        );
        expect(button(TRANSLATIONS.platform.onboarding.stepNext)).not.toBeInTheDocument();
      });
    });

    describe('WHEN the user leaves the tour from it', () => {
      beforeEach(() => {
        renderCard();
        fireEvent.click(button(TRANSLATIONS.platform.onboarding.quit)!);
      });

      test('THEN the quit handler runs', () => {
        expect(onQuit).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('GIVEN a step that only explains', () => {
    describe('WHEN it is shown', () => {
      beforeEach(() => {
        renderCard({ step: READ_STEP, rect: null, index: 0, onNext });
      });

      test('THEN it carries no status and moves on with next', () => {
        expect(card(TRANSLATIONS.platform.onboarding.steps.baseIntro.title)).not.toHaveTextContent(
          TRANSLATIONS.platform.onboarding.stepWaiting,
        );
        expect(button(TRANSLATIONS.platform.onboarding.stepNext)).toBeInTheDocument();
      });
    });
  });

  describe('GIVEN a scene of the example spoken by the friend', () => {
    describe('WHEN it is shown', () => {
      beforeEach(() => {
        renderCard({ step: ERGO_STEP, rect: null, onNext });
      });

      test('THEN the friend stands in for Nodi and is named before the step counter', () => {
        expect(screen.getByRole('img', { name: TRANSLATIONS.platform.onboarding.ergoAlt })).toBeInTheDocument();
        expect(screen.queryByRole('img', { name: TRANSLATIONS.platform.onboarding.nodiAlt })).not.toBeInTheDocument();
        expect(card(TRANSLATIONS.platform.onboarding.steps.exampleCapsule.title)).toHaveTextContent(
          `${TRANSLATIONS.platform.onboarding.ergoName}/step 3 of 16`,
        );
      });
    });

    describe('WHEN its scene is still playing', () => {
      beforeEach(() => {
        renderCard({ step: ERGO_STEP, rect: null, busy: true, onNext });
      });

      test('THEN next waits for the scene to finish', () => {
        expect(button(TRANSLATIONS.platform.onboarding.stepNext)).toBeDisabled();
      });
    });

    describe('WHEN it brings its own choices', () => {
      beforeEach(() => {
        renderCard({ step: ERGO_STEP, rect: null, onNext, actions: <button type="button">choose</button> });
      });

      test('THEN the choices replace the next button', () => {
        expect(button('choose')).toBeInTheDocument();
        expect(button(TRANSLATIONS.platform.onboarding.stepNext)).not.toBeInTheDocument();
      });
    });
  });
});
