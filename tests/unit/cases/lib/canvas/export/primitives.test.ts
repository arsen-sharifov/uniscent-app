import { beforeEach, describe, expect, test, vi, type Mock } from 'vitest';

import type { ICanvasExportContext } from '@interfaces';

import { NESTED_CSS_LIST, OKLCH_COLOR, SRGB_WASH_COLOR } from '@mocks/canvasExport';
import { colorContext, definitionContext, scratchContext } from '@mocks/canvasExportDom';
import {
  defineOnce,
  parseCssColor,
  resolveExportColor,
  splitCssList,
  svgElement,
  toXmlText,
} from '@/lib/canvas/export';

const SAMPLED_COLOR = 'rgba(250, 250, 245, 1)';

let context: ICanvasExportContext;

describe('splitCssList', () => {
  describe('GIVEN a comma-separated list whose items contain nested function calls', () => {
    describe('WHEN the list is split', () => {
      test('THEN only top-level commas separate items and the items are trimmed', () => {
        expect(splitCssList(NESTED_CSS_LIST)).toEqual([
          'color-mix(in srgb, rgb(220, 38, 38) 12%, transparent)',
          'rgba(0, 0, 0, 0.5)',
          '4px',
        ]);
      });
    });
  });

  describe('GIVEN an empty value', () => {
    describe('WHEN the list is split', () => {
      test('THEN it yields no items', () => {
        expect(splitCssList('')).toEqual([]);
      });
    });
  });
});

describe('toXmlText', () => {
  describe('GIVEN text with control characters, a lone surrogate and noncharacters', () => {
    describe('WHEN it is prepared for XML', () => {
      test('THEN only the characters XML allows survive', () => {
        const text = [
          'a',
          String.fromCodePoint(0x00),
          'b',
          String.fromCodePoint(0xd8_00),
          'c',
          String.fromCodePoint(0xff_fe),
        ];

        expect(toXmlText(text.join(''))).toBe('abc');
      });
    });
  });

  describe('GIVEN text with whitespace controls and astral characters', () => {
    describe('WHEN it is prepared for XML', () => {
      test('THEN it passes through untouched', () => {
        const text = ['tab', 'line', 'return', 'emoji'].join(String.fromCodePoint(0x09, 0x0a, 0x0d, 0x1_f6_00));

        expect(toXmlText(text)).toBe(text);
      });
    });
  });
});

describe('parseCssColor', () => {
  describe('GIVEN a computed colour already expressed in the rgb family', () => {
    describe('WHEN it is parsed', () => {
      test('THEN it passes through untouched', () => {
        expect(parseCssColor('rgb(220, 38, 38)')).toBe('rgb(220, 38, 38)');
        expect(parseCssColor('rgba(0, 0, 0, 0.5)')).toBe('rgba(0, 0, 0, 0.5)');
      });
    });
  });

  describe('GIVEN a computed colour in the srgb colour function', () => {
    describe('WHEN it is parsed', () => {
      test('THEN the channels are scaled to eight bits and the alpha is kept', () => {
        expect(parseCssColor(SRGB_WASH_COLOR)).toBe('rgba(220, 38, 38, 0.07)');
        expect(parseCssColor('color(srgb 1 1 1)')).toBe('rgba(255, 255, 255, 1)');
      });
    });
  });

  describe('GIVEN a colour in another space', () => {
    describe('WHEN it is parsed', () => {
      test('THEN nothing is returned so the caller can sample it', () => {
        expect(parseCssColor(OKLCH_COLOR)).toBeUndefined();
      });
    });
  });
});

describe('resolveExportColor', () => {
  beforeEach(() => {
    context = colorContext();
    vi.spyOn(scratchContext, 'getImageData');
  });

  describe('GIVEN a colour the browser computes in the rgb family', () => {
    describe('WHEN it is resolved', () => {
      test('THEN the computed value is used without touching the scratch canvas', () => {
        expect(resolveExportColor(context, 'rgb(1, 2, 3)')).toBe('rgb(1, 2, 3)');
        expect(scratchContext.getImageData).not.toHaveBeenCalled();
      });
    });
  });

  describe('GIVEN a colour the browser cannot express in the rgb family', () => {
    let first: string;
    let second: string;

    beforeEach(() => {
      first = resolveExportColor(context, OKLCH_COLOR);
      second = resolveExportColor(context, OKLCH_COLOR);
    });

    describe('WHEN it is resolved twice', () => {
      test('THEN it is sampled through the scratch canvas once and served from the cache afterwards', () => {
        expect(first).toBe(SAMPLED_COLOR);
        expect(second).toBe(SAMPLED_COLOR);
        expect(scratchContext.getImageData).toHaveBeenCalledTimes(1);
        expect(context.colors.get(OKLCH_COLOR)).toBe(SAMPLED_COLOR);
      });
    });
  });
});

describe('defineOnce', () => {
  let build: Mock<(id: string) => SVGElement>;
  let references: string[];

  beforeEach(() => {
    context = definitionContext();
    build = vi.fn((id: string) => svgElement('marker', { id }));
    references = [
      defineOnce(context, 'arrow', 'red', build),
      defineOnce(context, 'arrow', 'red', build),
      defineOnce(context, 'arrow', 'blue', build),
    ];
  });

  describe('GIVEN two definitions with the same key and one with another', () => {
    describe('WHEN they are defined', () => {
      test('THEN the repeated key reuses its reference and only distinct keys reach the defs', () => {
        expect(references).toEqual(['url(#arrow-0)', 'url(#arrow-0)', 'url(#arrow-1)']);
        expect(build).toHaveBeenCalledTimes(2);
        expect(Array.from(context.defs.children, (child) => child.id)).toEqual(['arrow-0', 'arrow-1']);
      });
    });
  });
});
