import { FileText, Folder, FolderOpen } from 'lucide-react';
import { describe, expect, test } from 'vitest';

import type { IFlattenedItem } from '@interfaces';

import { folderItem, threadItem } from '@mocks/sidebar';
import { flattenTree, getNavItemIcon } from '@/components/Sidebar/utils';

const TREE = [folderItem('f1', [threadItem('t1')]), folderItem('f2'), threadItem('t2')];

const row = (id: string, collapsedIds = new Set<string>()): IFlattenedItem =>
  flattenTree(TREE, collapsedIds).find((item) => item.id === id) as IFlattenedItem;

describe('getNavItemIcon', () => {
  describe('GIVEN a thread row', () => {
    describe('WHEN its icon is resolved', () => {
      test('THEN it is the document icon', () => {
        expect(getNavItemIcon(row('t2'))).toBe(FileText);
      });
    });
  });

  describe('GIVEN an empty folder row', () => {
    describe('WHEN its icon is resolved', () => {
      test('THEN it is the closed folder', () => {
        expect(getNavItemIcon(row('f2'))).toBe(Folder);
      });
    });
  });

  describe('GIVEN a collapsed folder with children', () => {
    describe('WHEN its icon is resolved', () => {
      test('THEN it is the closed folder', () => {
        expect(getNavItemIcon(row('f1', new Set(['f1'])))).toBe(Folder);
      });
    });
  });

  describe('GIVEN an expanded folder with children', () => {
    describe('WHEN its icon is resolved', () => {
      test('THEN it is the open folder', () => {
        expect(getNavItemIcon(row('f1'))).toBe(FolderOpen);
      });
    });
  });
});
