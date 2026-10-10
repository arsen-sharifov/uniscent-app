'use client';

import type { ICanvasExportContext, ICanvasExportImage, ICanvasExportNode, IRect } from '@interfaces';

import { renderExportElement } from './box';
import {
  EXPORT_EDGE_ID_ATTRIBUTE,
  EXPORT_MARK_FONT_SIZE,
  EXPORT_MARK_HEIGHT,
  EXPORT_MARK_LINE_HEIGHT,
  EXPORT_MARK_TEXT,
  EXPORT_MIN_WIDTH,
  EXPORT_NODE_ID_ATTRIBUTE,
  EXPORT_PADDING,
} from './consts';
import { renderExportEdges } from './edges';
import { embedExportFonts } from './fonts';
import { getCanvasContext, resolveExportColor, setSvgAttributes, svgElement, toXmlText } from './primitives';
import { cloneExportNodes, createExportStage } from './stage';

export const getExportBounds = (rects: IRect[]): IRect => {
  if (rects.length === 0) throw new Error('The canvas is empty');
  const left = Math.min(...rects.map((rect) => rect.x));
  const top = Math.min(...rects.map((rect) => rect.y));
  const right = Math.max(...rects.map((rect) => rect.x + rect.width));
  const bottom = Math.max(...rects.map((rect) => rect.y + rect.height));

  return { x: left, y: top, width: right - left, height: bottom - top };
};

const createExportContext = (stage: HTMLElement): ICanvasExportContext => ({
  stage,
  origin: stage.getBoundingClientRect(),
  defs: svgElement('defs'),
  scratch: getCanvasContext(document.createElement('canvas'), { willReadFrequently: true }),
  fonts: new Set(),
  codePoints: new Set(),
  colors: new Map(),
  definitions: new Map(),
});

const renderExportNode = (node: ICanvasExportNode, context: ICanvasExportContext): SVGGElement => {
  const group = renderExportElement(node.element, context);
  group.setAttribute(EXPORT_NODE_ID_ATTRIBUTE, node.id);

  return group;
};

const renderExportGraph = (
  root: HTMLElement,
  nodes: ICanvasExportNode[],
  context: ICanvasExportContext,
): SVGGElement => {
  const graph = svgElement('g', { id: 'graph' });
  graph.append(renderExportEdges(root, nodes, context), ...nodes.map((node) => renderExportNode(node, context)));

  return graph;
};

const renderProductMark = (context: ICanvasExportContext, frame: IRect): SVGGElement => {
  const mark = document.createElement('span');
  mark.className = 'font-grotesk font-extrabold tracking-[-0.02em]';
  mark.textContent = EXPORT_MARK_TEXT;
  Object.assign(mark.style, {
    position: 'absolute',
    left: '0',
    top: '0',
    fontSize: EXPORT_MARK_FONT_SIZE,
    lineHeight: EXPORT_MARK_LINE_HEIGHT,
    color: 'var(--text-muted)',
  });
  context.stage.append(mark);
  const group = renderExportElement(mark, context);
  group.setAttribute('id', 'product-mark');
  group.setAttribute(
    'transform',
    `translate(${frame.width - EXPORT_PADDING - mark.offsetWidth} ${frame.height - EXPORT_PADDING})`,
  );

  return group;
};

const mountExportSvg = (
  threadName: string,
  graph: SVGGElement,
  { stage, defs }: ICanvasExportContext,
): SVGSVGElement => {
  const svg = svgElement('svg', { version: '1.1' });
  const title = svgElement('title');
  title.textContent = toXmlText(threadName);
  svg.append(title, defs, graph);
  stage.append(svg);

  return svg;
};

const getExportFrame = (nodes: ICanvasExportNode[], graph: SVGGElement): IRect => {
  const edges = Array.from(graph.querySelectorAll<SVGPathElement>(`[${EXPORT_EDGE_ID_ATTRIBUTE}]`), (path) =>
    path.getBBox(),
  );
  const bounds = getExportBounds([...nodes, ...edges]);

  return {
    x: bounds.x - EXPORT_PADDING,
    y: bounds.y - EXPORT_PADDING,
    width: Math.ceil(Math.max(EXPORT_MIN_WIDTH, bounds.width) + EXPORT_PADDING * 2),
    height: Math.ceil(bounds.height + EXPORT_PADDING * 2 + EXPORT_MARK_HEIGHT),
  };
};

const frameExportSvg = (svg: SVGSVGElement, graph: SVGGElement, frame: IRect, context: ICanvasExportContext): void => {
  setSvgAttributes(svg, { width: frame.width, height: frame.height, viewBox: `0 0 ${frame.width} ${frame.height}` });
  const background = svgElement('rect', {
    width: frame.width,
    height: frame.height,
    fill: resolveExportColor(context, 'var(--app-bg)'),
  });
  graph.before(background);
  graph.setAttribute('transform', `translate(${-frame.x} ${-frame.y})`);
  svg.append(renderProductMark(context, frame));
};

export const createCanvasSvg = async (root: HTMLElement, threadName: string): Promise<ICanvasExportImage> => {
  await document.fonts.ready;
  if (!root.isConnected) throw new Error('The active canvas changed');
  const stage = createExportStage(root);

  try {
    const nodes = cloneExportNodes(root, stage);
    const context = createExportContext(stage);
    const graph = renderExportGraph(root, nodes, context);
    const svg = mountExportSvg(threadName, graph, context);
    const frame = getExportFrame(nodes, graph);
    frameExportSvg(svg, graph, frame, context);
    context.defs.append(await embedExportFonts(context));

    return { svg: new XMLSerializer().serializeToString(svg), width: frame.width, height: frame.height };
  } finally {
    stage.remove();
  }
};
