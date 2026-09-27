import {
  CANVAS_PATTERN_VALUES,
  DEFAULT_PREFERENCES,
  DEFAULT_ZOOM_VALUES,
  PREFERENCES_STORAGE_KEY,
  THEME_VALUES,
} from '@constants';

const BOOTSTRAP_CONFIG = {
  storageKey: PREFERENCES_STORAGE_KEY,
  themes: THEME_VALUES,
  patterns: CANVAS_PATTERN_VALUES,
  zooms: DEFAULT_ZOOM_VALUES,
  defaultTheme: DEFAULT_PREFERENCES.theme,
  defaultPattern: DEFAULT_PREFERENCES.canvasPattern,
  defaultSnap: DEFAULT_PREFERENCES.snapToGrid,
  defaultZoom: DEFAULT_PREFERENCES.defaultZoom,
  defaultGuides: DEFAULT_PREFERENCES.smartGuides,
};

const escapeForInlineScript = (json: string) =>
  json
    .replaceAll('<', String.raw`\u003c`)
    .replaceAll('>', String.raw`\u003e`)
    .replaceAll('&', String.raw`\u0026`);

export const THEME_BOOTSTRAP = `
(() => {
  const c = ${escapeForInlineScript(JSON.stringify(BOOTSTRAP_CONFIG))};
  const h = document.documentElement;
  const set = (a, v) => h.setAttribute(a, v);
  set('data-scripted', '');
  const bool = (a, v, d) => set(a, typeof v === 'boolean' ? String(v) : String(d));
  try {
    const p = JSON.parse(localStorage.getItem(c.storageKey) || 'null');
    const t = p && p.theme;
    const x = p && p.canvasPattern;
    const z = p && p.defaultZoom;
    set('data-theme', c.themes.includes(t) ? t : c.defaultTheme);
    set('data-canvas-pattern', c.patterns.includes(x) ? x : c.defaultPattern);
    set('data-default-zoom', c.zooms.includes(z) ? String(z) : String(c.defaultZoom));
    bool('data-snap-to-grid', p && p.snapToGrid, c.defaultSnap);
    bool('data-smart-guides', p && p.smartGuides, c.defaultGuides);
  } catch {
    set('data-theme', c.defaultTheme);
    set('data-canvas-pattern', c.defaultPattern);
    set('data-default-zoom', String(c.defaultZoom));
    set('data-snap-to-grid', String(c.defaultSnap));
    set('data-smart-guides', String(c.defaultGuides));
  }
})();
`;
