import { describe, expect, test } from 'vitest';

import type { IFlattenedItem } from '@interfaces';

import { folderItem, threadItem } from '@mocks/sidebar';
import {
  flattenTree,
  getDropPosition,
  getProjection,
  removeChildrenOf,
  resolveDropZone,
} from '@/components/Sidebar/utils';

const TREE = [folderItem('f1', [folderItem('f2', [threadItem('t1')]), threadItem('t2')]), threadItem('t3')];

const FLAT = flattenTree(TREE, new Set());

const ROW_HEIGHT = 32;

describe('flattenTree', () => {
  describe('GIVEN a fully expanded nested tree', () => {
    describe('WHEN it is flattened', () => {
      test('THEN every item carries its depth, parent and subtree count', () => {
        expect(FLAT).toEqual([
          {
            id: 'f1',
            name: 'Folder f1',
            type: 'folder',
            parentId: null,
            depth: 0,
            index: 0,
            collapsed: false,
            childCount: 3,
            answered: undefined,
          },
          {
            id: 'f2',
            name: 'Folder f2',
            type: 'folder',
            parentId: 'f1',
            depth: 1,
            index: 0,
            collapsed: false,
            childCount: 1,
            answered: undefined,
          },
          {
            id: 't1',
            name: 'Thread t1',
            type: 'thread',
            parentId: 'f2',
            depth: 2,
            index: 0,
            collapsed: false,
            childCount: 0,
            answered: false,
          },
          {
            id: 't2',
            name: 'Thread t2',
            type: 'thread',
            parentId: 'f1',
            depth: 1,
            index: 1,
            collapsed: false,
            childCount: 0,
            answered: false,
          },
          {
            id: 't3',
            name: 'Thread t3',
            type: 'thread',
            parentId: null,
            depth: 0,
            index: 1,
            collapsed: false,
            childCount: 0,
            answered: false,
          },
        ]);
      });
    });
  });

  describe('GIVEN a collapsed root folder', () => {
    describe('WHEN the tree is flattened', () => {
      test('THEN its children are hidden but fully counted', () => {
        expect(flattenTree(TREE, new Set(['f1']))).toEqual([
          expect.objectContaining({ id: 'f1', collapsed: true, childCount: 3 }),
          expect.objectContaining({ id: 't3' }),
        ]);
      });
    });
  });

  describe('GIVEN a collapsed nested folder', () => {
    describe('WHEN the tree is flattened', () => {
      test('THEN only that branch is hidden', () => {
        expect(flattenTree(TREE, new Set(['f2'])).map((item) => item.id)).toEqual(['f1', 'f2', 't2', 't3']);
      });
    });
  });
});

describe('getProjection', () => {
  describe('GIVEN a drag over the item itself or unknown items', () => {
    describe('WHEN the projection is computed', () => {
      test('THEN there is no projection', () => {
        expect(getProjection(FLAT, 't3', 't3', 'after')).toBeNull();
        expect(getProjection(FLAT, 'ghost', 't3', 'after')).toBeNull();
        expect(getProjection(FLAT, 't3', 'ghost', 'after')).toBeNull();
      });
    });
  });

  describe('GIVEN a thread dragged inside a nested folder', () => {
    describe('WHEN the projection is computed', () => {
      test('THEN it lands inside the folder one level deeper', () => {
        expect(getProjection(FLAT, 't3', 'f2', 'inside')).toEqual({ depth: 2, parentId: 'f2', zone: 'inside' });
      });
    });
  });

  describe('GIVEN a folder dragged inside a folder at the depth limit', () => {
    describe('WHEN the projection is computed', () => {
      test('THEN it degrades to a sibling position of the target', () => {
        const flat = flattenTree([...TREE, folderItem('fX')], new Set());

        expect(getProjection(flat, 'fX', 'f2', 'inside')).toEqual({ depth: 1, parentId: 'f1', zone: 'inside' });
      });
    });
  });

  describe('GIVEN a folder dragged onto its own descendant', () => {
    describe('WHEN the projection is computed', () => {
      test('THEN the cycle is rejected', () => {
        expect(getProjection(FLAT, 'f1', 't1', 'after')).toBeNull();
      });
    });
  });

  describe('GIVEN a thread dragged before a root item', () => {
    describe('WHEN the projection is computed', () => {
      test('THEN it stays at the root level', () => {
        expect(getProjection(FLAT, 't1', 't3', 'before')).toEqual({ depth: 0, parentId: null, zone: 'before' });
      });
    });
  });
});

describe('removeChildrenOf', () => {
  describe('GIVEN a flattened tree', () => {
    describe('WHEN the children of a folder are removed', () => {
      test('THEN the whole subtree disappears transitively', () => {
        const remaining = removeChildrenOf(FLAT, new Set(['f1'])).map((item: IFlattenedItem) => item.id);

        expect(remaining).toEqual(['f1', 't3']);
      });
    });

    describe('WHEN no ids are excluded', () => {
      test('THEN everything survives', () => {
        expect(removeChildrenOf(FLAT, new Set())).toEqual(FLAT);
      });
    });
  });
});

describe('getDropPosition', () => {
  describe('GIVEN a projection inside a folder', () => {
    describe('WHEN the drop position is computed', () => {
      test('THEN the item lands in the first slot', () => {
        expect(getDropPosition(FLAT, 't3', 'f2', { depth: 2, parentId: 'f2', zone: 'inside' })).toBe(0);
      });
    });
  });

  describe('GIVEN a projection after a root row', () => {
    describe('WHEN the drop position is computed', () => {
      test('THEN the slot follows that row among the siblings without the dragged item', () => {
        expect(getDropPosition(FLAT, 't1', 't3', { depth: 0, parentId: null, zone: 'after' })).toBe(2);
      });
    });
  });

  describe('GIVEN a projection before a deeply nested row', () => {
    describe('WHEN the drop position is computed', () => {
      test('THEN the ancestor at the target level anchors the slot', () => {
        expect(getDropPosition(FLAT, 't3', 't1', { depth: 1, parentId: 'f1', zone: 'before' })).toBe(0);
      });
    });
  });

  describe('GIVEN a hovered row outside the target level', () => {
    describe('WHEN the drop position is computed', () => {
      test('THEN the item lands at the end of that level', () => {
        expect(getDropPosition(FLAT, 't1', 't3', { depth: 1, parentId: 'f1', zone: 'after' })).toBe(2);
      });
    });
  });
});

describe('resolveDropZone', () => {
  describe('GIVEN a folder row entered fresh', () => {
    describe('WHEN the pointer is placed on it', () => {
      test('THEN the top edge drops before and the body drops inside', () => {
        expect(resolveDropZone(true, 0.2, 'after', false, ROW_HEIGHT)).toBe('before');
        expect(resolveDropZone(true, 0.5, 'after', false, ROW_HEIGHT)).toBe('inside');
      });
    });
  });

  describe('GIVEN a folder row already targeted', () => {
    describe('WHEN the pointer drifts within the hysteresis buffer', () => {
      test('THEN the previous zone holds', () => {
        expect(resolveDropZone(true, 0.3, 'before', true, ROW_HEIGHT)).toBe('before');
        expect(resolveDropZone(true, 0.2, 'inside', true, ROW_HEIGHT)).toBe('inside');
      });
    });

    describe('WHEN the pointer clears the buffer', () => {
      test('THEN the zone flips', () => {
        expect(resolveDropZone(true, 0.5, 'before', true, ROW_HEIGHT)).toBe('inside');
        expect(resolveDropZone(true, 0.05, 'inside', true, ROW_HEIGHT)).toBe('before');
      });
    });

    describe('WHEN the previous zone came from a leaf row', () => {
      test('THEN the plain folder threshold decides', () => {
        expect(resolveDropZone(true, 0.2, 'after', true, ROW_HEIGHT)).toBe('before');
        expect(resolveDropZone(true, 0.3, 'after', true, ROW_HEIGHT)).toBe('inside');
      });
    });
  });

  describe('GIVEN a leaf row entered fresh', () => {
    describe('WHEN the pointer is placed on it', () => {
      test('THEN the halves split the row without a buffer', () => {
        expect(resolveDropZone(false, 0.45, 'after', false, ROW_HEIGHT)).toBe('before');
        expect(resolveDropZone(false, 0.55, 'before', false, ROW_HEIGHT)).toBe('after');
      });
    });
  });

  describe('GIVEN a leaf row already targeted', () => {
    describe('WHEN the pointer drifts within the hysteresis buffer', () => {
      test('THEN the previous zone holds', () => {
        expect(resolveDropZone(false, 0.6, 'before', true, ROW_HEIGHT)).toBe('before');
        expect(resolveDropZone(false, 0.4, 'after', true, ROW_HEIGHT)).toBe('after');
      });
    });

    describe('WHEN the pointer clears the buffer', () => {
      test('THEN the zone flips', () => {
        expect(resolveDropZone(false, 0.75, 'before', true, ROW_HEIGHT)).toBe('after');
        expect(resolveDropZone(false, 0.25, 'after', true, ROW_HEIGHT)).toBe('before');
      });
    });
  });
});
