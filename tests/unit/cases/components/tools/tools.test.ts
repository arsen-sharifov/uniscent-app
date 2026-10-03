import { describe, expect, test } from 'vitest';

import { TRANSLATIONS } from '@mocks/i18n';
import { ECanvasTool, buildCanvasToolGroups, buildCanvasTools, isCanvasTool } from '@/components/tools';

describe('isCanvasTool', () => {
  describe('GIVEN a canvas tool id', () => {
    describe('WHEN the value is checked', () => {
      test('THEN it passes', () => {
        expect(isCanvasTool('select')).toBe(true);
        expect(isCanvasTool('undo')).toBe(true);
      });
    });
  });

  describe('GIVEN a non-tool id', () => {
    describe('WHEN the value is checked', () => {
      test('THEN it fails', () => {
        expect(isCanvasTool('help')).toBe(false);
        expect(isCanvasTool('paint')).toBe(false);
      });
    });
  });
});

describe('buildCanvasTools', () => {
  describe('GIVEN the english tool translations', () => {
    describe('WHEN the tools are built', () => {
      test('THEN every canvas tool id has its own entry', () => {
        const tools = buildCanvasTools(TRANSLATIONS.platform.canvas.tools);

        expect(Object.keys(tools).sort()).toEqual(Object.values(ECanvasTool).sort());
      });

      test('THEN entries carry their id, shortcut and translated label', () => {
        const tools = buildCanvasTools(TRANSLATIONS.platform.canvas.tools);

        expect(tools[ECanvasTool.AddNode]).toMatchObject({
          id: ECanvasTool.AddNode,
          shortcut: 'N',
          label: TRANSLATIONS.platform.canvas.tools.items.addNode.label,
          description: TRANSLATIONS.platform.canvas.tools.items.addNode.description,
        });
      });

      test('THEN history tools are marked as actions', () => {
        const tools = buildCanvasTools(TRANSLATIONS.platform.canvas.tools);

        expect(tools[ECanvasTool.Undo]).toMatchObject({ kind: 'action', shortcut: '⌘Z' });
        expect(tools[ECanvasTool.Redo]).toMatchObject({ kind: 'action', shortcut: '⌘⇧Z' });
      });
    });
  });
});

describe('buildCanvasToolGroups', () => {
  describe('GIVEN the english tool translations', () => {
    describe('WHEN the groups are built', () => {
      test('THEN every group holds its tools in canonical order', () => {
        const groups = buildCanvasToolGroups(TRANSLATIONS.platform.canvas.tools).map((group) => ({
          id: group.id,
          tools: group.tools.map((tool) => tool.id),
        }));

        expect(groups).toEqual([
          { id: 'navigate', tools: [ECanvasTool.Select, ECanvasTool.Pan, ECanvasTool.ZoomIn, ECanvasTool.ZoomOut] },
          { id: 'history', tools: [ECanvasTool.Undo, ECanvasTool.Redo] },
          { id: 'build', tools: [ECanvasTool.AddNode, ECanvasTool.Connect, ECanvasTool.Delete] },
          { id: 'decide', tools: [ECanvasTool.ValidPath, ECanvasTool.InvalidPath, ECanvasTool.Answer] },
          { id: 'link', tools: [ECanvasTool.CrossReference] },
        ]);
      });
    });
  });
});
