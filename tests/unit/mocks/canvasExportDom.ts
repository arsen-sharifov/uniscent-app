import { vi } from 'vitest';

import type { ICanvasExportContext } from '@interfaces';

import { EXPORT_NODE_SELECTOR, SVG_NAMESPACE } from '@/lib/canvas/export';

const GLYPH_WIDTH = 8;
const LINE_HEIGHT = 20;
const NODE_WIDTH = 200;
const NODE_HEIGHT = 60;
const EDGE_BOX = { x: 240, y: 110, width: 160, height: 0 };
const TRANSLATE_PATTERN = /translate\((-?[\d.]+)px, (-?[\d.]+)px\)/;
const EXPORT_THREAD = 'Thread';
const SOURCE_LABEL = 'Origin claim';
const TARGET_LABEL = 'Refuted premise';
const DRAFT_LABEL = 'Draft label';
const PLACEHOLDER_LABEL = 'Type a label';
const MULTILINE_LABEL = 'First line\nSecond line';
const MARKUP_LABEL = '</text><script>alert(1)</script><a href="javascript:alert(2)">go</a>';
const MARKUP_THREAD = 'Plan"><script>alert(3)</script>';
const CONTROL_LABEL = `Bell${String.fromCodePoint(0x07)} form${String.fromCodePoint(0x0c)} feed${String.fromCodePoint(0xff_ff)} end`;
const CONTROL_SAFE_LABEL = 'Bell form feed end';
const OMITTED_LABEL = 'Show more';
const HIDDEN_LABEL = 'Hidden helper';
const EDGE_STROKE = 'rgb(21, 128, 61)';
const WASH_COLOR = 'rgba(220, 38, 38, 0.07)';
const SHADOW = 'rgba(0, 0, 0, 0.1) 0px 1px 2px 0px';
const BACKGROUND = 'rgba(250, 250, 245, 1)';
const ICON_FILL = 'rgb(1, 2, 3)';

export const EXPORT_BLOB_URL = 'blob:export';

export const EXPORT_FIXTURE = {
  thread: EXPORT_THREAD,
  sourceLabel: SOURCE_LABEL,
  targetLabel: TARGET_LABEL,
  draftLabel: DRAFT_LABEL,
  placeholderLabel: PLACEHOLDER_LABEL,
  multilineLabel: MULTILINE_LABEL,
  markupLabel: MARKUP_LABEL,
  markupThread: MARKUP_THREAD,
  controlLabel: CONTROL_LABEL,
  controlSafeLabel: CONTROL_SAFE_LABEL,
  omittedLabel: OMITTED_LABEL,
  hiddenLabel: HIDDEN_LABEL,
  edgeStroke: EDGE_STROKE,
  washColor: WASH_COLOR,
  background: BACKGROUND,
  iconFill: ICON_FILL,
  sidedEdgeStart: 'M240,110 ',
  unsidedEdgeStart: 'M140,140 ',
  frame: { width: 656, height: 196 },
} as const;

class TranslationMatrix {
  m41: number;
  m42: number;

  constructor(transform: string) {
    const [, x = '0', y = '0'] = TRANSLATE_PATTERN.exec(transform) ?? [];
    this.m41 = Number(x);
    this.m42 = Number(y);
  }
}

class InstantImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  source = '';

  set src(value: string) {
    this.source = value;
    queueMicrotask(() => this.onload?.());
  }
}

class BrokenImage extends InstantImage {
  override set src(value: string) {
    this.source = value;
    queueMicrotask(() => this.onerror?.());
  }
}

const rect = (x: number, y: number, width: number, height: number): DOMRect =>
  ({ x, y, width, height, left: x, top: y, right: x + width, bottom: y + height, toJSON: () => ({}) }) as DOMRect;

const styleRect = function (this: Element): DOMRect {
  const style = this instanceof HTMLElement ? this.style : null;

  return rect(
    Number.parseFloat(style?.left ?? '') || 0,
    Number.parseFloat(style?.top ?? '') || 0,
    NODE_WIDTH,
    NODE_HEIGHT,
  );
};

const rangeRect = function (this: Range): DOMRect {
  const text = this.startContainer instanceof Text ? this.startContainer.data : '';
  const lines = text.slice(0, this.startOffset).split('\n');
  const column = lines.at(-1)?.length ?? 0;

  return rect(column * GLYPH_WIDTH, (lines.length - 1) * LINE_HEIGHT, GLYPH_WIDTH, LINE_HEIGHT);
};

export const scratchContext = {
  font: '',
  fillStyle: '',
  measureText: () => ({ fontBoundingBoxAscent: 12, fontBoundingBoxDescent: 4 }),
  clearRect: () => {},
  fillRect: () => {},
  drawImage: () => {},
  getImageData: () => ({ data: Uint8ClampedArray.of(250, 250, 245, 255) }),
};

export const installExportEnvironment = (): void => {
  vi.stubGlobal('DOMMatrix', TranslationMatrix);
  vi.stubGlobal('Image', InstantImage);
  Object.defineProperty(document, 'fonts', { configurable: true, value: { ready: Promise.resolve() } });
  Object.defineProperty(Range.prototype, 'getBoundingClientRect', { configurable: true, value: rangeRect });
  Object.defineProperty(Element.prototype, 'getBoundingClientRect', { configurable: true, value: styleRect });
  Object.defineProperty(SVGElement.prototype, 'getBBox', {
    configurable: true,
    value: () => rect(EDGE_BOX.x, EDGE_BOX.y, EDGE_BOX.width, EDGE_BOX.height),
  });
  URL.createObjectURL = vi.fn(() => EXPORT_BLOB_URL);
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    scratchContext as unknown as CanvasRenderingContext2D,
  );
};

export const breakImageLoading = (): void => {
  vi.stubGlobal('Image', BrokenImage);
};

const svgChild = (name: string): SVGElement => document.createElementNS(SVG_NAMESPACE, name);

export const colorContext = (): ICanvasExportContext =>
  ({ stage: document.body, scratch: scratchContext, colors: new Map() }) as unknown as ICanvasExportContext;

export const definitionContext = (): ICanvasExportContext =>
  ({ defs: svgChild('defs'), definitions: new Map() }) as unknown as ICanvasExportContext;

export const glyphContext = (text: string, family: string): ICanvasExportContext =>
  ({
    fonts: new Set([family]),
    codePoints: new Set(Array.from(text, (character) => character.codePointAt(0) ?? 0)),
  }) as unknown as ICanvasExportContext;

const exportNode = (id: string, x: number, y: number, label: string): HTMLDivElement => {
  const wrapper = document.createElement('div');
  wrapper.className = 'react-flow__node';
  wrapper.dataset.id = id;
  wrapper.style.transform = `translate(${x}px, ${y}px)`;
  const source = document.createElement('div');
  source.dataset.exportNode = '';
  Object.assign(source.style, {
    backgroundColor: 'rgb(255, 255, 255)',
    backgroundImage: `linear-gradient(${WASH_COLOR}, ${WASH_COLOR})`,
    borderTopWidth: '1px',
    borderTopColor: 'rgb(200, 200, 200)',
    borderTopLeftRadius: '12px',
    boxShadow: SHADOW,
    overflow: 'hidden',
  });
  const handle = document.createElement('div');
  handle.className = 'react-flow__handle';
  const omitted = document.createElement('button');
  omitted.dataset.exportOmit = '';
  omitted.textContent = OMITTED_LABEL;
  const hidden = document.createElement('span');
  hidden.style.display = 'none';
  hidden.textContent = HIDDEN_LABEL;
  const paragraph = document.createElement('p');
  paragraph.textContent = label;
  paragraph.style.color = 'rgb(20, 20, 20)';
  paragraph.style.textTransform = 'uppercase';
  const icon = svgChild('svg');
  icon.setAttribute('class', 'h-3 w-3');
  const glyph = svgChild('path');
  glyph.style.fill = ICON_FILL;
  icon.append(glyph);
  const textarea = document.createElement('textarea');
  textarea.value = DRAFT_LABEL;
  source.append(handle, omitted, hidden, paragraph, icon, textarea);
  wrapper.append(source);

  return wrapper;
};

const exportEdge = (id: string, source: string, target: string, bidirectional: boolean): SVGElement => {
  const group = svgChild('g');
  group.dataset.exportEdge = id;
  group.dataset.source = source;
  group.dataset.target = target;
  group.dataset.sourceHandle = 'right';
  group.dataset.targetHandle = 'left';
  group.dataset.tone = 'valid';
  if (bidirectional) group.dataset.bidirectional = 'true';
  const path = svgChild('path');
  path.setAttribute('class', 'react-flow__edge-path');
  path.style.stroke = EDGE_STROKE;
  path.style.strokeWidth = '1.75';
  group.append(path);

  return group;
};

export const buildExportCanvas = (targetX = 400): HTMLElement => {
  const root = document.createElement('div');
  const edges = svgChild('svg');
  edges.append(exportEdge('e1', 'source', 'target', false), exportEdge('e2', 'target', 'source', true));
  root.append(exportNode('source', 40, 80, SOURCE_LABEL), exportNode('target', targetX, 80, TARGET_LABEL), edges);
  document.body.append(root);

  return root;
};

export const buildOrphanEdgeCanvas = (): HTMLElement => {
  const root = buildExportCanvas();
  root.querySelector<SVGElement>('[data-export-edge="e1"]')?.setAttribute('data-target', 'missing');

  return root;
};

export const buildUnreadyNodeCanvas = (): HTMLElement => {
  const root = buildExportCanvas();
  root.querySelector(EXPORT_NODE_SELECTOR)?.remove();

  return root;
};

export const buildUnsidedEdgeCanvas = (): HTMLElement => {
  const root = buildExportCanvas();
  const edge = root.querySelector<SVGElement>('[data-export-edge="e1"]');
  delete edge?.dataset.sourceHandle;
  delete edge?.dataset.targetHandle;

  return root;
};

export const buildPlaceholderCanvas = (): HTMLElement => {
  const root = buildExportCanvas();
  root.querySelectorAll('textarea').forEach((textarea) => {
    textarea.value = '';
    textarea.placeholder = PLACEHOLDER_LABEL;
  });

  return root;
};

export const buildLabelledCanvas = (label: string): HTMLElement => {
  const root = buildExportCanvas();
  const paragraph = root.querySelector('[data-id="source"] p');
  if (paragraph) paragraph.textContent = label;

  return root;
};

export const buildMultilineCanvas = (): HTMLElement => buildLabelledCanvas(MULTILINE_LABEL);

const FONT_FAMILY = 'Onest';
const OTHER_FAMILY = 'JetBrains Mono';
const FONT_BASE = 'https://app.test/fonts/';
const LATIN_SOURCE = 'latin.woff2';
const CYRILLIC_SOURCE = 'cyrillic.woff2';
const INLINE_SOURCE = 'data:font/woff2;base64,AAAA';
const FONT_BYTES = 'font';

export const FONT_FIXTURE = {
  family: FONT_FAMILY,
  otherFamily: OTHER_FAMILY,
  latinUrl: `${FONT_BASE}${LATIN_SOURCE}`,
  cyrillicUrl: `${FONT_BASE}${CYRILLIC_SOURCE}`,
  cyrillicSource: CYRILLIC_SOURCE,
  inlineSource: INLINE_SOURCE,
  dataUrl: 'data:font/woff2;base64,Zm9udA==',
} as const;

const fontFace = (family: string, source: string, unicodeRange: string): CSSFontFaceRule => {
  const declarations: Record<string, string> = {
    'font-family': `"${family}"`,
    src: `url("${source}") format("woff2")`,
    'unicode-range': unicodeRange,
  };

  return Object.create(CSSFontFaceRule.prototype, {
    cssText: {
      value: `@font-face { font-family: "${family}"; src: url("${source}") format("woff2"); unicode-range: ${unicodeRange}; }`,
    },
    style: { value: { getPropertyValue: (property: string) => declarations[property] ?? '' } },
  }) as CSSFontFaceRule;
};

export const fontResponse = (ok: boolean): Response =>
  ({ ok, blob: async () => new Blob([FONT_BYTES], { type: 'font/woff2' }) }) as unknown as Response;

const importRule = (styleSheet: unknown): CSSImportRule =>
  Object.create(CSSImportRule.prototype, { styleSheet: { value: styleSheet } }) as CSSImportRule;

const CROSS_ORIGIN_SHEET = {
  href: 'https://cdn.test/theme.css',
  get cssRules(): CSSRule[] {
    throw new DOMException('Cannot access rules', 'SecurityError');
  },
};

export const installFontFaces = (): void => {
  const latinSheet = {
    href: `${FONT_BASE}latin.css`,
    cssRules: [fontFace(FONT_FAMILY, LATIN_SOURCE, 'U+0000-00FF')],
  };
  const sheet = {
    href: `${FONT_BASE}fonts.css`,
    cssRules: [
      importRule(latinSheet),
      fontFace(FONT_FAMILY, INLINE_SOURCE, 'U+0020'),
      fontFace(FONT_FAMILY, CYRILLIC_SOURCE, 'U+0400-045F'),
      fontFace(OTHER_FAMILY, 'mono.woff2', ''),
    ],
  };
  Object.defineProperty(document, 'styleSheets', { configurable: true, value: [CROSS_ORIGIN_SHEET, sheet] });
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => fontResponse(true)),
  );
};
