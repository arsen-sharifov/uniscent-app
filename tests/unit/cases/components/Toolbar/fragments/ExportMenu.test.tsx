import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { awardBadge } from '@mocks/badges';
import { THREAD_ID, canvasNode } from '@mocks/canvas';
import { event } from '@mocks/events';
import { TRANSLATIONS } from '@mocks/i18n';
import { ExportMenu } from '@/components/Toolbar/fragments';
import { exportCanvas } from '@/lib/canvas/export';
import { useOnboardingStore } from '@/lib/onboarding';
import { useCanvasStore } from '@/lib/stores';

vi.mock('@/i18n', () => import('@mocks/i18n'));
vi.mock('@/lib/badges', () => import('@mocks/badges'));
vi.mock('@/lib/events', () => import('@mocks/events'));
vi.mock('@/lib/canvas/export', () => ({ exportCanvas: vi.fn() }));

const THREAD_NAME = 'Export thread';

const root = document.createElement('div');
root.dataset.canvasThread = THREAD_ID;

const exportButton = () => screen.getByRole('button', { name: TRANSLATIONS.platform.canvas.export.label });
const loadingButton = () => screen.getByRole('button', { name: TRANSLATIONS.platform.canvas.export.loading });
const menuItem = (format: string) => screen.getByRole('menuitem', { name: new RegExp(format) });
const openWithPointer = () => fireEvent.click(exportButton(), { detail: 1 });
const chooseFormat = (format: string) => fireEvent.click(menuItem(format));

beforeEach(() => {
  document.body.append(root);
  useCanvasStore.setState({ hydrated: true, threadId: THREAD_ID, nodes: [canvasNode('n1')] });
  render(<ExportMenu threadId={THREAD_ID} threadName={THREAD_NAME} />);
});

afterEach(() => {
  root.remove();
  useOnboardingStore.getState().forget();
});

describe('ExportMenu', () => {
  describe('GIVEN a hydrated canvas with nodes', () => {
    describe('WHEN the export button is clicked with the pointer', () => {
      beforeEach(() => {
        openWithPointer();
      });

      test('THEN the menu opens with every format and takes focus itself', () => {
        expect(screen.getAllByRole('menuitem')).toHaveLength(3);
        expect(screen.getByRole('menu')).toHaveFocus();
        expect(exportButton()).toHaveAttribute('aria-expanded', 'true');
      });
    });

    describe('WHEN the export button is activated from the keyboard', () => {
      beforeEach(() => {
        fireEvent.click(exportButton(), { detail: 0 });
      });

      test('THEN the first format is focused', () => {
        expect(menuItem('PNG')).toHaveFocus();
      });
    });

    describe('WHEN an arrow key is pressed on the export button', () => {
      beforeEach(() => {
        fireEvent.keyDown(exportButton(), { key: 'ArrowDown' });
      });

      test('THEN the menu opens on the first format', () => {
        expect(menuItem('PNG')).toHaveFocus();
      });
    });

    describe('WHEN a format is chosen and the export succeeds', () => {
      beforeEach(() => {
        vi.mocked(exportCanvas).mockResolvedValue('downloaded');
        openWithPointer();
        chooseFormat('PNG');
      });

      test('THEN the canvas root, thread name and format reach the exporter and the menu closes onto the button', async () => {
        await waitFor(() => expect(exportButton()).toHaveFocus());
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
        expect(exportCanvas).toHaveBeenCalledExactlyOnceWith(root, THREAD_NAME, 'png');
      });

      test('THEN the Cartographer badge is awarded', async () => {
        await waitFor(() => expect(awardBadge).toHaveBeenCalledExactlyOnceWith('cartographer'));
      });
    });

    describe('WHEN the graph is too large for a bitmap', () => {
      beforeEach(() => {
        vi.mocked(exportCanvas).mockResolvedValue('too-large');
        openWithPointer();
        chooseFormat('JPG');
      });

      test('THEN the menu stays open with the vector hint and nothing is reported as an error', async () => {
        await waitFor(() =>
          expect(screen.getByRole('status')).toHaveTextContent(TRANSLATIONS.platform.canvas.export.tooLarge),
        );
        expect(screen.getByRole('menu')).toBeInTheDocument();
        expect(event.error).not.toHaveBeenCalled();
        expect(awardBadge).not.toHaveBeenCalled();
      });
    });

    describe('WHEN the export fails', () => {
      beforeEach(() => {
        vi.mocked(exportCanvas).mockRejectedValue(new Error('boom'));
        openWithPointer();
        chooseFormat('SVG');
      });

      test('THEN the failure goes through the event channel under the export title and the menu stays open', async () => {
        await waitFor(() =>
          expect(event.error).toHaveBeenCalledExactlyOnceWith(expect.any(Error), {
            title: TRANSLATIONS.common.errorTitles.exportFailed,
            context: 'canvas.export',
          }),
        );
        expect(screen.getByRole('menu')).toBeInTheDocument();
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
        expect(awardBadge).not.toHaveBeenCalled();
      });
    });

    describe('WHEN the user leaves the open menu with Escape', () => {
      beforeEach(() => {
        openWithPointer();
        fireEvent.keyDown(window, { key: 'Escape' });
      });

      test('THEN the menu closes and focus returns to the button', () => {
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
        expect(exportButton()).toHaveFocus();
      });
    });

    describe('WHEN the user tabs out of the open menu', () => {
      beforeEach(() => {
        openWithPointer();
        fireEvent.keyDown(screen.getByRole('menu'), { key: 'Tab' });
      });

      test('THEN the menu closes without moving focus', () => {
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
        expect(exportButton()).not.toHaveFocus();
      });
    });

    describe('WHEN the user clicks outside the open menu', () => {
      beforeEach(() => {
        openWithPointer();
        fireEvent.mouseDown(document.body);
      });

      test('THEN the menu closes without moving focus', () => {
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
        expect(exportButton()).not.toHaveFocus();
      });
    });

    describe('WHEN the export button is clicked again while the menu is open', () => {
      beforeEach(() => {
        openWithPointer();
        openWithPointer();
      });

      test('THEN the menu closes', () => {
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
        expect(exportButton()).toHaveAttribute('aria-expanded', 'false');
      });
    });

    describe('WHEN the canvas element has left the page before a format is chosen', () => {
      beforeEach(() => {
        root.remove();
        openWithPointer();
        chooseFormat('PNG');
      });

      test('THEN the failure is reported through the event channel and nothing is exported', async () => {
        await waitFor(() =>
          expect(event.error).toHaveBeenCalledExactlyOnceWith(
            expect.objectContaining({ message: 'The active canvas is unavailable' }),
            expect.objectContaining({ context: 'canvas.export' }),
          ),
        );
        expect(exportCanvas).not.toHaveBeenCalled();
      });
    });

    describe('WHEN a format is chosen from the keyboard and the export is still running', () => {
      beforeEach(async () => {
        vi.mocked(exportCanvas).mockImplementation(() => new Promise(() => {}));
        fireEvent.click(exportButton(), { detail: 0 });
        chooseFormat('PNG');
        await vi.waitUntil(() => vi.mocked(exportCanvas).mock.calls.length > 0);
      });

      test('THEN the formats are marked unavailable and keep the focus', () => {
        expect(menuItem('PNG')).toHaveAttribute('aria-disabled', 'true');
        expect(menuItem('PNG')).toBeEnabled();
        expect(menuItem('PNG')).toHaveFocus();
      });
    });

    describe('WHEN another format is chosen while the export is still running', () => {
      beforeEach(async () => {
        vi.mocked(exportCanvas).mockImplementation(() => new Promise(() => {}));
        openWithPointer();
        chooseFormat('PNG');
        await vi.waitUntil(() => vi.mocked(exportCanvas).mock.calls.length > 0);
        chooseFormat('SVG');
      });

      test('THEN only the first export runs', () => {
        expect(exportCanvas).toHaveBeenCalledExactlyOnceWith(root, THREAD_NAME, 'png');
      });
    });

    describe('WHEN the user escapes while an export is still running', () => {
      let finishExport: (outcome: 'downloaded') => void = () => {};

      beforeEach(async () => {
        vi.mocked(exportCanvas).mockImplementation(
          () =>
            new Promise((resolve) => {
              finishExport = resolve;
            }),
        );
        openWithPointer();
        chooseFormat('PNG');
        await vi.waitUntil(() => vi.mocked(exportCanvas).mock.calls.length > 0);
        fireEvent.keyDown(window, { key: 'Escape' });
      });

      test('THEN the menu closes at once and focus returns to the button only after the export settles', async () => {
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
        expect(loadingButton()).toBeDisabled();
        expect(loadingButton()).not.toHaveFocus();

        finishExport('downloaded');

        await waitFor(() => expect(exportButton()).toHaveFocus());
        expect(exportButton()).toBeEnabled();
      });
    });
  });

  describe('GIVEN a guide that waits for an export', () => {
    beforeEach(() => {
      useOnboardingStore.getState().startGuide('canvas');
    });

    describe('WHEN a format is chosen and the file downloads', () => {
      beforeEach(() => {
        vi.mocked(exportCanvas).mockResolvedValue('downloaded');
        openWithPointer();
        chooseFormat('PNG');
      });

      test('THEN the guide learns that the canvas was exported', async () => {
        await waitFor(() => expect(useOnboardingStore.getState().signals.has('canvasExported')).toBe(true));
      });
    });

    describe('WHEN the graph is too large for a bitmap', () => {
      beforeEach(() => {
        vi.mocked(exportCanvas).mockResolvedValue('too-large');
        openWithPointer();
        chooseFormat('JPG');
      });

      test('THEN the guide does not count it as an export', async () => {
        await waitFor(() =>
          expect(screen.getByRole('status')).toHaveTextContent(TRANSLATIONS.platform.canvas.export.tooLarge),
        );
        expect(useOnboardingStore.getState().signals.has('canvasExported')).toBe(false);
      });
    });
  });

  describe('GIVEN the canvas has not hydrated yet', () => {
    beforeEach(() => {
      useCanvasStore.setState({ hydrated: false });
    });

    describe('WHEN the toolbar renders the export action', () => {
      test('THEN the button is disabled', () => {
        expect(exportButton()).toBeDisabled();
      });
    });
  });

  describe('GIVEN the canvas has no nodes', () => {
    beforeEach(() => {
      useCanvasStore.setState({ nodes: [] });
    });

    describe('WHEN the toolbar renders the export action', () => {
      test('THEN the button is disabled and explains why', () => {
        expect(exportButton()).toBeDisabled();
        expect(exportButton()).toHaveAttribute('title', TRANSLATIONS.platform.canvas.export.unavailable);
      });
    });
  });

  describe('GIVEN another thread is active in the store', () => {
    beforeEach(() => {
      useCanvasStore.setState({ threadId: 'other-thread' });
    });

    describe('WHEN the toolbar renders the export action', () => {
      test('THEN the button is disabled and explains why', () => {
        expect(exportButton()).toBeDisabled();
        expect(exportButton()).toHaveAttribute('title', TRANSLATIONS.platform.canvas.export.unavailable);
      });
    });
  });
});
