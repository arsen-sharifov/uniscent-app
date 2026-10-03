'use client';

import { type FocusEvent, type KeyboardEvent, useEffect, useRef } from 'react';

import type { IUseLabelEditingOptions, IUseLabelEditingResult } from '@interfaces';

import { useOnboardingStore } from '@/lib/onboarding';
import { useCanvasStore } from '@/lib/stores';
import { isTypingTarget } from '@/lib/utils';

export const useLabelEditing = ({
  id,
  label,
  measured,
  signalLabelled = false,
}: IUseLabelEditingOptions): IUseLabelEditingResult => {
  const setEditingNodeId = useCanvasStore((state) => state.setEditingNodeId);
  const updateNodeLabel = useCanvasStore((state) => state.updateNodeLabel);

  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!measured) return;

    const input = inputRef.current;
    if (!input) return;
    if (document.activeElement !== input && isTypingTarget(document.activeElement)) return;

    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }, [measured]);

  const commitLabel = (value: string) => {
    const nextLabel = value.trim() || label;
    setEditingNodeId(null);
    if (nextLabel === label) return;

    updateNodeLabel(id, nextLabel);
    if (signalLabelled) useOnboardingStore.getState().markSignal('nodeLabelled');
  };

  const handleLabelBlur = (event: FocusEvent<HTMLTextAreaElement>) => commitLabel(event.target.value);

  const handleLabelKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      commitLabel(event.currentTarget.value);

      return;
    }

    if (event.key === 'Escape') setEditingNodeId(null);
  };

  return { inputRef, handleLabelBlur, handleLabelKeyDown };
};
