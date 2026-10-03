import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import type { TTourStepKey } from '@interfaces';
import { EXAMPLE_CANVAS_TIMEOUT_MS, EXAMPLE_STEP_DELAY_MS } from '@constants';
import { setElementLayout, stubResizeObserver } from '@mocks/browser';
import { THREAD_ID, questionNode } from '@mocks/canvas';
import { event } from '@mocks/events';
import { TRANSLATIONS } from '@mocks/i18n';
import { snapshot } from '@mocks/onboarding';
import { FULL_ACCESS } from '@mocks/roles';
import { ECanvasTool } from '@/components/tools';
import { ExampleRun } from '@/components/Tour';
import { EXAMPLE_GUIDE_ID, findGuide, useOnboardingStore } from '@/lib/onboarding';
import { useCanvasStore, usePermissionsStore } from '@/lib/stores';

vi.mock('@/i18n', () => import('@mocks/i18n'));
vi.mock('@/lib/events', () => import('@mocks/events'));

const guide = findGuide(EXAMPLE_GUIDE_ID)!;
const lastIndex = guide.steps.length - 1;
const onCreateExample = vi.fn<(name: string) => Promise<string | null>>();
const onDeleteExample = vi.fn<(id: string) => Promise<void>>();

const indexOf = (copyKey: TTourStepKey) => guide.steps.findIndex((step) => step.copyKey === copyKey);

let observer: ReturnType<typeof stubResizeObserver>;

const reveal = () => {
  setElementLayout(document.querySelector<HTMLElement>('[data-tour-card]')!, { offsetWidth: 400, offsetHeight: 220 });
  act(() => observer.resize());
};

const renderAt = (copyKey: TTourStepKey) => {
  const stepIndex = indexOf(copyKey);
  useOnboardingStore.setState({ run: { guideId: EXAMPLE_GUIDE_ID, stepIndex } });
  const { rerender } = render(
    <ExampleRun
      guide={guide}
      stepIndex={stepIndex}
      snapshot={snapshot()}
      onCreateExample={onCreateExample}
      onDeleteExample={onDeleteExample}
    />,
  );
  reveal();

  return (nextIndex: number) => {
    useOnboardingStore.setState({ run: { guideId: EXAMPLE_GUIDE_ID, stepIndex: nextIndex } });
    rerender(
      <ExampleRun
        guide={guide}
        stepIndex={nextIndex}
        snapshot={snapshot()}
        onCreateExample={onCreateExample}
        onDeleteExample={onDeleteExample}
      />,
    );
    reveal();
  };
};

const settle = () => act(() => vi.advanceTimersByTimeAsync(0));

const playOut = () => act(() => vi.advanceTimersByTimeAsync(EXAMPLE_STEP_DELAY_MS * 12));

const openExampleCanvas = () =>
  act(() => useCanvasStore.getState().loadCanvas(THREAD_ID, { nodes: [questionNode('q')], edges: [] }));

const button = (name: string) => screen.queryByRole('button', { name });

let goTo: (nextIndex: number) => void;

beforeEach(() => {
  vi.useFakeTimers();
  observer = stubResizeObserver();
  usePermissionsStore.getState().setAccess('ws-1', 'user-1', FULL_ACCESS);
  onCreateExample.mockResolvedValue(THREAD_ID);
  onDeleteExample.mockResolvedValue();
});

afterEach(() => {
  useOnboardingStore.getState().forget();
  useCanvasStore.getState().clearCanvas();
  usePermissionsStore.getState().clearAccess();
  vi.useRealTimers();
});

describe('ExampleRun', () => {
  describe('GIVEN the scene that creates the example thread', () => {
    describe('WHEN it starts and the canvas is still on its way', () => {
      beforeEach(async () => {
        renderAt('exampleThread');
        await settle();
      });

      test('THEN the thread is created under the example name and next waits for it', () => {
        expect(onCreateExample).toHaveBeenCalledExactlyOnceWith(TRANSLATIONS.platform.onboarding.example.threadName);
        expect(button(TRANSLATIONS.platform.onboarding.stepNext)).toBeDisabled();
      });
    });

    describe('WHEN the canvas of the new thread opens', () => {
      beforeEach(async () => {
        renderAt('exampleThread');
        await settle();
        openExampleCanvas();
        await playOut();
      });

      test('THEN the opener writes the question and next is offered', () => {
        expect(useCanvasStore.getState().nodes.at(0)?.data.label).toBe(
          TRANSLATIONS.platform.onboarding.example.question,
        );
        expect(button(TRANSLATIONS.platform.onboarding.stepNext)).toBeEnabled();
      });
    });

    describe('WHEN the thread cannot be created', () => {
      beforeEach(async () => {
        onCreateExample.mockResolvedValue(null);
        renderAt('exampleThread');
        await settle();
      });

      test('THEN the tour steps out', () => {
        expect(useOnboardingStore.getState().run).toBeNull();
      });
    });

    describe('WHEN the canvas never opens', () => {
      beforeEach(async () => {
        renderAt('exampleThread');
        await act(() => vi.advanceTimersByTimeAsync(EXAMPLE_CANVAS_TIMEOUT_MS));
      });

      test('THEN the failure is reported and the tour steps out', () => {
        expect(event.error).toHaveBeenCalledExactlyOnceWith(expect.any(Error), {
          title: TRANSLATIONS.common.errorTitles.loadFailed,
          context: 'onboarding.example',
        });
        expect(useOnboardingStore.getState().run).toBeNull();
      });
    });
  });

  describe('GIVEN the example canvas is open', () => {
    beforeEach(async () => {
      goTo = renderAt('exampleThread');
      await settle();
      openExampleCanvas();
      await playOut();
    });

    describe('WHEN the other user takes their turn', () => {
      beforeEach(async () => {
        goTo(indexOf('exampleCapsule'));
        await playOut();
      });

      test('THEN their answer and the reason under it are placed, written and linked by themselves', () => {
        const { nodes, edges } = useCanvasStore.getState();

        expect(nodes.map((node) => node.data.label)).toEqual(
          expect.arrayContaining([
            TRANSLATIONS.platform.onboarding.example.nodes.capsule,
            TRANSLATIONS.platform.onboarding.example.nodes.oneButton,
          ]),
        );
        expect(edges).toHaveLength(2);
      });
    });

    describe('WHEN another thread is opened in the middle of a turn', () => {
      beforeEach(async () => {
        goTo(indexOf('exampleCapsule'));
        await settle();
        act(() =>
          useCanvasStore.getState().loadCanvas('other-thread', { nodes: [questionNode('other-q')], edges: [] }),
        );
        await playOut();
      });

      test('THEN the tour steps out and nothing is written into the other thread', () => {
        const { threadId, nodes, edges } = useCanvasStore.getState();

        expect(useOnboardingStore.getState().run).toBeNull();
        expect({ threadId, nodeIds: nodes.map((node) => node.id), edges }).toEqual({
          threadId: 'other-thread',
          nodeIds: ['other-q'],
          edges: [],
        });
      });
    });

    describe('WHEN the example closes with a tool still picked and comments open', () => {
      beforeEach(() => {
        act(() => {
          useCanvasStore.getState().setActiveTool(ECanvasTool.AddNode);
          useCanvasStore.getState().setOpenCommentsNodeId('q');
        });
        cleanup();
      });

      test('THEN the tool is handed back and the comments panel is closed', () => {
        expect(useCanvasStore.getState()).toMatchObject({ activeTool: ECanvasTool.Select, openCommentsNodeId: null });
      });
    });

    describe('WHEN the last scene asks what to do with the example', () => {
      beforeEach(() => {
        goTo(lastIndex);
      });

      test('THEN it offers to keep or delete it instead of next', () => {
        expect(button(TRANSLATIONS.platform.onboarding.example.keep)).toBeInTheDocument();
        expect(button(TRANSLATIONS.platform.onboarding.example.remove)).toBeInTheDocument();
        expect(button(TRANSLATIONS.platform.onboarding.stepNext)).not.toBeInTheDocument();
      });
    });

    describe('WHEN the user keeps the example', () => {
      beforeEach(() => {
        goTo(lastIndex);
        fireEvent.click(button(TRANSLATIONS.platform.onboarding.example.keep)!);
      });

      test('THEN the guide finishes and the thread stays', () => {
        expect(useOnboardingStore.getState().completedGuides).toContain(EXAMPLE_GUIDE_ID);
        expect(onDeleteExample).not.toHaveBeenCalled();
      });
    });

    describe('WHEN the user deletes the example and its canvas closes on the way', () => {
      beforeEach(async () => {
        onDeleteExample.mockImplementation(async () => useCanvasStore.getState().clearCanvas());
        goTo(lastIndex);
        fireEvent.click(button(TRANSLATIONS.platform.onboarding.example.remove)!);
        await settle();
      });

      test('THEN the example thread is deleted and the guide finishes', () => {
        expect(onDeleteExample).toHaveBeenCalledExactlyOnceWith(THREAD_ID);
        expect(useOnboardingStore.getState().completedGuides).toContain(EXAMPLE_GUIDE_ID);
      });
    });
  });

  describe('GIVEN the app renders in strict mode', () => {
    describe('WHEN the thread scene mounts and its effects run twice', () => {
      beforeEach(async () => {
        const stepIndex = indexOf('exampleThread');
        useOnboardingStore.setState({ run: { guideId: EXAMPLE_GUIDE_ID, stepIndex } });
        render(
          <StrictMode>
            <ExampleRun
              guide={guide}
              stepIndex={stepIndex}
              snapshot={snapshot()}
              onCreateExample={onCreateExample}
              onDeleteExample={onDeleteExample}
            />
          </StrictMode>,
        );
        await settle();
      });

      test('THEN the example thread is still created only once', () => {
        expect(onCreateExample).toHaveBeenCalledOnce();
      });
    });
  });

  describe('GIVEN a running example', () => {
    describe('WHEN the user leaves it', () => {
      beforeEach(() => {
        renderAt('exampleIntro');
        fireEvent.click(screen.getByTitle(TRANSLATIONS.platform.onboarding.quit));
      });

      test('THEN the run is dropped', () => {
        expect(useOnboardingStore.getState().run).toBeNull();
      });
    });
  });
});
