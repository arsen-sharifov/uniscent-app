import { describe, expect, test } from 'vitest';

import { folderInput, folderItem, threadInput, threadItem } from '@mocks/sidebar';
import {
  buildNavTree,
  collectIds,
  containsThread,
  filterTree,
  findFirstThread,
  findInTree,
  findOutermostItems,
  findParentId,
  getMaxSubtreeDepth,
  getSiblings,
  getSubtreeDepth,
  insertIntoTree,
  removeFromTree,
  setThreadResolved,
  updateNavItemName,
} from '@/components/Sidebar/utils';

describe('buildNavTree', () => {
  describe('GIVEN folders and threads out of position order with nesting', () => {
    describe('WHEN the tree is built', () => {
      test('THEN every level is sorted by position under the right parent', () => {
        const folders = [folderInput('fB', 1), folderInput('fA', 0), folderInput('fC', 0, 'fA')];
        const threads = [
          threadInput('t-root', 2, null, true),
          threadInput('t-a1', 1, 'fA'),
          threadInput('t-a0', 0, 'fA'),
        ];

        expect(buildNavTree(folders, threads)).toEqual([
          folderItem('fA', [folderItem('fC'), threadItem('t-a0'), threadItem('t-a1')]),
          folderItem('fB'),
          threadItem('t-root', true),
        ]);
      });
    });
  });

  describe('GIVEN a thread pointing at a missing folder', () => {
    describe('WHEN the tree is built', () => {
      test('THEN the orphan lands at the root', () => {
        expect(buildNavTree([], [threadInput('t1', 0, 'missing')])).toEqual([threadItem('t1')]);
      });
    });
  });
});

describe('findInTree', () => {
  describe('GIVEN a nested tree', () => {
    describe('WHEN a nested id is searched', () => {
      test('THEN the item is found', () => {
        const items = [folderItem('f1', [threadItem('t1')])];

        expect(findInTree(items, 't1')).toEqual(threadItem('t1'));
      });
    });

    describe('WHEN an unknown id is searched', () => {
      test('THEN nothing is found', () => {
        expect(findInTree([folderItem('f1')], 'ghost')).toBeNull();
      });
    });
  });
});

describe('collectIds', () => {
  describe('GIVEN a nested tree', () => {
    describe('WHEN its ids are collected', () => {
      test('THEN every folder and thread id is listed depth-first', () => {
        const items = [folderItem('f1', [folderItem('f2', [threadItem('t1')]), threadItem('t2')]), threadItem('t3')];

        expect(collectIds(items)).toEqual(['f1', 'f2', 't1', 't2', 't3']);
      });
    });
  });
});

describe('findOutermostItems', () => {
  describe('GIVEN a selection holding a folder, one of its children and a root thread', () => {
    const items = [folderItem('f1', [threadItem('t1'), folderItem('f2')]), threadItem('t2'), threadItem('t3')];

    describe('WHEN the outermost selected items are picked', () => {
      test('THEN the child stays inside its selected folder and the rest follows the tree order', () => {
        expect(findOutermostItems(items, new Set(['t3', 't1', 'f1']))).toEqual([items[0], items[2]]);
      });
    });

    describe('WHEN only nested items are selected', () => {
      test('THEN each of them is picked', () => {
        expect(findOutermostItems(items, new Set(['f2', 't1']))).toEqual([threadItem('t1'), folderItem('f2')]);
      });
    });
  });
});

describe('findFirstThread', () => {
  describe('GIVEN a tree starting with a folder', () => {
    describe('WHEN the first thread is searched', () => {
      test('THEN the nested thread wins over later root threads', () => {
        const items = [folderItem('f1', [threadItem('t1')]), threadItem('t2')];

        expect(findFirstThread(items)).toBe('t1');
      });
    });
  });

  describe('GIVEN a tree without threads', () => {
    describe('WHEN the first thread is searched', () => {
      test('THEN nothing is found', () => {
        expect(findFirstThread([folderItem('f1'), folderItem('f2')])).toBeNull();
      });
    });
  });
});

describe('getSubtreeDepth', () => {
  describe('GIVEN items of growing nesting', () => {
    describe('WHEN their subtree depth is measured', () => {
      test('THEN a thread takes no level and every folder reserves one for its content', () => {
        expect(getSubtreeDepth(threadItem('t1'))).toBe(0);
        expect(getSubtreeDepth(folderItem('f1'))).toBe(1);
        expect(getSubtreeDepth(folderItem('f1', [threadItem('t1')]))).toBe(1);
        expect(getSubtreeDepth(folderItem('f1', [threadItem('t1'), folderItem('f2', [threadItem('t2')])]))).toBe(2);
      });
    });
  });
});

describe('getMaxSubtreeDepth', () => {
  describe('GIVEN a tree with a shallow and a deep folder', () => {
    const items = [folderItem('f1'), folderItem('f2', [folderItem('f3')]), threadItem('t1')];

    describe('WHEN several ids are measured together', () => {
      test('THEN the deepest subtree wins and unknown ids are ignored', () => {
        expect(getMaxSubtreeDepth(items, ['t1', 'f1', 'f2', 'ghost'])).toBe(2);
        expect(getMaxSubtreeDepth(items, ['t1', 'ghost'])).toBe(0);
      });
    });
  });
});

describe('findParentId', () => {
  describe('GIVEN a nested tree', () => {
    describe('WHEN the parent of a root item is searched', () => {
      test('THEN the parent is null', () => {
        expect(findParentId([threadItem('t1')], 't1')).toBeNull();
      });
    });

    describe('WHEN the parent of a nested item is searched', () => {
      test('THEN the folder id is returned', () => {
        const items = [folderItem('f1', [folderItem('f2', [threadItem('t1')])])];

        expect(findParentId(items, 't1')).toBe('f2');
      });
    });

    describe('WHEN an unknown id is searched', () => {
      test('THEN nothing is found', () => {
        expect(findParentId([folderItem('f1')], 'ghost')).toBeUndefined();
      });
    });
  });
});

describe('getSiblings', () => {
  describe('GIVEN a nested tree', () => {
    describe('WHEN the root siblings are requested', () => {
      test('THEN the root items are returned', () => {
        const items = [folderItem('f1'), threadItem('t1')];

        expect(getSiblings(items, null)).toBe(items);
      });
    });

    describe('WHEN a folder is the parent', () => {
      test('THEN its children are returned', () => {
        const items = [folderItem('f1', [threadItem('t1'), threadItem('t2')])];

        expect(getSiblings(items, 'f1')).toEqual([threadItem('t1'), threadItem('t2')]);
      });
    });

    describe('WHEN the parent is a thread or missing', () => {
      test('THEN no siblings are returned', () => {
        const items = [folderItem('f1', [threadItem('t1')])];

        expect(getSiblings(items, 't1')).toEqual([]);
        expect(getSiblings(items, 'ghost')).toEqual([]);
      });
    });
  });
});

describe('containsThread', () => {
  describe('GIVEN a folder with a deeply nested thread', () => {
    describe('WHEN the thread is searched', () => {
      test('THEN the folder contains it', () => {
        const folder = folderItem('f1', [folderItem('f2', [threadItem('t1')])]);

        expect(containsThread(folder, 't1')).toBe(true);
        expect(containsThread(folder, 'ghost')).toBe(false);
      });
    });
  });

  describe('GIVEN a bare thread', () => {
    describe('WHEN it is checked against itself', () => {
      test('THEN it matches only its own id', () => {
        expect(containsThread(threadItem('t1'), 't1')).toBe(true);
        expect(containsThread(threadItem('t1'), 't2')).toBe(false);
      });
    });
  });
});

describe('updateNavItemName', () => {
  describe('GIVEN a nested tree', () => {
    describe('WHEN a nested item is renamed', () => {
      test('THEN only that item changes', () => {
        const items = [folderItem('f1', [threadItem('t1'), threadItem('t2')])];

        expect(updateNavItemName(items, 't1', 'Renamed')).toEqual([
          folderItem('f1', [{ ...threadItem('t1'), name: 'Renamed' }, threadItem('t2')]),
        ]);
      });
    });
  });
});

describe('setThreadResolved', () => {
  describe('GIVEN a nested tree', () => {
    describe('WHEN a nested thread is marked resolved', () => {
      test('THEN only that thread changes', () => {
        const items = [folderItem('f1', [threadItem('t1'), threadItem('t2')])];

        expect(setThreadResolved(items, 't1', true)).toEqual([
          folderItem('f1', [threadItem('t1', true), threadItem('t2')]),
        ]);
      });
    });
  });

  describe('GIVEN a resolved root thread beside a folder', () => {
    describe('WHEN the thread loses its resolution', () => {
      test('THEN the mark clears and the folder keeps its shape', () => {
        const items = [threadItem('t1', true), folderItem('f1', [threadItem('t2', true)])];

        expect(setThreadResolved(items, 't1', false)).toEqual([
          threadItem('t1'),
          folderItem('f1', [threadItem('t2', true)]),
        ]);
      });
    });

    describe('WHEN a folder id is passed instead of a thread id', () => {
      test('THEN no item gains the mark', () => {
        const items = [threadItem('t1'), folderItem('f1', [threadItem('t2')])];

        expect(setThreadResolved(items, 'f1', true)).toEqual(items);
      });
    });
  });
});

describe('removeFromTree', () => {
  describe('GIVEN a nested tree', () => {
    describe('WHEN a nested item is removed', () => {
      test('THEN the siblings and the rest of the tree survive', () => {
        const items = [folderItem('f1', [threadItem('t1'), threadItem('t2')]), threadItem('t3')];

        expect(removeFromTree(items, 't1')).toEqual([folderItem('f1', [threadItem('t2')]), threadItem('t3')]);
      });
    });

    describe('WHEN a root folder is removed', () => {
      test('THEN it disappears with its children', () => {
        const items = [folderItem('f1', [threadItem('t1')]), threadItem('t2')];

        expect(removeFromTree(items, 'f1')).toEqual([threadItem('t2')]);
      });
    });
  });
});

describe('insertIntoTree', () => {
  describe('GIVEN a tree with root items', () => {
    describe('WHEN an item is inserted at a root position', () => {
      test('THEN it lands between the existing items', () => {
        const items = [threadItem('t1'), threadItem('t3')];

        expect(insertIntoTree(items, threadItem('t2'), null, 1)).toEqual([
          threadItem('t1'),
          threadItem('t2'),
          threadItem('t3'),
        ]);
      });
    });

    describe('WHEN an item is inserted into a nested folder', () => {
      test('THEN it lands inside the right folder at the right position', () => {
        const items = [folderItem('f1', [folderItem('f2', [threadItem('t1')])])];

        expect(insertIntoTree(items, threadItem('t0'), 'f2', 0)).toEqual([
          folderItem('f1', [folderItem('f2', [threadItem('t0'), threadItem('t1')])]),
        ]);
      });
    });
  });
});

describe('filterTree', () => {
  describe('GIVEN an empty query', () => {
    describe('WHEN the tree is filtered', () => {
      test('THEN the same items are returned untouched', () => {
        const items = [folderItem('f1', [threadItem('t1')])];

        expect(filterTree(items, '')).toBe(items);
      });
    });
  });

  describe('GIVEN a query matching only a nested thread', () => {
    describe('WHEN the tree is filtered', () => {
      test('THEN the folder is kept with only the matching descendants', () => {
        const items = [
          folderItem('f1', [
            { ...threadItem('t1'), name: 'Budget review' },
            { ...threadItem('t2'), name: 'Roadmap' },
          ]),
          { ...threadItem('t3'), name: 'Budget summary' },
          { ...threadItem('t4'), name: 'Notes' },
        ];

        expect(filterTree(items, 'budget')).toEqual([
          folderItem('f1', [{ ...threadItem('t1'), name: 'Budget review' }]),
          { ...threadItem('t3'), name: 'Budget summary' },
        ]);
      });
    });
  });

  describe('GIVEN a query matching a folder itself', () => {
    describe('WHEN none of its children match', () => {
      test('THEN the folder keeps its original children', () => {
        const items = [{ ...folderItem('f1', [threadItem('t1')]), name: 'Budgets' }];

        expect(filterTree(items, 'budget')).toEqual([{ ...folderItem('f1', [threadItem('t1')]), name: 'Budgets' }]);
      });
    });
  });

  describe('GIVEN a query matching nothing', () => {
    describe('WHEN the tree is filtered', () => {
      test('THEN the result is empty', () => {
        expect(filterTree([folderItem('f1', [threadItem('t1')])], 'nothing')).toEqual([]);
      });
    });
  });
});
