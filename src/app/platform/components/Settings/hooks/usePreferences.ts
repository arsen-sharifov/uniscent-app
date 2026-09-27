'use client';

import { useEffect, useRef, useState } from 'react';

import type { IPreferences, TPreferenceUpdater } from '@interfaces';
import { PREFERENCES_DEBOUNCE_MS } from '@constants';
import { getPreferences, upsertPreferences } from '@api/client';
import { useLocale, useTranslations } from '@/i18n';
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

  useEffect(() => {
    let cancelled = false;

    getPreferences()
      .then((dbPrefs) => {
        if (cancelled || !dbPrefs) {
          return;
        }

        lastSyncedRef.current = dbPrefs;
        setPreferences(dbPrefs);
        writeToStorage(dbPrefs);
      })
      .catch((error) => event.error(error, { toast: false, context: 'preferences.load' }));

    return () => {
      cancelled = true;
    };
  }, []);

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

  const revertPreference: TPreferenceUpdater = (key, value) =>
    setPreferences((current) => {
      if (current[key] !== value) {
        return current;
      }

      const reverted = { ...current, [key]: lastSyncedRef.current[key] };
      writeToStorage(reverted);

      return reverted;
    });

  const savePreference = <Key extends keyof IPreferences>(next: IPreferences, key: Key, value: IPreferences[Key]) =>
    upsertPreferences(next)
      .then(() => {
        lastSyncedRef.current = next;
      })
      .catch((error) => {
        revertPreference(key, value);
        event.error(error, { title: t.common.errorTitles.saveFailed, context: 'preferences.save' });
      });

  const updatePreference: TPreferenceUpdater = (key, value) => {
    const signal = PREFERENCE_SIGNALS[key];
    if (signal && preferences[key] !== value) useOnboardingStore.getState().markSignal(signal);

    setPreferences((prev) => {
      if (prev[key] === value) {
        return prev;
      }

      const next = { ...prev, [key]: value };
      writeToStorage(next);
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => savePreference(next, key, value), PREFERENCES_DEBOUNCE_MS);

      return next;
    });
  };

  return { preferences, updatePreference };
};
