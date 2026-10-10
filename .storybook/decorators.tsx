import type { Decorator } from '@storybook/nextjs-vite';
import { ReactFlowProvider, useReactFlow } from '@xyflow/react';
import { useEffect } from 'react';

import type { IMockCanvasState, IMockOnboardingState, IMockPermissionsState } from '@story-interfaces';

import { CANVAS_FIT_VIEW_OPTIONS } from './consts';
import {
  mockCanvasStore,
  mockOnboardingStore,
  mockPermissionsStore,
  resetCanvasStore,
  resetOnboardingStore,
} from './utils';

export const WithPad: Decorator = (Story) => (
  <div className="flex min-h-screen w-full items-center justify-center p-12">
    <Story />
  </div>
);

export const WithCanvasStage: Decorator = (Story) => (
  <div className="relative h-screen w-screen overflow-hidden">
    <Story />
  </div>
);

export const WithReactFlow: Decorator = (Story) => (
  <ReactFlowProvider>
    <Story />
  </ReactFlowProvider>
);

export const WithFittedCanvas: Decorator = (Story) => {
  const { fitView } = useReactFlow();

  useEffect(() => {
    document.fonts.ready.then(() => fitView(CANVAS_FIT_VIEW_OPTIONS));
  }, [fitView]);

  return <Story />;
};

export const withCanvasStore = (state: IMockCanvasState = {}): Decorator =>
  function WithCanvasStore(Story) {
    useEffect(() => {
      mockCanvasStore(state);

      return resetCanvasStore;
    }, []);

    return <Story />;
  };

export const withPermissionsStore = (state: IMockPermissionsState = {}): Decorator =>
  function WithPermissionsStore(Story) {
    useEffect(() => {
      mockPermissionsStore(state);

      return () => mockPermissionsStore();
    }, []);

    return <Story />;
  };

export const withOnboardingStore = (state: IMockOnboardingState = {}): Decorator =>
  function WithOnboardingStore(Story) {
    useEffect(() => {
      mockOnboardingStore(state);

      return resetOnboardingStore;
    }, []);

    return <Story />;
  };
