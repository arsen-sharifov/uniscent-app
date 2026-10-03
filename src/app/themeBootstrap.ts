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
  const config = ${escapeForInlineScript(JSON.stringify(BOOTSTRAP_CONFIG))};
  const root = document.documentElement;
  const setAttribute = (name, value) => root.setAttribute(name, value);
  setAttribute('data-scripted', '');
  const setBooleanAttribute = (name, value, fallback) =>
    setAttribute(name, typeof value === 'boolean' ? String(value) : String(fallback));
  try {
    const stored = JSON.parse(localStorage.getItem(config.storageKey) || 'null');
    const theme = stored && stored.theme;
    const pattern = stored && stored.canvasPattern;
    const zoom = stored && stored.defaultZoom;
    setAttribute('data-theme', config.themes.includes(theme) ? theme : config.defaultTheme);
    setAttribute('data-canvas-pattern', config.patterns.includes(pattern) ? pattern : config.defaultPattern);
    setAttribute('data-default-zoom', config.zooms.includes(zoom) ? String(zoom) : String(config.defaultZoom));
    setBooleanAttribute('data-snap-to-grid', stored && stored.snapToGrid, config.defaultSnap);
    setBooleanAttribute('data-smart-guides', stored && stored.smartGuides, config.defaultGuides);
  } catch {
    setAttribute('data-theme', config.defaultTheme);
    setAttribute('data-canvas-pattern', config.defaultPattern);
    setAttribute('data-default-zoom', String(config.defaultZoom));
    setAttribute('data-snap-to-grid', String(config.defaultSnap));
    setAttribute('data-smart-guides', String(config.defaultGuides));
  }
})();
`;
