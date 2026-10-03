'use client';

import type { IGuideDefinition, ITourSnapshot } from '@interfaces';

import { joinAnchors, useOnboardingStore } from '@/lib/onboarding';

import { ExampleChoice } from './ExampleChoice';
import { TourSpotlight } from './TourSpotlight';
import { TourStepCard } from './TourStepCard';
import { useExampleScene, useTourGeometry } from '../hooks';

interface IExampleRunProps {
  guide: IGuideDefinition;
  stepIndex: number;
  snapshot: ITourSnapshot;
  onCreateExample: (name: string) => Promise<string | null>;
  onDeleteExample: (id: string) => Promise<void>;
}

export const ExampleRun = ({ guide, stepIndex, snapshot, onCreateExample, onDeleteExample }: IExampleRunProps) => {
  const advance = useOnboardingStore((state) => state.advance);
  const quitRun = useOnboardingStore((state) => state.quitRun);

  const step = guide.steps[stepIndex] ?? null;
  const isLastStep = stepIndex === guide.steps.length - 1;

  const { busy, removeExample } = useExampleScene(step?.act ?? null, stepIndex, onCreateExample, onDeleteExample);
  const anchorKey = joinAnchors(step?.anchors?.(snapshot));
  const openKey = joinAnchors(step?.openAnchors);
  const { rect, open } = useTourGeometry(anchorKey, openKey);

  const removeAndFinish = async () => {
    await removeExample();
    advance();
  };

  if (!step) return null;

  return (
    <>
      <TourSpotlight rect={rect} lit={open} open={[]} />
      <TourStepCard
        step={step}
        index={stepIndex}
        total={guide.steps.length}
        busy={busy}
        actions={isLastStep ? <ExampleChoice onKeep={advance} onRemove={removeAndFinish} /> : undefined}
        onQuit={quitRun}
        onNext={advance}
      />
    </>
  );
};
