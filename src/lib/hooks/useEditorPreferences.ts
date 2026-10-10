'use client';

import { useSyncExternalStore } from 'react';

import type { TDefaultZoom, TEditorPreferences } from '@interfaces';
import { DEFAULT_PREFERENCES } from '@constants';
import { createRootAttributeSubscription, isDefaultZoom } from '@/lib/utils';

const SERVER_SNAPSHOT: TEditorPreferences = {
  snapToGrid: DEFAULT_PREFERENCES.snapToGrid,
  defaultZoom: DEFAULT_PREFERENCES.defaultZoom,
  smartGuides: DEFAULT_PREFERENCES.smartGuides,
};

const subscribe = createRootAttributeSubscription(['data-snap-to-grid', 'data-default-zoom', 'data-smart-guides']);

let cached: TEditorPreferences = SERVER_SNAPSHOT;

const readBoolean = (attribute: string, fallback: boolean): boolean => {
  const value = document.documentElement.getAttribute(attribute);

  return value === null ? fallback : value === 'true';
};

const readDefaultZoom = (fallback: TDefaultZoom): TDefaultZoom => {
  const parsed = Number(document.documentElement.getAttribute('data-default-zoom'));

  return isDefaultZoom(parsed) ? parsed : fallback;
};

const readSnapshot = (): TEditorPreferences => {
  if (typeof document === 'undefined') return SERVER_SNAPSHOT;

  const next: TEditorPreferences = {
    snapToGrid: readBoolean('data-snap-to-grid', DEFAULT_PREFERENCES.snapToGrid),
    defaultZoom: readDefaultZoom(DEFAULT_PREFERENCES.defaultZoom),
    smartGuides: readBoolean('data-smart-guides', DEFAULT_PREFERENCES.smartGuides),
  };

  if (
    cached.snapToGrid === next.snapToGrid &&
    cached.defaultZoom === next.defaultZoom &&
    cached.smartGuides === next.smartGuides
  ) {
    return cached;
  }

  cached = next;

  return cached;
};

export const useEditorPreferences = (): TEditorPreferences =>
  useSyncExternalStore(subscribe, readSnapshot, () => SERVER_SNAPSHOT);
