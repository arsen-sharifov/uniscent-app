import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import type { ITourGeometry } from '@interfaces';

import {
  dismissOverlays,
  findAnchorElement,
  joinAnchors,
  parseAnchors,
  readTourGeometry,
  readVisibleAnchors,
  sameRect,
  sameRects,
} from '@/lib/onboarding';

const onKeyDown = vi.fn();

let geometry: ITourGeometry;

const mount = (html: string) => {
  document.body.innerHTML = html;
};

const stubRect = (selector: string, rect: { top: number; left: number; width: number; height: number }) => {
  const element = document.querySelector<HTMLElement>(selector);
  if (!element) throw new Error(`No element for ${selector}`);

  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
    ...rect,
    bottom: 0,
    right: 0,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  });
};

const stubVisibility = (selector: string, visible: boolean) => {
  const element = document.querySelector<HTMLElement>(selector);
  if (!element) throw new Error(`No element for ${selector}`);

  Object.defineProperty(element, 'checkVisibility', { configurable: true, value: () => visible });
};

const stubTopmost = (selector: string) => {
  Object.defineProperty(document, 'elementsFromPoint', {
    configurable: true,
    value: () => [document.querySelector(selector)].filter(Boolean),
  });
};

afterEach(() => {
  document.body.innerHTML = '';
  document.removeEventListener('keydown', onKeyDown);
  Reflect.deleteProperty(document, 'elementsFromPoint');
  vi.restoreAllMocks();
});

describe('readVisibleAnchors', () => {
  describe('GIVEN markup carrying known and unknown tour anchors', () => {
    beforeEach(() => {
      mount('<div data-tour="settingsModal"></div><div data-tour="madeUp"></div><div></div>');
    });

    describe('WHEN the anchors are read', () => {
      test('THEN only catalogue anchors are collected', () => {
        expect([...readVisibleAnchors()]).toEqual(['settingsModal']);
      });
    });
  });

  describe('GIVEN a panel that is still mounted while it fades out', () => {
    beforeEach(() => {
      mount('<div data-tour="settingsModal"></div><div data-tour="workspaceSettingsModal"></div>');
      stubVisibility('[data-tour="settingsModal"]', false);
      stubVisibility('[data-tour="workspaceSettingsModal"]', true);
    });

    describe('WHEN the anchors are read', () => {
      test('THEN the faded panel no longer counts as open', () => {
        expect([...readVisibleAnchors()]).toEqual(['workspaceSettingsModal']);
      });
    });
  });

  describe('GIVEN markup without any anchor', () => {
    beforeEach(() => {
      mount('<div></div>');
    });

    describe('WHEN the anchors are read', () => {
      test('THEN the set is empty', () => {
        expect(readVisibleAnchors().size).toBe(0);
      });
    });
  });
});

describe('findAnchorElement', () => {
  describe('GIVEN a sized anchor next to one collapsed to nothing', () => {
    beforeEach(() => {
      mount('<button data-tour="toolbarHelp">help</button><button data-tour="toolbarExport"></button>');
      stubRect('[data-tour="toolbarHelp"]', { top: 0, left: 0, width: 36, height: 36 });
      stubRect('[data-tour="toolbarExport"]', { top: 0, left: 0, width: 0, height: 0 });
    });

    describe('WHEN the anchors are looked up', () => {
      test('THEN the sized anchor resolves to its element, and collapsed or missing anchors resolve to nothing', () => {
        expect(findAnchorElement('toolbarHelp')?.tagName).toBe('BUTTON');
        expect(findAnchorElement('toolbarExport')).toBeNull();
        expect(findAnchorElement('toolbarPan')).toBeNull();
      });
    });
  });
});

describe('joinAnchors', () => {
  describe('GIVEN an ordered list of anchors', () => {
    describe('WHEN it is joined into a key and parsed back', () => {
      test('THEN the anchors come back in the same order', () => {
        expect(parseAnchors(joinAnchors(['toolbarHelp', 'toolbar']))).toEqual(['toolbarHelp', 'toolbar']);
      });
    });
  });

  describe('GIVEN no anchors', () => {
    describe('WHEN they are joined', () => {
      test('THEN the key is empty', () => {
        expect(joinAnchors()).toBe('');
      });
    });
  });
});

describe('sameRect', () => {
  describe('GIVEN two rects', () => {
    describe('WHEN they are compared', () => {
      test('THEN equality covers nulls and every side', () => {
        const rect = { top: 1, left: 2, width: 3, height: 4 };

        expect(sameRect(null, null)).toBe(true);
        expect(sameRect(rect, null)).toBe(false);
        expect(sameRect(rect, { ...rect })).toBe(true);
        expect(sameRect(rect, { ...rect, left: 9 })).toBe(false);
      });
    });
  });
});

describe('sameRects', () => {
  describe('GIVEN two hole lists', () => {
    describe('WHEN they are compared', () => {
      test('THEN order and length both matter', () => {
        const a = { top: 1, left: 2, width: 3, height: 4 };
        const b = { top: 5, left: 6, width: 7, height: 8 };

        expect(sameRects([a, b], [a, b])).toBe(true);
        expect(sameRects([a, b], [b, a])).toBe(false);
        expect(sameRects([a], [a, b])).toBe(false);
      });
    });
  });
});

describe('dismissOverlays', () => {
  describe('GIVEN an app dialog left open', () => {
    beforeEach(() => {
      mount('<div role="dialog"><p>settings</p></div>');
      document.addEventListener('keydown', onKeyDown);
    });

    describe('WHEN the tour takes over the screen', () => {
      beforeEach(() => {
        dismissOverlays();
      });

      test('THEN it asks the app to close it', () => {
        expect(onKeyDown).toHaveBeenCalledOnce();
        expect(onKeyDown.mock.calls[0]?.[0]).toMatchObject({ key: 'Escape' });
      });
    });
  });

  describe("GIVEN only the tour's own window", () => {
    beforeEach(() => {
      mount('<div role="dialog"><div data-tour-panel></div></div>');
      document.addEventListener('keydown', onKeyDown);
    });

    describe('WHEN the tour takes over the screen', () => {
      beforeEach(() => {
        dismissOverlays();
      });

      test('THEN nothing is closed', () => {
        expect(onKeyDown).not.toHaveBeenCalled();
      });
    });
  });

  describe('GIVEN a native app dialog left open', () => {
    beforeEach(() => {
      mount('<dialog open><p>settings</p></dialog>');
      document.addEventListener('keydown', onKeyDown);
    });

    describe('WHEN the tour takes over the screen', () => {
      beforeEach(() => {
        dismissOverlays();
      });

      test('THEN it asks the app to close it', () => {
        expect(onKeyDown).toHaveBeenCalledOnce();
        expect(onKeyDown.mock.calls[0]?.[0]).toMatchObject({ key: 'Escape' });
      });
    });
  });

  describe('GIVEN an app alert dialog left open', () => {
    beforeEach(() => {
      mount('<div role="alertdialog"><p>transfer ownership</p></div>');
      document.addEventListener('keydown', onKeyDown);
    });

    describe('WHEN the tour takes over the screen', () => {
      beforeEach(() => {
        dismissOverlays();
      });

      test('THEN it asks the app to close it', () => {
        expect(onKeyDown).toHaveBeenCalledOnce();
        expect(onKeyDown.mock.calls[0]?.[0]).toMatchObject({ key: 'Escape' });
      });
    });
  });

  describe("GIVEN only the tour's step card and continue hint", () => {
    beforeEach(() => {
      mount('<dialog open data-tour-card></dialog><dialog open data-tour-hint></dialog>');
      document.addEventListener('keydown', onKeyDown);
    });

    describe('WHEN the tour takes over the screen', () => {
      beforeEach(() => {
        dismissOverlays();
      });

      test('THEN nothing is closed', () => {
        expect(onKeyDown).not.toHaveBeenCalled();
      });
    });
  });
});

describe('readTourGeometry', () => {
  describe('GIVEN an ordered list of candidate anchors where only the broader one is on screen', () => {
    beforeEach(() => {
      mount('<div data-tour="sidebarWorkspaceSwitcher"></div>');
      stubRect('[data-tour="sidebarWorkspaceSwitcher"]', { top: 60, left: 10, width: 250, height: 50 });
    });

    describe('WHEN the geometry is read', () => {
      beforeEach(() => {
        geometry = readTourGeometry(['sidebarWorkspaceCreate', 'sidebarWorkspaceSwitcher'], []);
      });

      test('THEN it falls back to the broader anchor', () => {
        expect(geometry).toMatchObject({
          anchor: 'sidebarWorkspaceSwitcher',
          rect: { top: 60, left: 10, width: 250, height: 50 },
        });
      });
    });
  });

  describe('GIVEN the same list once the specific anchor has appeared as well', () => {
    beforeEach(() => {
      mount('<div data-tour="sidebarWorkspaceSwitcher"></div><button data-tour="sidebarWorkspaceCreate"></button>');
      stubRect('[data-tour="sidebarWorkspaceSwitcher"]', { top: 60, left: 10, width: 250, height: 50 });
      stubRect('[data-tour="sidebarWorkspaceCreate"]', { top: 130, left: 180, width: 90, height: 24 });
    });

    describe('WHEN the geometry is read', () => {
      beforeEach(() => {
        geometry = readTourGeometry(['sidebarWorkspaceCreate', 'sidebarWorkspaceSwitcher'], []);
      });

      test('THEN it switches to the specific anchor', () => {
        expect(geometry).toMatchObject({
          anchor: 'sidebarWorkspaceCreate',
          rect: { top: 130, left: 180, width: 90, height: 24 },
        });
      });
    });
  });

  describe('GIVEN a spotlighted anchor next to an open menu and a focused field', () => {
    beforeEach(() => {
      mount('<button data-tour="toolbarExport"></button><div role="menu"></div><input id="rename" /><div>plain</div>');
      stubRect('[data-tour="toolbarExport"]', { top: 0, left: 0, width: 36, height: 36 });
      stubRect('[role="menu"]', { top: 40, left: 0, width: 200, height: 120 });
      stubRect('#rename', { top: 200, left: 10, width: 140, height: 24 });
      document.querySelector<HTMLInputElement>('#rename')?.focus();
    });

    describe('WHEN the geometry is read', () => {
      beforeEach(() => {
        geometry = readTourGeometry(['toolbarExport'], []);
      });

      test('THEN the anchor, the menu and the focused field all stay reachable', () => {
        expect(geometry.rect).toEqual({ top: 0, left: 0, width: 36, height: 36 });
        expect(geometry.open).toHaveLength(3);
      });
    });
  });

  describe('GIVEN a step that keeps the canvas open', () => {
    beforeEach(() => {
      mount('<button data-tour="toolbarAddNode"></button><div data-tour="canvas"></div>');
      stubRect('[data-tour="toolbarAddNode"]', { top: 0, left: 0, width: 36, height: 36 });
      stubRect('[data-tour="canvas"]', { top: 0, left: 300, width: 800, height: 600 });
    });

    describe('WHEN the geometry is read', () => {
      beforeEach(() => {
        geometry = readTourGeometry(['toolbarAddNode'], ['canvas']);
      });

      test('THEN the extra anchor is punched through as well', () => {
        expect(geometry.open).toHaveLength(2);
      });
    });
  });

  describe('GIVEN a target that sits inside an open dialog', () => {
    beforeEach(() => {
      mount('<div role="dialog"><button data-tour="settingsAppearanceNav"></button></div>');
      stubRect('[role="dialog"]', { top: 100, left: 100, width: 600, height: 400 });
      stubRect('[data-tour="settingsAppearanceNav"]', { top: 140, left: 120, width: 160, height: 28 });
      stubTopmost('[data-tour="settingsAppearanceNav"]');
    });

    describe('WHEN the geometry is read', () => {
      beforeEach(() => {
        geometry = readTourGeometry(['settingsAppearanceNav'], []);
      });

      test('THEN the dialog is dimmed like everything else and only the target is cut out', () => {
        expect(geometry.blocked).toBeNull();
        expect(geometry.lit).toEqual([{ top: 140, left: 120, width: 160, height: 28 }]);
        expect(geometry.open).toHaveLength(2);
      });
    });
  });

  describe('GIVEN a dialog that does not hold the target', () => {
    beforeEach(() => {
      mount('<button data-tour="toolbarHelp"></button><div role="dialog" id="other"></div>');
      stubRect('[data-tour="toolbarHelp"]', { top: 800, left: 1380, width: 36, height: 36 });
      stubRect('#other', { top: 40, left: 150, width: 400, height: 300 });
    });

    describe('WHEN the geometry is read', () => {
      beforeEach(() => {
        geometry = readTourGeometry(['toolbarHelp'], []);
      });

      test('THEN only the target is lit, and the dialog merely stays clickable', () => {
        expect(geometry.lit).toEqual([{ top: 800, left: 1380, width: 36, height: 36 }]);
        expect(geometry.open).toHaveLength(2);
      });
    });
  });

  describe('GIVEN an unrelated dialog covering the target', () => {
    beforeEach(() => {
      mount('<button data-tour="sidebarWorkspaceSwitcher"></button><div role="dialog"><p id="cover"></p></div>');
      stubRect('[data-tour="sidebarWorkspaceSwitcher"]', { top: 20, left: 10, width: 200, height: 30 });
      stubRect('[role="dialog"]', { top: 0, left: 0, width: 900, height: 700 });
      stubTopmost('#cover');
    });

    describe('WHEN the geometry is read', () => {
      beforeEach(() => {
        geometry = readTourGeometry(['sidebarWorkspaceSwitcher'], []);
      });

      test('THEN the blocker takes over the spotlight and is the only way through', () => {
        const blocker = { top: 0, left: 0, width: 900, height: 700 };

        expect(geometry.rect).toEqual({ top: 20, left: 10, width: 200, height: 30 });
        expect(geometry.blocked).toEqual(blocker);
        expect(geometry.lit).toEqual([blocker]);
        expect(geometry.open).toEqual([blocker]);
      });
    });
  });

  describe('GIVEN a modal backdrop swallowing the clicks meant for the target', () => {
    beforeEach(() => {
      mount('<button data-tour="sidebarWorkspaceSwitcher"></button><div id="layer"><div role="dialog"></div></div>');
      stubRect('[data-tour="sidebarWorkspaceSwitcher"]', { top: 20, left: 10, width: 200, height: 30 });
      stubRect('#layer', { top: 0, left: 0, width: 1400, height: 900 });
      stubRect('[role="dialog"]', { top: 60, left: 220, width: 900, height: 700 });
      stubTopmost('#layer');
    });

    describe('WHEN the geometry is read', () => {
      beforeEach(() => {
        geometry = readTourGeometry(['sidebarWorkspaceSwitcher'], []);
      });

      test('THEN the dialog inside the backdrop is named as the blocker', () => {
        expect(geometry.blocked).toEqual({ top: 60, left: 220, width: 900, height: 700 });
      });
    });
  });

  describe('GIVEN a sheet whose backdrop sits beside its panel', () => {
    beforeEach(() => {
      mount(
        '<button data-tour="toolbarPan"></button><div id="layer"><div id="backdrop"></div><div role="dialog"></div></div>',
      );
      stubRect('[data-tour="toolbarPan"]', { top: 300, left: 1380, width: 36, height: 36 });
      stubRect('#backdrop', { top: 0, left: 0, width: 1400, height: 900 });
      stubRect('[role="dialog"]', { top: 140, left: 480, width: 640, height: 720 });
      stubTopmost('#backdrop');
    });

    describe('WHEN the geometry is read', () => {
      beforeEach(() => {
        geometry = readTourGeometry(['toolbarPan'], []);
      });

      test('THEN the panel beside the backdrop is named as the blocker', () => {
        expect(geometry.blocked).toEqual({ top: 140, left: 480, width: 640, height: 720 });
      });
    });
  });

  describe('GIVEN a sheet the step itself asked the user to open, lying over the target', () => {
    beforeEach(() => {
      mount(
        '<button data-tour="toolbarPan"></button><div id="layer"><div id="backdrop"></div><div role="dialog" data-tour="shortcutsSheet"></div></div>',
      );
      stubRect('[data-tour="toolbarPan"]', { top: 300, left: 1380, width: 36, height: 36 });
      stubRect('#backdrop', { top: 0, left: 0, width: 1400, height: 900 });
      stubRect('[data-tour="shortcutsSheet"]', { top: 140, left: 480, width: 640, height: 720 });
      stubTopmost('#backdrop');
    });

    describe('WHEN the geometry is read for that step', () => {
      beforeEach(() => {
        geometry = readTourGeometry(['toolbarPan'], ['shortcutsSheet']);
      });

      test('THEN the sheet is treated as part of the scene, not as a blocker', () => {
        expect(geometry.blocked).toBeNull();
      });
    });

    describe('WHEN the geometry is read for a step that did not ask for it', () => {
      beforeEach(() => {
        geometry = readTourGeometry(['toolbarPan'], []);
      });

      test('THEN the sheet is named as the blocker', () => {
        expect(geometry.blocked).toEqual({ top: 140, left: 480, width: 640, height: 720 });
      });
    });
  });

  describe('GIVEN no anchor at all', () => {
    beforeEach(() => {
      mount('<div>plain</div>');
    });

    describe('WHEN the geometry is read', () => {
      beforeEach(() => {
        geometry = readTourGeometry([], []);
      });

      test('THEN nothing is spotlighted and nothing is punched through', () => {
        expect(geometry).toEqual({ rect: null, anchor: null, blocked: null, lit: [], open: [] });
      });
    });
  });
});
