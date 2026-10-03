import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import type { ICanvasExportImage } from '@interfaces';

import { EXPORT_RECTS } from '@mocks/canvasExport';
import {
  EXPORT_FIXTURE,
  buildExportCanvas,
  buildLabelledCanvas,
  buildMultilineCanvas,
  buildOrphanEdgeCanvas,
  buildPlaceholderCanvas,
  buildUnreadyNodeCanvas,
  buildUnsidedEdgeCanvas,
  installExportEnvironment,
} from '@mocks/canvasExportDom';
import { EXPORT_MARK_TEXT, createCanvasSvg, getExportBounds } from '@/lib/canvas/export';

const STAGE_SELECTOR = '[data-canvas-export-stage]';

let root: HTMLElement;
let image: ICanvasExportImage;

const parseSvg = (svg: string): Document => new DOMParser().parseFromString(svg, 'image/svg+xml');

const edgePath = (id: string, start: string) => `data-edge-id="${id}" data-tone="valid" d="${start}`;

beforeEach(() => {
  installExportEnvironment();
});

afterEach(() => {
  root?.remove();
});

describe('getExportBounds', () => {
  describe('GIVEN nodes at negative and distant coordinates and an edge bending beyond them', () => {
    describe('WHEN the whole graph is measured', () => {
      test('THEN it includes every node and the complete curve', () => {
        expect(getExportBounds(EXPORT_RECTS)).toEqual({ x: -560, y: -230, width: 2740, height: 1530 });
      });
    });
  });

  describe('GIVEN an empty canvas', () => {
    describe('WHEN export bounds are requested', () => {
      test('THEN it refuses to create a meaningless image', () => {
        expect(() => getExportBounds([])).toThrow('The canvas is empty');
      });
    });
  });
});

describe('createCanvasSvg', () => {
  describe('GIVEN two connected nodes with helpers, an icon, an open textarea and a wash', () => {
    beforeEach(async () => {
      root = buildExportCanvas();
      image = await createCanvasSvg(root, EXPORT_FIXTURE.thread);
    });

    describe('WHEN the graph is rendered to SVG', () => {
      test('THEN the frame wraps both nodes with padding and room for the product mark', () => {
        expect(image.width).toBe(EXPORT_FIXTURE.frame.width);
        expect(image.height).toBe(EXPORT_FIXTURE.frame.height);
        expect(image.svg).toContain(`<title>${EXPORT_FIXTURE.thread}</title>`);
        expect(image.svg).toContain(`viewBox="0 0 ${EXPORT_FIXTURE.frame.width} ${EXPORT_FIXTURE.frame.height}"`);
      });

      test('THEN every node becomes a group with its transformed text while helpers stay out', () => {
        expect(image.svg).toContain('data-node-id="source"');
        expect(image.svg).toContain('data-node-id="target"');
        expect(image.svg).toContain(EXPORT_FIXTURE.sourceLabel.toUpperCase());
        expect(image.svg).toContain(EXPORT_FIXTURE.draftLabel);
        expect(image.svg).not.toContain(EXPORT_FIXTURE.omittedLabel);
        expect(image.svg).not.toContain(EXPORT_FIXTURE.hiddenLabel);
        expect(image.svg).not.toContain('react-flow__handle');
      });

      test('THEN shared definitions are registered once and referenced by every user', () => {
        expect(image.svg.match(/<marker /g)).toHaveLength(1);
        expect(image.svg.match(/<filter /g)).toHaveLength(1);
        expect(image.svg.match(/marker-end="url\(#arrow-0\)"/g)).toHaveLength(2);
        expect(image.svg).toContain('marker-start="url(#arrow-0)"');
        expect(image.svg).toContain('<clipPath ');
        expect(image.svg).toContain(`stroke="${EXPORT_FIXTURE.edgeStroke}"`);
      });

      test('THEN the wash, the icon and the product mark are painted and the stage is torn down', () => {
        expect(image.svg).toContain(`fill="${EXPORT_FIXTURE.washColor}"`);
        expect(image.svg).toContain(`fill="${EXPORT_FIXTURE.background}"`);
        expect(image.svg).toContain('id="product-mark"');
        expect(image.svg).toContain(EXPORT_MARK_TEXT);
        expect(image.svg.match(/<svg /g)).toHaveLength(3);
        expect(root.querySelector(STAGE_SELECTOR)).toBeNull();
      });

      test('THEN icons carry their computed paint as attributes instead of classes', () => {
        expect(image.svg).toContain(`fill="${EXPORT_FIXTURE.iconFill}"`);
        expect(image.svg).not.toContain('class="h-3 w-3"');
      });

      test('THEN edges leave the declared handle sides', () => {
        expect(image.svg).toContain(edgePath('e1', EXPORT_FIXTURE.sidedEdgeStart));
      });
    });
  });

  describe('GIVEN a label that spans two lines', () => {
    beforeEach(async () => {
      root = buildMultilineCanvas();
      image = await createCanvasSvg(root, EXPORT_FIXTURE.thread);
    });

    describe('WHEN the graph is rendered to SVG', () => {
      test('THEN every line becomes its own text run without the line break', () => {
        const [first = '', second = ''] = EXPORT_FIXTURE.multilineLabel.split('\n');

        expect(image.svg).toContain(`>${first.toUpperCase()}</text>`);
        expect(image.svg).toContain(`>${second.toUpperCase()}</text>`);
        expect(image.svg).not.toContain('\n');
      });
    });
  });

  describe('GIVEN a label and a thread name that carry markup', () => {
    beforeEach(async () => {
      root = buildLabelledCanvas(EXPORT_FIXTURE.markupLabel);
      image = await createCanvasSvg(root, EXPORT_FIXTURE.markupThread);
    });

    describe('WHEN the exported file is opened as SVG', () => {
      test('THEN the markup stays literal text and never becomes elements', () => {
        const document = parseSvg(image.svg);

        expect(document.querySelector('parsererror')).toBeNull();
        expect(document.getElementsByTagName('script')).toHaveLength(0);
        expect(document.getElementsByTagName('a')).toHaveLength(0);
        expect(document.querySelector('title')?.textContent).toBe(EXPORT_FIXTURE.markupThread);
        expect(document.querySelector('[data-node-id="source"]')?.textContent).toContain(
          EXPORT_FIXTURE.markupLabel.toUpperCase(),
        );
      });
    });
  });

  describe('GIVEN a label and a thread name with characters XML forbids', () => {
    beforeEach(async () => {
      root = buildLabelledCanvas(EXPORT_FIXTURE.controlLabel);
      image = await createCanvasSvg(root, EXPORT_FIXTURE.controlLabel);
    });

    describe('WHEN the exported file is opened as SVG', () => {
      test('THEN it still parses and keeps the readable text', () => {
        const document = parseSvg(image.svg);

        expect(document.querySelector('parsererror')).toBeNull();
        expect(document.querySelector('title')?.textContent).toBe(EXPORT_FIXTURE.controlSafeLabel);
        expect(document.querySelector('[data-node-id="source"]')?.textContent).toContain(
          EXPORT_FIXTURE.controlSafeLabel.toUpperCase(),
        );
      });
    });
  });

  describe('GIVEN a node whose label editor is open and empty', () => {
    beforeEach(async () => {
      root = buildPlaceholderCanvas();
      image = await createCanvasSvg(root, EXPORT_FIXTURE.thread);
    });

    describe('WHEN the graph is rendered to SVG', () => {
      test('THEN the placeholder stands in for the missing label', () => {
        expect(image.svg).toContain(EXPORT_FIXTURE.placeholderLabel);
        expect(image.svg).not.toContain(EXPORT_FIXTURE.draftLabel);
        expect(image.svg).not.toContain('<textarea');
      });
    });
  });

  describe('GIVEN an edge without handle sides in its markup', () => {
    beforeEach(async () => {
      root = buildUnsidedEdgeCanvas();
      image = await createCanvasSvg(root, EXPORT_FIXTURE.thread);
    });

    describe('WHEN the graph is rendered to SVG', () => {
      test('THEN it falls back to leaving the source bottom for the target top', () => {
        expect(image.svg).toContain(edgePath('e1', EXPORT_FIXTURE.unsidedEdgeStart));
      });
    });
  });

  describe('GIVEN an edge that points at a node missing from the canvas', () => {
    beforeEach(() => {
      root = buildOrphanEdgeCanvas();
    });

    describe('WHEN the graph is rendered to SVG', () => {
      test('THEN the export refuses instead of drawing a dangling edge', async () => {
        await expect(createCanvasSvg(root, EXPORT_FIXTURE.thread)).rejects.toThrow('A canvas edge is not ready');
        expect(root.querySelector(STAGE_SELECTOR)).toBeNull();
      });
    });
  });

  describe('GIVEN a node wrapper whose card has not mounted yet', () => {
    beforeEach(() => {
      root = buildUnreadyNodeCanvas();
    });

    describe('WHEN the graph is rendered to SVG', () => {
      test('THEN the export refuses', async () => {
        await expect(createCanvasSvg(root, EXPORT_FIXTURE.thread)).rejects.toThrow('A canvas node is not ready');
      });
    });
  });

  describe('GIVEN a canvas that left the document', () => {
    beforeEach(() => {
      root = buildExportCanvas();
      root.remove();
    });

    describe('WHEN the graph is rendered to SVG', () => {
      test('THEN the export refuses', async () => {
        await expect(createCanvasSvg(root, EXPORT_FIXTURE.thread)).rejects.toThrow('The active canvas changed');
      });
    });
  });
});
