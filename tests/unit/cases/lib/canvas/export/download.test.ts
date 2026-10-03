import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import type { TCanvasExportOutcome } from '@interfaces';

import { BIDI_SAFE_FILENAME, BIDI_THREAD_NAME, LONG_THREAD_NAME, UNICODE_THREAD_NAME } from '@mocks/canvasExport';
import {
  EXPORT_BLOB_URL,
  EXPORT_FIXTURE,
  breakImageLoading,
  buildExportCanvas,
  installExportEnvironment,
} from '@mocks/canvasExportDom';
import { exportCanvas, getExportFilename, getRasterDimensions } from '@/lib/canvas/export';

const FAR_TARGET_X = 20_000;

let root: HTMLElement;
let outcome: TCanvasExportOutcome;
let downloads: string[];
let blobs: Blob[];

const encodeAsRequested = (callback: BlobCallback, type?: string) => callback(new Blob(['image'], { type }));
const encodeNothing = (callback: BlobCallback) => callback(null);
const encodeAsPng = (callback: BlobCallback) => callback(new Blob(['image'], { type: 'image/png' }));

beforeEach(() => {
  installExportEnvironment();
  downloads = [];
  blobs = [];
  vi.mocked(URL.createObjectURL).mockImplementation((blob) => {
    blobs.push(blob as Blob);

    return EXPORT_BLOB_URL;
  });
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    downloads.push(this.download);
  });
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(encodeAsRequested);
});

afterEach(() => {
  root?.remove();
});

describe('getExportFilename', () => {
  describe('GIVEN a multilingual thread name with forbidden filename characters', () => {
    describe('WHEN the export filename is created', () => {
      test('THEN it preserves Unicode and replaces path separators', () => {
        expect(getExportFilename(UNICODE_THREAD_NAME, 'svg')).toBe('Рішення- café - équipe-.svg');
      });
    });
  });

  describe('GIVEN a Windows device name or an empty name', () => {
    describe('WHEN the export filename is created', () => {
      test('THEN it produces a usable filename', () => {
        expect(getExportFilename('CON', 'png')).toBe('_CON.png');
        expect(getExportFilename('LPT1.notes', 'jpg')).toBe('_LPT1.notes.jpg');
        expect(getExportFilename(' ... ', 'svg')).toBe('Uniscept.svg');
      });
    });
  });

  describe('GIVEN a thread name with bidi control characters', () => {
    describe('WHEN the export filename is created', () => {
      test('THEN the controls are removed so the name cannot disguise its extension', () => {
        expect(getExportFilename(BIDI_THREAD_NAME, 'svg')).toBe(BIDI_SAFE_FILENAME);
      });
    });
  });

  describe('GIVEN a long thread name', () => {
    describe('WHEN the export filename is created', () => {
      test('THEN it leaves room for the extension', () => {
        expect(getExportFilename(LONG_THREAD_NAME, 'png')).toHaveLength(124);
        expect(getExportFilename(LONG_THREAD_NAME, 'png')).toMatch(/\.png$/);
      });
    });
  });
});

describe('getRasterDimensions', () => {
  describe('GIVEN a typical graph', () => {
    describe('WHEN raster dimensions are computed', () => {
      test('THEN it uses three pixels per canvas pixel', () => {
        expect(getRasterDimensions(1200, 800)).toEqual({ width: 3600, height: 2400 });
      });
    });
  });

  describe('GIVEN a large graph that exceeds the preferred pixel budget', () => {
    describe('WHEN raster dimensions are computed', () => {
      test('THEN it preserves at least double resolution within the memory limit', () => {
        expect(getRasterDimensions(4000, 4000)).toEqual({ width: 8192, height: 8192 });
      });
    });
  });

  describe('GIVEN a graph too large for a readable bitmap', () => {
    describe('WHEN raster dimensions are computed', () => {
      test('THEN it yields no dimensions so the caller can suggest a vector export', () => {
        expect(getRasterDimensions(9000, 1000)).toBeNull();
        expect(getRasterDimensions(5000, 5000)).toBeNull();
      });
    });
  });
});

describe('exportCanvas', () => {
  describe('GIVEN a small connected graph', () => {
    beforeEach(() => {
      root = buildExportCanvas();
    });

    describe('WHEN it is exported as SVG', () => {
      beforeEach(async () => {
        outcome = await exportCanvas(root, EXPORT_FIXTURE.thread, 'svg');
      });

      test('THEN the vector file downloads under the thread name', () => {
        expect(outcome).toBe('downloaded');
        expect(downloads).toEqual([`${EXPORT_FIXTURE.thread}.svg`]);
        expect(blobs.map((blob) => blob.type)).toEqual(['image/svg+xml']);
      });
    });

    describe('WHEN it is exported as PNG', () => {
      beforeEach(async () => {
        outcome = await exportCanvas(root, EXPORT_FIXTURE.thread, 'png');
      });

      test('THEN the rasterised file downloads and the intermediate SVG URL is released', () => {
        expect(outcome).toBe('downloaded');
        expect(downloads).toEqual([`${EXPORT_FIXTURE.thread}.png`]);
        expect(blobs.map((blob) => blob.type)).toEqual(['image/svg+xml', 'image/png']);
        expect(URL.revokeObjectURL).toHaveBeenCalledWith(EXPORT_BLOB_URL);
      });
    });

    describe('WHEN it is exported as JPG', () => {
      beforeEach(async () => {
        outcome = await exportCanvas(root, EXPORT_FIXTURE.thread, 'jpg');
      });

      test('THEN the bitmap is encoded as JPEG under the jpg extension', () => {
        expect(outcome).toBe('downloaded');
        expect(downloads).toEqual([`${EXPORT_FIXTURE.thread}.jpg`]);
        expect(blobs.map((blob) => blob.type)).toEqual(['image/svg+xml', 'image/jpeg']);
      });
    });

    describe('WHEN the browser cannot encode the bitmap', () => {
      beforeEach(async () => {
        vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(encodeNothing);
        outcome = await exportCanvas(root, EXPORT_FIXTURE.thread, 'jpg');
      });

      test('THEN the export reports the graph as too large and downloads nothing', () => {
        expect(outcome).toBe('too-large');
        expect(downloads).toEqual([]);
      });
    });

    describe('WHEN the browser silently falls back to another image type', () => {
      beforeEach(() => {
        vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(encodeAsPng);
      });

      test('THEN the export fails instead of shipping a mislabelled file', async () => {
        await expect(exportCanvas(root, EXPORT_FIXTURE.thread, 'jpg')).rejects.toThrow('Could not encode the image');
        expect(downloads).toEqual([]);
        expect(URL.revokeObjectURL).toHaveBeenCalledWith(EXPORT_BLOB_URL);
      });
    });

    describe('WHEN the intermediate SVG cannot be decoded as an image', () => {
      beforeEach(() => {
        breakImageLoading();
      });

      test('THEN the export fails and still releases the SVG URL', async () => {
        await expect(exportCanvas(root, EXPORT_FIXTURE.thread, 'png')).rejects.toThrow(
          'Could not load the export image',
        );
        expect(HTMLCanvasElement.prototype.toBlob).not.toHaveBeenCalled();
        expect(URL.revokeObjectURL).toHaveBeenCalledWith(EXPORT_BLOB_URL);
      });
    });
  });

  describe('GIVEN a graph too wide for a sharp bitmap', () => {
    beforeEach(async () => {
      root = buildExportCanvas(FAR_TARGET_X);
      outcome = await exportCanvas(root, EXPORT_FIXTURE.thread, 'png');
    });

    describe('WHEN it is exported as PNG', () => {
      test('THEN the export stops before rasterising and reports the graph as too large', () => {
        expect(outcome).toBe('too-large');
        expect(downloads).toEqual([]);
        expect(HTMLCanvasElement.prototype.toBlob).not.toHaveBeenCalled();
      });
    });
  });
});
