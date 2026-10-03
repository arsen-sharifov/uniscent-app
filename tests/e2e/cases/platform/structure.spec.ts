import { COPY } from '../../consts';
import { expect, test } from '../../fixtures';
import {
  commitRename,
  confirmDelete,
  createFolder,
  createThread,
  getEditingRow,
  getNavItem,
  getNavRow,
  getNavRows,
  getQuestionNode,
  getSidebar,
  getStatusToast,
  runRowAction,
  seedFolder,
  seedThread,
} from '../../utils';

test.describe('thread creation', () => {
  test.describe('GIVEN an empty workspace', () => {
    test.beforeEach(async ({ page, workspace }) => {
      await page.goto('/platform');
      await expect(getSidebar(page)).toContainText(workspace.name);
    });

    test.describe('WHEN a thread is created and named', () => {
      test.beforeEach(async ({ page }) => {
        await createThread(page);
        await commitRename(getEditingRow(page), 'Pricing debate');
      });

      test('THEN it opens on a canvas of its own', async ({ page, workspace }) => {
        await expect(getNavItem(page, 'Pricing debate')).toBeVisible();
        await expect(page).toHaveURL(new RegExp(`/platform/${workspace.id}/`));
        await expect(getQuestionNode(page)).toBeVisible();
      });
    });

    test.describe('WHEN a thread is started from the empty canvas', () => {
      test.beforeEach(async ({ page }) => {
        await page.getByRole('main').getByRole('button', { name: COPY.platform.sidebar.newThread }).click();
      });

      test('THEN it opens on a canvas of its own', async ({ page, workspace }) => {
        await expect(page).toHaveURL(new RegExp(`/platform/${workspace.id}/`));
        await expect(getQuestionNode(page)).toBeVisible();
        await expect(getEditingRow(page)).toBeVisible();
      });
    });

    test.describe('WHEN a folder is created and a thread is added inside it', () => {
      test.beforeEach(async ({ page }) => {
        await createFolder(page);
        await commitRename(getEditingRow(page), 'Research');
        await runRowAction(getNavRow(page, 'Research'), COPY.platform.sidebar.newThread);
        await commitRename(getEditingRow(page), 'Interview notes');
      });

      test('THEN the thread is nested one level under the folder', async ({ page }) => {
        await expect(getNavItem(page, 'Research')).toHaveAttribute('aria-level', '1');
        await expect(getNavItem(page, 'Interview notes')).toHaveAttribute('aria-level', '2');
      });
    });
  });
});

test.describe('thread maintenance', () => {
  test.describe('GIVEN a workspace holding one thread', () => {
    test.beforeEach(async ({ page, workspace, account }) => {
      await seedThread(workspace.id, 'Roadmap', account.id);
      await page.goto('/platform');
      await expect(getNavItem(page, 'Roadmap')).toBeVisible();
    });

    test.describe('WHEN the thread is renamed from its row actions', () => {
      test.beforeEach(async ({ page }) => {
        await runRowAction(getNavRow(page, 'Roadmap'), COPY.platform.sidebar.rename);
        await commitRename(getEditingRow(page), 'Roadmap 2027');
      });

      test('THEN the tree shows the new name and confirms the rename', async ({ page }) => {
        await expect(getNavItem(page, 'Roadmap 2027')).toBeVisible();
        await expect(getStatusToast(page, COPY.platform.sidebar.threadRenamed)).toBeVisible();
      });
    });

    test.describe('WHEN the thread is deleted and the dialog is confirmed', () => {
      test.beforeEach(async ({ page }) => {
        await runRowAction(getNavRow(page, 'Roadmap'), COPY.platform.sidebar.delete);
        await confirmDelete(page);
      });

      test('THEN the tree falls back to its empty state', async ({ page }) => {
        await expect(getStatusToast(page, COPY.platform.sidebar.threadDeleted)).toBeVisible();
        await expect(getNavRows(page)).toHaveCount(0);
        await expect(getSidebar(page)).toContainText(COPY.platform.sidebar.emptyStructureTitle);
      });
    });
  });
});

test.describe('folder maintenance', () => {
  test.describe('GIVEN a folder holding one thread', () => {
    test.beforeEach(async ({ page, workspace, account }) => {
      const folder = await seedFolder(workspace.id, 'Archive box');
      await seedThread(workspace.id, 'Old debate', account.id, { folderId: folder.id });
      await page.goto('/platform');
      await expect(getNavItem(page, 'Archive box')).toBeVisible();
    });

    test.describe('WHEN the folder is renamed from its row actions', () => {
      test.beforeEach(async ({ page }) => {
        await runRowAction(getNavRow(page, 'Archive box'), COPY.platform.sidebar.rename);
        await commitRename(getEditingRow(page), 'Cold archive');
      });

      test('THEN the tree shows the new name and confirms the rename', async ({ page }) => {
        await expect(getNavItem(page, 'Cold archive')).toBeVisible();
        await expect(getStatusToast(page, COPY.platform.sidebar.folderRenamed)).toBeVisible();
      });
    });

    test.describe('WHEN the folder is deleted and the dialog is confirmed', () => {
      test.beforeEach(async ({ page }) => {
        await runRowAction(getNavRow(page, 'Archive box'), COPY.platform.sidebar.delete);
        await confirmDelete(page);
      });

      test('THEN the folder and its thread are both gone', async ({ page }) => {
        await expect(getStatusToast(page, COPY.platform.sidebar.folderDeleted)).toBeVisible();
        await expect(getNavRows(page)).toHaveCount(0);
        await expect(getSidebar(page)).toContainText(COPY.platform.sidebar.emptyStructureTitle);
      });
    });
  });
});

test.describe('bulk actions', () => {
  test.describe('GIVEN a workspace holding a folder and a root thread', () => {
    test.beforeEach(async ({ page, workspace, account }) => {
      await seedFolder(workspace.id, 'Research');
      await seedThread(workspace.id, 'Loose note', account.id, { position: 1 });
      await page.goto('/platform');
      await expect(getNavRows(page)).toHaveCount(2);
    });

    test.describe('WHEN the thread is selected and moved into the folder', () => {
      test.beforeEach(async ({ page }) => {
        await getNavItem(page, 'Loose note').click({ modifiers: ['ControlOrMeta'] });
        const bulkBar = getSidebar(page)
          .locator('div')
          .filter({ has: page.getByTitle(COPY.platform.sidebar.moveToFolder) })
          .last();
        await bulkBar.getByTitle(COPY.platform.sidebar.moveToFolder).click();

        const dialog = page
          .getByRole('dialog')
          .filter({ has: page.getByRole('heading', { name: COPY.platform.sidebar.moveToFolder }) });
        await expect(dialog).toBeVisible();
        await dialog.getByRole('button', { name: 'Research', exact: true }).click();
        await dialog.getByRole('button', { name: COPY.platform.sidebar.move, exact: true }).click();
        await expect(dialog).toBeHidden();
      });

      test('THEN the thread is nested one level under the folder', async ({ page }) => {
        await expect(getNavItem(page, 'Research')).toHaveAttribute('aria-level', '1');
        await expect(getNavItem(page, 'Loose note')).toHaveAttribute('aria-level', '2');
      });
    });

    test.describe('WHEN both items are selected and bulk-deleted', () => {
      test.beforeEach(async ({ page }) => {
        await getNavItem(page, 'Research').click({ modifiers: ['ControlOrMeta'] });
        await getNavItem(page, 'Loose note').click({ modifiers: ['ControlOrMeta'] });
        const bulkBar = getSidebar(page)
          .locator('div')
          .filter({ has: page.getByTitle(COPY.platform.sidebar.moveToFolder) })
          .last();
        await bulkBar.getByTitle(COPY.platform.sidebar.delete).click();
        await confirmDelete(page);
      });

      test('THEN the tree falls back to its empty state', async ({ page }) => {
        await expect(getStatusToast(page, COPY.platform.sidebar.itemsDeleted)).toBeVisible();
        await expect(getNavRows(page)).toHaveCount(0);
        await expect(getSidebar(page)).toContainText(COPY.platform.sidebar.emptyStructureTitle);
      });
    });
  });
});

test.describe('structure search', () => {
  test.describe('GIVEN a workspace holding two threads', () => {
    test.beforeEach(async ({ page, workspace, account }) => {
      await seedThread(workspace.id, 'Alpha launch', account.id, { position: 0 });
      await seedThread(workspace.id, 'Beta pricing', account.id, { position: 1 });
      await page.goto('/platform');
      await expect(getNavRows(page)).toHaveCount(2);
    });

    test.describe('WHEN the search box narrows the tree', () => {
      test.beforeEach(async ({ page }) => {
        await getSidebar(page).getByPlaceholder(COPY.platform.sidebar.searchPlaceholder).fill('Alpha');
      });

      test('THEN only the matching thread stays listed', async ({ page }) => {
        await expect(getNavRows(page)).toHaveCount(1);
        await expect(getNavItem(page, 'Alpha launch')).toBeVisible();
      });
    });

    test.describe('WHEN the search box matches nothing', () => {
      test.beforeEach(async ({ page }) => {
        await getSidebar(page).getByPlaceholder(COPY.platform.sidebar.searchPlaceholder).fill('nothing matches this');
      });

      test('THEN the tree reports no matches', async ({ page }) => {
        await expect(getNavRows(page)).toHaveCount(0);
        await expect(getSidebar(page)).toContainText(COPY.platform.sidebar.noSearchResults);
      });
    });
  });
});
