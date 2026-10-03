'use client';

import type { ICanvasExportContext, IExportTextLine } from '@interfaces';

import { svgElement, toXmlText } from './primitives';

const GRAPHEME_SEGMENTER = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

const transformText = (text: string, transform: string): string => {
  if (transform === 'uppercase') return text.toLocaleUpperCase();
  if (transform === 'lowercase') return text.toLocaleLowerCase();

  return text;
};

const measureGlyph = (range: Range, node: Text, { segment, index }: Intl.SegmentData): IExportTextLine[] => {
  range.setStart(node, index);
  range.setEnd(node, index + segment.length);

  const { x, y, width, height } = range.getBoundingClientRect();
  if (segment === '\n' || width === 0) return [];

  return [{ text: segment, x, y, width, height }];
};

const isOnSameLine = (line: IExportTextLine, glyph: IExportTextLine): boolean => Math.abs(line.y - glyph.y) < 1;

const appendGlyph = (line: IExportTextLine, glyph: IExportTextLine): IExportTextLine => {
  const x = Math.min(line.x, glyph.x);
  const right = Math.max(line.x + line.width, glyph.x + glyph.width);

  return { ...line, text: line.text + glyph.text, x, width: right - x };
};

const measureLines = (node: Text): IExportTextLine[] => {
  const range = document.createRange();
  const glyphs = Array.from(GRAPHEME_SEGMENTER.segment(node.data)).flatMap((segment) =>
    measureGlyph(range, node, segment),
  );

  return glyphs.reduce<IExportTextLine[]>((lines, glyph) => {
    const line = lines.at(-1);

    return line && isOnSameLine(line, glyph) ? [...lines.slice(0, -1), appendGlyph(line, glyph)] : [...lines, glyph];
  }, []);
};

const collectGlyphs = (text: string, { fonts, codePoints }: ICanvasExportContext, fontFamily: string): void => {
  fonts.add(fontFamily);
  Array.from(text, (character) => character.codePointAt(0) ?? 0).forEach((codePoint) => codePoints.add(codePoint));
};

export const renderExportText = (
  node: Text,
  style: CSSStyleDeclaration,
  context: ICanvasExportContext,
): SVGTextElement[] => {
  if (!node.data.trim()) return [];

  const { origin, scratch } = context;
  scratch.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  const { fontBoundingBoxAscent: ascent, fontBoundingBoxDescent: descent } = scratch.measureText(node.data);

  return measureLines(node).map((line) => {
    const text = toXmlText(transformText(line.text, style.textTransform));
    collectGlyphs(text, context, style.fontFamily);

    const element = svgElement('text', {
      x: line.x - origin.x,
      y: line.y - origin.y + (line.height - ascent - descent) / 2 + ascent,
      fill: style.color,
      'font-family': style.fontFamily,
      'font-size': style.fontSize,
      'font-weight': style.fontWeight,
      'font-style': style.fontStyle,
      'letter-spacing': style.letterSpacing,
      'xml:space': 'preserve',
      textLength: line.width,
      lengthAdjust: 'spacingAndGlyphs',
    });
    element.textContent = text;

    return element;
  });
};
