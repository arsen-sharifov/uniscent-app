import { beforeEach, describe, expect, test } from 'vitest';

import { groupBy } from '@/lib/utils';

const ITEMS = [
  { id: 'a', node: 'n1' },
  { id: 'b', node: 'n2' },
  { id: 'c', node: 'n1' },
];

let groups: Map<string, typeof ITEMS>;

describe('groupBy', () => {
  describe('GIVEN items sharing some keys', () => {
    describe('WHEN they are grouped by that key', () => {
      beforeEach(() => {
        groups = groupBy(ITEMS, (item) => item.node);
      });

      test('THEN each key holds its items in their original order', () => {
        expect([...groups.keys()]).toEqual(['n1', 'n2']);
        expect(groups.get('n1')?.map((item) => item.id)).toEqual(['a', 'c']);
        expect(groups.get('n2')?.map((item) => item.id)).toEqual(['b']);
      });
    });
  });

  describe('GIVEN no items', () => {
    describe('WHEN they are grouped', () => {
      test('THEN the result is empty', () => {
        expect(groupBy([], (item: { key: string }) => item.key).size).toBe(0);
      });
    });
  });
});
