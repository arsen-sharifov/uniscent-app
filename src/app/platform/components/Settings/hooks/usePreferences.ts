'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { IPreferences, TPreferenceUpdater } from '@interfaces';
import { PREFERENCES_DEBOUNCE_MS } from '@constants';
import { getPreferences, upsertPreferences } from '@api/client';
import { useLocale, useTranslations } from '@/i18n';
import { awardBadge } from '@/lib/badges';
import { event } from '@/lib/events';
import { useOnboardingStore } from '@/lib/onboarding';

import { PREFERENCE_SIGNALS } from '../consts';
import { readFromStorage, writeToStorage } from '../utils';

export const usePreferences = () => {
  const t = useTranslations();
  const locale = useLocale();
  const [preferences, setPreferences] = useState<IPreferences>(() => ({ ...readFromStorage(), language: locale }));
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const lastSyncedRef = useRef<IPreferences>(preferences);
  const loadedRef = useRef(false);

  const revertPreferences = useCallback(
    (failed: IPreferences) =>
      setPreferences((current) => {
        const reverted = (Object.keys(failed) as (keyof IPreferences)[])
          .filter((key) => current[key] === failed[key] && failed[key] !== lastSyncedRef.current[key])
          .reduce((next, key) => ({ ...next, [key]: lastSyncedRef.current[key] }), current);
        if (reverted === current) return current;

        writeToStorage(reverted);

        return reverted;
      }),
    [],
  );

  const savePreferences = useCallback(
    (next: IPreferences) =>
      upsertPreferences(next)
        .then(() => {
          lastSyncedRef.current = next;
        })
        .catch((error) => {
          revertPreferences(next);
          event.error(error, { title: t.common.errorTitles.saveFailed, context: 'preferences.save' });
        }),
    [revertPreferences, t],
  );

  const scheduleSave = useCallback(
    (next: IPreferences) => {
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => savePreferences(next), PREFERENCES_DEBOUNCE_MS);
    },
    [savePreferences],
  );

  useEffect(() => {
    if (loadedRef.current) return;

    let cancelled = false;

    const applyStored = (stored: IPreferences | null) => {
      if (cancelled) return;

      const local = lastSyncedRef.current;
      loadedRef.current = true;
      if (stored) lastSyncedRef.current = stored;

      setPreferences((current) => {
        const changedKeys = (Object.keys(current) as (keyof IPreferences)[]).filter(
          (key) => current[key] !== local[key],
        );
        const next = stored
          ? changedKeys.reduce((merged, key) => ({ ...merged, [key]: current[key] }), stored)
          : current;
        if (next !== current) writeToStorage(next);
        if (changedKeys.length > 0) scheduleSave(next);

        return next;
      });
    };

    getPreferences()
      .then(applyStored)
      .catch((error) => {
        event.error(error, { toast: false, context: 'preferences.load' });
        applyStored(null);
      });

    return () => {
      cancelled = true;
    };
  }, [scheduleSave]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', preferences.theme);
  }, [preferences.theme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-canvas-pattern', preferences.canvasPattern);
  }, [preferences.canvasPattern]);

  useEffect(() => {
    document.documentElement.setAttribute('data-snap-to-grid', String(preferences.snapToGrid));
  }, [preferences.snapToGrid]);

  useEffect(() => {
    document.documentElement.setAttribute('data-default-zoom', String(preferences.defaultZoom));
  }, [preferences.defaultZoom]);

  useEffect(() => {
    document.documentElement.setAttribute('data-smart-guides', String(preferences.smartGuides));
  }, [preferences.smartGuides]);

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  const updatePreference: TPreferenceUpdater = (key, value) => {
    const signal = PREFERENCE_SIGNALS[key];
    if (signal && preferences[key] !== value) useOnboardingStore.getState().markSignal(signal);
    if (key === 'theme' && preferences.theme !== value) awardBadge('stylist');

    setPreferences((previous) => {
      if (previous[key] === value) return previous;

      const next = { ...previous, [key]: value };
      writeToStorage(next);
      if (loadedRef.current) scheduleSave(next);

      return next;
    });
  };

  return { preferences, updatePreference };
};
