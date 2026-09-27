'use client';

import { type FocusEvent, type KeyboardEvent, useEffect, useRef } from 'react';

import { useOnboardingStore } from '@/lib/onboarding';
import { useCanvasStore } from '@/lib/stores';

export const useLabelEditing = (id: string, label: string, isEditing: boolean) => {
  const setEditingNodeId = useCanvasStore((s) => s.setEditingNodeId);
  const updateNodeLabel = useCanvasStore((s) => s.updateNodeLabel);

  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isEditing) return;

    const input = inputRef.current;
    if (!input) return;

    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }, [isEditing]);

  const commitLabel = (value: string) => {
    const nextLabel = value.trim() || label;
    if (nextLabel !== label) useOnboardingStore.getState().markSignal('nodeLabelled');

    updateNodeLabel(id, nextLabel);
    setEditingNodeId(null);
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
