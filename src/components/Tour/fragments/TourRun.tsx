'use client';

import { useEffect, useRef, useState } from 'react';

import type { IGuideDefinition, IStepArrival, ITourSnapshot } from '@interfaces';

import { joinAnchors, useOnboardingStore } from '@/lib/onboarding';

import { TourSpotlight } from './TourSpotlight';
import { TourStepCard } from './TourStepCard';
import { useAnchorFocus, useAnchorInView, useTourGeometry } from '../hooks';

interface ITourRunProps {
  guide: IGuideDefinition;
  stepIndex: number;
  snapshot: ITourSnapshot;
}

export const TourRun = ({ guide, stepIndex, snapshot }: ITourRunProps) => {
  const advance = useOnboardingStore((state) => state.advance);
  const rewind = useOnboardingStore((state) => state.rewind);
  const quitRun = useOnboardingStore((state) => state.quitRun);

  const step = guide.steps[stepIndex] ?? null;
  const previousStep = guide.steps[stepIndex - 1] ?? null;
  const doneNow = step?.isDone?.(snapshot) ?? false;

  const [arrival, setArrival] = useState<IStepArrival>(() => ({ index: stepIndex, done: doneNow }));
  const snapshotRef = useRef(snapshot);

  if (arrival.index !== stepIndex) setArrival({ index: stepIndex, done: doneNow });
  if (arrival.index === stepIndex && arrival.done && !doneNow) setArrival({ index: stepIndex, done: false });

  const done = arrival.index === stepIndex && arrival.done;
  const anchorKey = joinAnchors(step?.anchors?.(snapshot));
  const openKey = joinAnchors(step?.openAnchors);
  const { rect, anchor, blocked, lit, open, lastRect, lost } = useTourGeometry(anchorKey, openKey);
  const inTheWay = step?.isDone && !done ? blocked : null;

  useAnchorFocus(anchor);
  useAnchorInView(anchor);

  useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);

  useEffect(() => {
    if (!step) return;
    if (!step.isSkipped?.(snapshot) && (!doneNow || done)) return;

    advance();
  }, [step, snapshot, doneNow, done, advance]);

  useEffect(() => {
    if (!lost || !previousStep?.isDone || previousStep.isDone(snapshotRef.current)) return;

    rewind();
  }, [lost, previousStep, rewind]);

  if (!step) return null;

  return (
    <>
      <TourSpotlight rect={inTheWay ?? rect} lit={lit} open={open} />
      <TourStepCard
        step={step}
        rect={inTheWay ?? rect ?? lastRect}
        lost={lost}
        settling={anchorKey !== '' && rect === null && !lost}
        blocked={inTheWay !== null}
        done={done}
        index={stepIndex}
        total={guide.steps.length}
        onQuit={quitRun}
        onNext={!step.isDone || done ? advance : undefined}
      />
    </>
  );
};
