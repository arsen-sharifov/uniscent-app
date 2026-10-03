import { readFile } from 'node:fs/promises';

import { COPY, EXPORT_THREAD_NAME, JPEG_SIGNATURE, PNG_SIGNATURE } from '../../consts';
import { expect, test } from '../../fixtures';
import { downloadExport, seedEdge, seedNodes, seedThread, waitForCanvas } from '../../utils';

test.describe('canvas export', () => {
  test.describe('GIVEN a graph whose far node sits outside the visible viewport', () => {
    test.beforeEach(async ({ page, workspace, account }) => {
      const thread = await seedThread(workspace.id, EXPORT_THREAD_NAME, account.id, { question: 'Complete?' });
      const [origin, outskirts] = await seedNodes(thread.id, account.id, [
        { label: 'Origin', x: 460, y: 440 },
        { label: 'Outskirts', x: 1900, y: 1300 },
      ]);
      await seedEdge(thread.id, origin ?? '', outskirts ?? '');
      await page.goto(`/platform/${workspace.id}/${thread.id}`);
      await waitForCanvas(page);
    });

    test.describe('WHEN the toolbar exports it as SVG', () => {
      let filename: string;
      let markup: string;

      test.beforeEach(async ({ page }) => {
        const download = await downloadExport(page, COPY.platform.canvas.export.formats.svg);
        filename = download.suggestedFilename();
        markup = await readFile(await download.path(), 'utf8');
      });

      test('THEN the whole graph ships as named vector artwork carrying the product mark', () => {
        expect(filename).toBe(`${EXPORT_THREAD_NAME}.svg`);
        expect(markup).toContain('Origin');
        expect(markup).toContain('Outskirts');
        expect(markup).toContain('data-edge-id');
        expect(markup).toContain('<path');
        expect(markup).toContain('@font-face');
        expect(markup).not.toContain('<image');
        expect(markup).not.toContain('react-flow');
        expect(markup).toContain('product-mark');
        expect(markup).toContain('Uniscept');
      });
    });

    test.describe('WHEN the toolbar exports it as PNG', () => {
      let filename: string;
      let bytes: Buffer;

      test.beforeEach(async ({ page }) => {
        const download = await downloadExport(page, COPY.platform.canvas.export.formats.png);
        filename = download.suggestedFilename();
        bytes = await readFile(await download.path());
      });

      test('THEN a raster image lands under the thread name', () => {
        expect(filename).toBe(`${EXPORT_THREAD_NAME}.png`);
        expect(bytes.subarray(0, PNG_SIGNATURE.length)).toEqual(PNG_SIGNATURE);
      });
    });

    test.describe('WHEN the toolbar exports it as JPG', () => {
      let filename: string;
      let bytes: Buffer;

      test.beforeEach(async ({ page }) => {
        const download = await downloadExport(page, COPY.platform.canvas.export.formats.jpg);
        filename = download.suggestedFilename();
        bytes = await readFile(await download.path());
      });

      test('THEN a JPEG lands under the thread name', () => {
        expect(filename).toBe(`${EXPORT_THREAD_NAME}.jpg`);
        expect(bytes.subarray(0, JPEG_SIGNATURE.length)).toEqual(JPEG_SIGNATURE);
      });
    });
  });
});
