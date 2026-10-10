import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import type { IPreferences } from '@interfaces';
import { DEFAULT_PREFERENCES, PREFERENCES_DEBOUNCE_MS, PREFERENCES_STORAGE_KEY } from '@constants';
import { getPreferences, upsertPreferences } from '@api/client';
import { awardBadge } from '@mocks/badges';
import { DEFAULT_LOCALE, TRANSLATIONS } from '@mocks/i18n';
import { PREFERENCES } from '@mocks/preferences';
import { usePreferences } from '@/app/platform/components/Settings/hooks';
import { event } from '@/lib/events';
import { useOnboardingStore } from '@/lib/onboarding';

vi.mock('@api/client', async () => ({
  ...(await import('@mocks/canvasApi')),
  ...(await import('@mocks/userApi')),
  ...(await import('@mocks/workspaceApi')),
}));
vi.mock('@/i18n', () => import('@mocks/i18n'));
vi.mock('@/lib/badges', () => import('@mocks/badges'));
vi.mock('@/lib/events', () => import('@mocks/events'));

const PREFERENCE_ATTRIBUTES = [
  'data-theme',
  'data-canvas-pattern',
  'data-snap-to-grid',
  'data-default-zoom',
  'data-smart-guides',
];

const HYDRATED: IPreferences = { ...PREFERENCES, language: DEFAULT_LOCALE };

let preferences: { current: ReturnType<typeof usePreferences> };

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(async () => {
  cleanup();
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
  localStorage.clear();
  PREFERENCE_ATTRIBUTES.forEach((attribute) => document.documentElement.removeAttribute(attribute));
  useOnboardingStore.getState().forget();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('usePreferences', () => {
  describe('GIVEN locally persisted preferences and no remote row', () => {
    beforeEach(() => {
      localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(PREFERENCES));
      vi.mocked(getPreferences).mockResolvedValue(null);

      preferences = renderHook(() => usePreferences()).result;
    });

    describe('WHEN the hook mounts', () => {
      test('THEN the stored preferences hydrate the state, with the language the interface is shown in', () => {
        expect(preferences.current.preferences).toEqual(HYDRATED);
      });

      test('THEN the document reflects every preference attribute', () => {
        expect(document.documentElement.getAttribute('data-theme')).toBe('eclipse');
        expect(document.documentElement.getAttribute('data-canvas-pattern')).toBe('lines');
        expect(document.documentElement.getAttribute('data-snap-to-grid')).toBe('true');
        expect(document.documentElement.getAttribute('data-default-zoom')).toBe('125');
        expect(document.documentElement.getAttribute('data-smart-guides')).toBe('false');
      });
    });

    describe('WHEN the remote load settles', () => {
      beforeEach(async () => {
        await act(async () => {
          await vi.advanceTimersByTimeAsync(0);
        });
      });

      test('THEN the local preferences stay without a save', () => {
        expect(preferences.current.preferences).toEqual(HYDRATED);
        expect(getPreferences).toHaveBeenCalledTimes(1);
        expect(upsertPreferences).not.toHaveBeenCalled();
      });
    });
  });

  describe('GIVEN remote preferences behind the api', () => {
    beforeEach(() => {
      vi.mocked(getPreferences).mockResolvedValue(PREFERENCES);

      preferences = renderHook(() => usePreferences()).result;
    });

    describe('WHEN the hook mounts', () => {
      test('THEN the defaults apply until the load settles', () => {
        expect(preferences.current.preferences).toEqual(DEFAULT_PREFERENCES);
        expect(document.documentElement.getAttribute('data-theme')).toBe('auto');
      });
    });

    describe('WHEN the remote load settles', () => {
      beforeEach(async () => {
        await act(async () => {
          await vi.advanceTimersByTimeAsync(0);
        });
      });

      test('THEN the remote preferences replace the defaults and persist locally', () => {
        expect(preferences.current.preferences).toEqual(PREFERENCES);
        expect(JSON.parse(localStorage.getItem(PREFERENCES_STORAGE_KEY)!)).toEqual(PREFERENCES);
        expect(document.documentElement.getAttribute('data-theme')).toBe('eclipse');
      });
    });
  });

  describe('GIVEN a remote load that is still in flight', () => {
    let resolveLoad: (preferences: IPreferences | null) => void;
    let rejectLoad: (reason: Error) => void;

    beforeEach(() => {
      const pendingLoad = Promise.withResolvers<IPreferences | null>();

      resolveLoad = pendingLoad.resolve;
      rejectLoad = pendingLoad.reject;
      vi.mocked(getPreferences).mockReturnValue(pendingLoad.promise);
      vi.mocked(upsertPreferences).mockResolvedValue(undefined);

      preferences = renderHook(() => usePreferences()).result;
    });

    describe('WHEN a preference changes and the remote row arrives within the debounce', () => {
      beforeEach(async () => {
        await act(async () => {
          preferences.current.updatePreference('theme', 'graphite');
        });
        await act(async () => {
          resolveLoad(PREFERENCES);
        });
        await act(async () => {
          await vi.advanceTimersByTimeAsync(PREFERENCES_DEBOUNCE_MS);
        });
      });

      test('THEN the change stays on top of the remote row everywhere', () => {
        expect(preferences.current.preferences).toEqual({ ...PREFERENCES, theme: 'graphite' });
        expect(JSON.parse(localStorage.getItem(PREFERENCES_STORAGE_KEY)!)).toEqual({
          ...PREFERENCES,
          theme: 'graphite',
        });
        expect(document.documentElement.getAttribute('data-theme')).toBe('graphite');
      });

      test('THEN a single save carries the remote row with the change', () => {
        expect(upsertPreferences).toHaveBeenCalledExactlyOnceWith({ ...PREFERENCES, theme: 'graphite' });
      });
    });

    describe('WHEN a changed preference passes the debounce before the remote row arrives', () => {
      beforeEach(async () => {
        await act(async () => {
          preferences.current.updatePreference('theme', 'graphite');
          await vi.advanceTimersByTimeAsync(PREFERENCES_DEBOUNCE_MS);
        });
        await act(async () => {
          resolveLoad(PREFERENCES);
        });
        await act(async () => {
          await vi.advanceTimersByTimeAsync(PREFERENCES_DEBOUNCE_MS);
        });
      });

      test('THEN the save waits for the remote row and carries it with the change', () => {
        expect(upsertPreferences).toHaveBeenCalledExactlyOnceWith({ ...PREFERENCES, theme: 'graphite' });
      });
    });

    describe('WHEN a preference changes and the load finds no remote row', () => {
      beforeEach(async () => {
        await act(async () => {
          preferences.current.updatePreference('theme', 'graphite');
        });
        await act(async () => {
          resolveLoad(null);
        });
        await act(async () => {
          await vi.advanceTimersByTimeAsync(PREFERENCES_DEBOUNCE_MS);
        });
      });

      test('THEN the local preferences with the change are saved', () => {
        expect(preferences.current.preferences).toEqual({ ...DEFAULT_PREFERENCES, theme: 'graphite' });
        expect(upsertPreferences).toHaveBeenCalledExactlyOnceWith({ ...DEFAULT_PREFERENCES, theme: 'graphite' });
      });
    });

    describe('WHEN a preference changes and the load fails', () => {
      beforeEach(async () => {
        await act(async () => {
          preferences.current.updatePreference('theme', 'graphite');
        });
        await act(async () => {
          rejectLoad(new Error('db down'));
        });
        await act(async () => {
          await vi.advanceTimersByTimeAsync(PREFERENCES_DEBOUNCE_MS);
        });
      });

      test('THEN the local preferences with the change are still saved', () => {
        expect(preferences.current.preferences).toEqual({ ...DEFAULT_PREFERENCES, theme: 'graphite' });
        expect(upsertPreferences).toHaveBeenCalledExactlyOnceWith({ ...DEFAULT_PREFERENCES, theme: 'graphite' });
      });
    });
  });

  describe('GIVEN loaded preferences over an accepting api', () => {
    let unmountPreferences: () => void;

    beforeEach(async () => {
      localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(PREFERENCES));
      vi.mocked(getPreferences).mockResolvedValue(null);
      vi.mocked(upsertPreferences).mockResolvedValue(undefined);

      const view = renderHook(() => usePreferences());

      preferences = view.result;
      unmountPreferences = view.unmount;
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
    });

    describe('WHEN a preference changes', () => {
      beforeEach(async () => {
        await act(async () => {
          preferences.current.updatePreference('theme', 'graphite');
        });
      });

      test('THEN the state, the storage and the document update before any save', () => {
        expect(preferences.current.preferences).toEqual({ ...HYDRATED, theme: 'graphite' });
        expect(JSON.parse(localStorage.getItem(PREFERENCES_STORAGE_KEY)!)).toEqual({
          ...HYDRATED,
          theme: 'graphite',
        });
        expect(document.documentElement.getAttribute('data-theme')).toBe('graphite');
        expect(upsertPreferences).not.toHaveBeenCalled();
      });

      test('THEN the Stylist badge is awarded for the new theme', () => {
        expect(awardBadge).toHaveBeenCalledExactlyOnceWith('stylist');
      });
    });

    describe('WHEN a changed preference passes the debounce', () => {
      beforeEach(async () => {
        await act(async () => {
          preferences.current.updatePreference('theme', 'graphite');
          await vi.advanceTimersByTimeAsync(PREFERENCES_DEBOUNCE_MS);
        });
      });

      test('THEN a single save carries the merged payload and the language the interface is shown in', () => {
        expect(upsertPreferences).toHaveBeenCalledExactlyOnceWith({ ...HYDRATED, theme: 'graphite' });
      });
    });

    describe('WHEN two changes land within one debounce window', () => {
      beforeEach(async () => {
        await act(async () => {
          preferences.current.updatePreference('theme', 'graphite');
        });
        await act(async () => {
          await vi.advanceTimersByTimeAsync(PREFERENCES_DEBOUNCE_MS / 2);
        });
        await act(async () => {
          preferences.current.updatePreference('theme', 'solstice');
        });
        await act(async () => {
          await vi.advanceTimersByTimeAsync(PREFERENCES_DEBOUNCE_MS);
        });
      });

      test('THEN a single save carries the last value', () => {
        expect(preferences.current.preferences.theme).toBe('solstice');
        expect(upsertPreferences).toHaveBeenCalledExactlyOnceWith({ ...HYDRATED, theme: 'solstice' });
      });
    });

    describe('WHEN several preferences change quickly', () => {
      beforeEach(async () => {
        await act(async () => {
          preferences.current.updatePreference('canvasPattern', 'cross');
        });
        await act(async () => {
          preferences.current.updatePreference('snapToGrid', false);
        });
        await act(async () => {
          preferences.current.updatePreference('defaultZoom', 150);
        });
        await act(async () => {
          preferences.current.updatePreference('language', 'fr');
        });
        await act(async () => {
          preferences.current.updatePreference('smartGuides', true);
        });
        await act(async () => {
          await vi.advanceTimersByTimeAsync(PREFERENCES_DEBOUNCE_MS);
        });
      });

      test('THEN a single save merges every change', () => {
        expect(upsertPreferences).toHaveBeenCalledExactlyOnceWith({
          ...HYDRATED,
          canvasPattern: 'cross',
          snapToGrid: false,
          defaultZoom: 150,
          language: 'fr',
          smartGuides: true,
        });
      });

      test('THEN the document attributes follow the changes', () => {
        expect(document.documentElement.getAttribute('data-canvas-pattern')).toBe('cross');
        expect(document.documentElement.getAttribute('data-snap-to-grid')).toBe('false');
        expect(document.documentElement.getAttribute('data-default-zoom')).toBe('150');
        expect(document.documentElement.getAttribute('data-smart-guides')).toBe('true');
      });

      test('THEN no badge is awarded without a theme change', () => {
        expect(awardBadge).not.toHaveBeenCalled();
      });
    });

    describe('WHEN a preference is set to its current value', () => {
      let before: IPreferences;

      beforeEach(async () => {
        before = preferences.current.preferences;
        await act(async () => {
          preferences.current.updatePreference('theme', PREFERENCES.theme);
          await vi.advanceTimersByTimeAsync(PREFERENCES_DEBOUNCE_MS);
        });
      });

      test('THEN the state keeps its identity and nothing saves', () => {
        expect(preferences.current.preferences).toBe(before);
        expect(upsertPreferences).not.toHaveBeenCalled();
        expect(awardBadge).not.toHaveBeenCalled();
      });
    });

    describe('WHEN the hook unmounts before the debounce elapses', () => {
      beforeEach(async () => {
        await act(async () => {
          preferences.current.updatePreference('theme', 'graphite');
        });
        unmountPreferences();
        await act(async () => {
          await vi.advanceTimersByTimeAsync(PREFERENCES_DEBOUNCE_MS);
        });
      });

      test('THEN the pending save never reaches the api', () => {
        expect(upsertPreferences).not.toHaveBeenCalled();
      });
    });
  });

  describe('GIVEN a guide in progress over loaded preferences', () => {
    beforeEach(async () => {
      localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(PREFERENCES));
      vi.mocked(getPreferences).mockResolvedValue(null);
      vi.mocked(upsertPreferences).mockResolvedValue(undefined);
      useOnboardingStore.setState({ run: { guideId: 'settings', stepIndex: 0 } });

      preferences = renderHook(() => usePreferences()).result;
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
    });

    describe('WHEN the theme, the canvas pattern and the default zoom change', () => {
      beforeEach(async () => {
        await act(async () => {
          preferences.current.updatePreference('theme', 'graphite');
        });
        await act(async () => {
          preferences.current.updatePreference('canvasPattern', 'cross');
        });
        await act(async () => {
          preferences.current.updatePreference('defaultZoom', 150);
        });
      });

      test('THEN each change is recorded as its tour signal', () => {
        expect(useOnboardingStore.getState().signals).toEqual(new Set(['themePicked', 'patternPicked', 'editorTuned']));
      });
    });

    describe('WHEN a preference is set to its current value', () => {
      beforeEach(async () => {
        await act(async () => {
          preferences.current.updatePreference('theme', PREFERENCES.theme);
        });
      });

      test('THEN no tour signal is recorded', () => {
        expect(useOnboardingStore.getState().signals.size).toBe(0);
      });
    });

    describe('WHEN the language changes', () => {
      beforeEach(async () => {
        await act(async () => {
          preferences.current.updatePreference('language', 'fr');
        });
      });

      test('THEN no tour signal is recorded', () => {
        expect(useOnboardingStore.getState().signals.size).toBe(0);
      });
    });
  });

  describe('GIVEN a remote load that fails on the api', () => {
    beforeEach(async () => {
      vi.mocked(getPreferences).mockRejectedValue(new Error('db down'));

      preferences = renderHook(() => usePreferences()).result;
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
    });

    describe('WHEN the failure settles', () => {
      test('THEN the defaults stay and the failure stays toastless', () => {
        expect(preferences.current.preferences).toEqual(DEFAULT_PREFERENCES);
        expect(event.error).toHaveBeenCalledExactlyOnceWith(expect.any(Error), {
          toast: false,
          context: 'preferences.load',
        });
      });
    });
  });

  describe('GIVEN a save that fails on the api', () => {
    beforeEach(async () => {
      localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(PREFERENCES));
      vi.mocked(getPreferences).mockResolvedValue(null);
      vi.mocked(upsertPreferences).mockRejectedValue(new Error('db down'));

      preferences = renderHook(() => usePreferences()).result;
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
    });

    describe('WHEN a changed preference saves after the debounce', () => {
      beforeEach(async () => {
        await act(async () => {
          preferences.current.updatePreference('theme', 'graphite');
          await vi.advanceTimersByTimeAsync(PREFERENCES_DEBOUNCE_MS);
        });
      });

      test('THEN the change rolls back everywhere', () => {
        expect(preferences.current.preferences).toEqual(HYDRATED);
        expect(JSON.parse(localStorage.getItem(PREFERENCES_STORAGE_KEY)!)).toEqual(HYDRATED);
        expect(document.documentElement.getAttribute('data-theme')).toBe('eclipse');
      });

      test('THEN the failure surfaces with the localized title', () => {
        expect(event.error).toHaveBeenCalledExactlyOnceWith(expect.any(Error), {
          title: TRANSLATIONS.common.errorTitles.saveFailed,
          context: 'preferences.save',
        });
      });
    });

    describe('WHEN two preferences change within one debounce window and their save fails', () => {
      beforeEach(async () => {
        await act(async () => {
          preferences.current.updatePreference('theme', 'graphite');
        });
        await act(async () => {
          preferences.current.updatePreference('canvasPattern', 'cross');
        });
        await act(async () => {
          await vi.advanceTimersByTimeAsync(PREFERENCES_DEBOUNCE_MS);
        });
      });

      test('THEN both changes roll back everywhere', () => {
        expect(preferences.current.preferences).toEqual(HYDRATED);
        expect(JSON.parse(localStorage.getItem(PREFERENCES_STORAGE_KEY)!)).toEqual(HYDRATED);
        expect(document.documentElement.getAttribute('data-theme')).toBe('eclipse');
        expect(document.documentElement.getAttribute('data-canvas-pattern')).toBe('lines');
      });
    });
  });

  describe('GIVEN a save still in flight when the same key changes again', () => {
    let rejectSave: (reason: Error) => void;

    beforeEach(async () => {
      const inFlightSave = Promise.withResolvers<void>();

      rejectSave = inFlightSave.reject;
      localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(PREFERENCES));
      vi.mocked(getPreferences).mockResolvedValue(null);
      vi.mocked(upsertPreferences).mockResolvedValue(undefined);
      vi.mocked(upsertPreferences).mockReturnValueOnce(inFlightSave.promise);

      preferences = renderHook(() => usePreferences()).result;
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
    });

    describe('WHEN the stale save fails after the newer change', () => {
      beforeEach(async () => {
        await act(async () => {
          preferences.current.updatePreference('theme', 'graphite');
          await vi.advanceTimersByTimeAsync(PREFERENCES_DEBOUNCE_MS);
        });
        await act(async () => {
          preferences.current.updatePreference('theme', 'solstice');
        });
        await act(async () => {
          rejectSave(new Error('db down'));
          await vi.advanceTimersByTimeAsync(PREFERENCES_DEBOUNCE_MS);
        });
      });

      test('THEN the newer value survives the stale failure', () => {
        expect(preferences.current.preferences.theme).toBe('solstice');
        expect(JSON.parse(localStorage.getItem(PREFERENCES_STORAGE_KEY)!)).toEqual({
          ...HYDRATED,
          theme: 'solstice',
        });
      });

      test('THEN the failure surfaces once and the newer save persists', () => {
        expect(upsertPreferences).toHaveBeenCalledTimes(2);
        expect(upsertPreferences).toHaveBeenLastCalledWith({ ...HYDRATED, theme: 'solstice' });
        expect(event.error).toHaveBeenCalledExactlyOnceWith(expect.any(Error), {
          title: TRANSLATIONS.common.errorTitles.saveFailed,
          context: 'preferences.save',
        });
      });
    });
  });
});
