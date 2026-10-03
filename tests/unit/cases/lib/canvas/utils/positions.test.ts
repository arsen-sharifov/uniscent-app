import { describe, expect, test } from 'vitest';

import { bareNode } from '@mocks/canvas';
import { detectPositionChanges } from '@/lib/canvas';

describe('detectPositionChanges', () => {
  describe('GIVEN a node that moved between snapshots', () => {
    describe('WHEN changes are detected', () => {
      test('THEN the new coordinates are reported', () => {
        const previous = [bareNode('n1', 0, 0), bareNode('n2', 50, 50)];
        const next = [bareNode('n1', 10, 20), bareNode('n2', 50, 50)];

        expect(detectPositionChanges(previous, next)).toEqual([{ id: 'n1', x: 10, y: 20 }]);
      });
    });
  });

  describe('GIVEN a node that moved along a single axis', () => {
    describe('WHEN changes are detected', () => {
      test('THEN a horizontal-only move is reported', () => {
        expect(detectPositionChanges([bareNode('n1', 0, 30)], [bareNode('n1', 10, 30)])).toEqual([
          { id: 'n1', x: 10, y: 30 },
        ]);
      });

      test('THEN a vertical-only move is reported', () => {
        expect(detectPositionChanges([bareNode('n1', 30, 0)], [bareNode('n1', 30, 10)])).toEqual([
          { id: 'n1', x: 30, y: 10 },
        ]);
      });
    });
  });

  describe('GIVEN identical snapshots', () => {
    describe('WHEN changes are detected', () => {
      test('THEN nothing is reported', () => {
        const nodes = [bareNode('n1', 0, 0)];

        expect(detectPositionChanges(nodes, nodes)).toEqual([]);
      });
    });
  });

  describe('GIVEN a node that only exists in the next snapshot', () => {
    describe('WHEN changes are detected', () => {
      test('THEN the new node is ignored', () => {
        expect(detectPositionChanges([], [bareNode('n1', 10, 10)])).toEqual([]);
      });
    });
  });
});
