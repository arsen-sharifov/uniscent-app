import type { IExportCodePointRange, TCanvasExportFormat } from '@interfaces';

export const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
export const EXPORT_PADDING = 48;
export const EXPORT_MIN_WIDTH = 240;
export const EXPORT_MARK_HEIGHT = 40;
export const EXPORT_MARK_TEXT = 'Uniscept';
export const EXPORT_MARK_FONT_SIZE = '12px';
export const EXPORT_MARK_LINE_HEIGHT = '18px';
export const EXPORT_SCALE = 3;
export const EXPORT_MIN_SCALE = 2;
export const EXPORT_MAX_DIMENSION = 16384;
export const EXPORT_MAX_PIXELS = 64 * 1024 * 1024;
export const EXPORT_JPEG_QUALITY = 0.95;
export const EXPORT_FILENAME_MAX_LENGTH = 120;
export const EXPORT_FONT_TIMEOUT_MS = 15_000;
export const EXPORT_URL_LIFETIME_MS = 60_000;

export const CANVAS_NODE_SELECTOR = '.react-flow__node';
export const EXPORT_NODE_SELECTOR = '[data-export-node]';
export const EXPORT_OMIT_SELECTOR = '[data-export-omit], .react-flow__handle';
export const EXPORT_EDGE_SELECTOR = '[data-export-edge]';
export const EDGE_PATH_SELECTOR = '.react-flow__edge-path';
export const EXPORT_NODE_ID_ATTRIBUTE = 'data-node-id';
export const EXPORT_EDGE_ID_ATTRIBUTE = 'data-edge-id';

export const FILENAME_FORBIDDEN_PATTERN = /[<>:"/\\|?*]/g;
export const FILENAME_TRAILING_CHARACTERS = '. ';
export const FILENAME_BIDI_CONTROL_RANGES: readonly IExportCodePointRange[] = [
  { start: 0x06_1c, end: 0x06_1c },
  { start: 0x20_0e, end: 0x20_0f },
  { start: 0x20_2a, end: 0x20_2e },
  { start: 0x20_66, end: 0x20_69 },
];
export const FILENAME_RESERVED_PATTERN = /^(con|prn|aux|nul|com\d|lpt\d)(?:\.|$)/i;
export const BOX_SHADOW_LENGTHS_PATTERN = / (-?[\d.]+)px (-?[\d.]+)px ([\d.]+)px (-?[\d.]+)px$/;
export const LINEAR_GRADIENT_PREFIX = 'linear-gradient(';
export const CSS_URL_PATTERN = /url\(([^)]*)\)/g;
export const UNICODE_RANGE_PATTERN = /^U\+([\dA-F?]+)(?:-([\dA-F]+))?$/i;
export const QUOTES_PATTERN = /["']/g;
export const RGB_COLOR_PATTERN = /^rgba?\(/;
export const SRGB_COLOR_PATTERN = /^color\(srgb ([\d.]+) ([\d.]+) ([\d.]+)(?: \/ ([\d.]+))?\)$/;

export const SHADOW_FILTER_REGION = { x: '-50%', y: '-50%', width: '200%', height: '200%' } as const;

export const EXPORT_MIME_TYPES: Record<TCanvasExportFormat, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  svg: 'image/svg+xml',
};

export const EXPORT_STAGE_CSS = `
  [data-canvas-export-stage] *, [data-canvas-export-stage] *::before, [data-canvas-export-stage] *::after {
    animation: none !important;
    transition: none !important;
    transform: none !important;
    translate: none !important;
  }
  [data-canvas-export-stage] [data-export-node] {
    border-color: var(--border-strong) !important;
    box-shadow: var(--shadow-pip) !important;
  }
  [data-canvas-export-stage] p, [data-canvas-export-stage] .truncate {
    -webkit-line-clamp: unset !important;
    overflow: visible !important;
    white-space: pre-wrap !important;
    overflow-wrap: anywhere !important;
    text-overflow: clip !important;
    flex-shrink: 1;
    min-width: 0;
  }
`;

export const SVG_PRESENTATION_ATTRIBUTES = [
  'fill',
  'fill-opacity',
  'stroke',
  'stroke-width',
  'stroke-opacity',
  'stroke-linecap',
  'stroke-linejoin',
  'fill-rule',
  'clip-rule',
  'opacity',
] as const;
