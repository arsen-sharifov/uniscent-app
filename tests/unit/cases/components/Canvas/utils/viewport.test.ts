import { describe, expect, test } from 'vitest';

import { bareNode, measuredNode } from '@mocks/canvas';
import { OVERLAY_VIEWPORT_MARGIN } from '@/components/Canvas/consts';
import { clampToViewport, hasNodeOutsideView } from '@/components/Canvas/utils';

const VIEW = { width: 800, height: 600 };
const MENU = { width: 200, height: 120 };

describe('hasNodeOutsideView', () => {
  describe('GIVEN nodes inside the visible area at the default viewport', () => {
    describe('WHEN the view is checked', () => {
      test('THEN no node counts as outside', () => {
        const nodes = [measuredNode('a', 100, 100, 200, 80), measuredNode('b', 500, 400, 200, 80)];

        expect(hasNodeOutsideView(nodes, { x: 0, y: 0, zoom: 1 }, VIEW)).toBe(false);
      });
    });
  });

  describe('GIVEN a node that only overlaps the edge of the visible area', () => {
    describe('WHEN the view is checked', () => {
      test('THEN the partly visible node does not count as outside', () => {
        expect(hasNodeOutsideView([measuredNode('a', -150, 100, 200, 80)], { x: 0, y: 0, zoom: 1 }, VIEW)).toBe(false);
        expect(hasNodeOutsideView([measuredNode('a', 700, 550, 200, 80)], { x: 0, y: 0, zoom: 1 }, VIEW)).toBe(false);
      });
    });
  });

  describe('GIVEN a node fully past each side of the visible area', () => {
    describe('WHEN the view is checked', () => {
      test('THEN it counts as outside', () => {
        expect(hasNodeOutsideView([measuredNode('a', -300, 100, 200, 80)], { x: 0, y: 0, zoom: 1 }, VIEW)).toBe(true);
        expect(hasNodeOutsideView([measuredNode('a', 100, -200, 200, 80)], { x: 0, y: 0, zoom: 1 }, VIEW)).toBe(true);
        expect(hasNodeOutsideView([measuredNode('a', 900, 100, 200, 80)], { x: 0, y: 0, zoom: 1 }, VIEW)).toBe(true);
        expect(hasNodeOutsideView([measuredNode('a', 100, 700, 200, 80)], { x: 0, y: 0, zoom: 1 }, VIEW)).toBe(true);
      });
    });
  });

  describe('GIVEN a far node brought into view by the pan and zoom', () => {
    describe('WHEN the view is checked', () => {
      test('THEN the transformed position is used', () => {
        expect(hasNodeOutsideView([measuredNode('a', 1200, 100, 200, 80)], { x: -500, y: 0, zoom: 0.5 }, VIEW)).toBe(
          false,
        );
      });
    });
  });

  describe('GIVEN a node that has not been measured yet', () => {
    describe('WHEN the view is checked', () => {
      test('THEN its position alone decides', () => {
        expect(hasNodeOutsideView([bareNode('a', 400, 300)], { x: 0, y: 0, zoom: 1 }, VIEW)).toBe(false);
        expect(hasNodeOutsideView([bareNode('a', -1, 300)], { x: 0, y: 0, zoom: 1 }, VIEW)).toBe(true);
      });
    });
  });
});

describe('clampToViewport', () => {
  describe('GIVEN an overlay that fits where it was opened', () => {
    describe('WHEN it is clamped', () => {
      test('THEN it keeps its position', () => {
        expect(clampToViewport({ x: 100, y: 80 }, MENU, VIEW)).toEqual({ x: 100, y: 80 });
      });
    });
  });

  describe('GIVEN an overlay opened next to the right and bottom edges', () => {
    describe('WHEN it is clamped', () => {
      test('THEN it moves back inside with the edge margin', () => {
        expect(clampToViewport({ x: 790, y: 590 }, MENU, VIEW)).toEqual({
          x: VIEW.width - MENU.width - OVERLAY_VIEWPORT_MARGIN,
          y: VIEW.height - MENU.height - OVERLAY_VIEWPORT_MARGIN,
        });
      });
    });
  });

  describe('GIVEN an overlay opened past the left and top edges', () => {
    describe('WHEN it is clamped', () => {
      test('THEN it keeps the edge margin', () => {
        expect(clampToViewport({ x: -20, y: 2 }, MENU, VIEW)).toEqual({
          x: OVERLAY_VIEWPORT_MARGIN,
          y: OVERLAY_VIEWPORT_MARGIN,
        });
      });
    });
  });

  describe('GIVEN an overlay larger than the window', () => {
    describe('WHEN it is clamped', () => {
      test('THEN it starts at the edge margin so its start stays visible', () => {
        expect(clampToViewport({ x: 300, y: 300 }, { width: 1000, height: 900 }, VIEW)).toEqual({
          x: OVERLAY_VIEWPORT_MARGIN,
          y: OVERLAY_VIEWPORT_MARGIN,
        });
      });
    });
  });
});
