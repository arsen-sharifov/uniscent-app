import { COPY } from '../../consts';
import { expect, test } from '../../fixtures';
import {
  expectSaved,
  getNode,
  getPane,
  getReferenceNode,
  openNodeMenu,
  seedNodes,
  seedReferenceNode,
  seedThread,
  selectTool,
  waitForCanvas,
} from '../../utils';

test.describe('cross-canvas references', () => {
  test.describe('GIVEN another thread in the workspace holding the source node', () => {
    test.beforeEach(async ({ page, workspace, account }) => {
      const source = await seedThread(workspace.id, 'Source thread', account.id, { question: 'Where is the proof?' });
      await seedNodes(source.id, account.id, [{ label: 'Key insight', x: 460, y: 440 }]);
      const target = await seedThread(workspace.id, 'Target thread', account.id, {
        question: 'What backs this up?',
        position: 1,
      });
      await page.goto(`/platform/${workspace.id}/${target.id}`);
      await waitForCanvas(page);
    });

    test.describe('WHEN the cross-reference tool links that node through the search panel', () => {
      test.beforeEach(async ({ page }) => {
        await selectTool(page, COPY.platform.canvas.tools.items.crossReference.label);
        await getPane(page).click({ position: { x: 480, y: 600 } });

        const panel = page.getByRole('dialog', { name: COPY.platform.canvas.referenceSearch.placeholder });
        await expect(panel).toBeVisible();
        await panel.getByRole('combobox').fill('Key insight');
        await panel.getByRole('option', { name: 'Key insight' }).click();
        await expectSaved(page);
      });

      test('THEN the reference card names its source and survives a reload', async ({ page }) => {
        await expect(getReferenceNode(page)).toContainText('Key insight');
        await expect(getReferenceNode(page)).toContainText('Source thread');

        await page.reload();
        await waitForCanvas(page);

        await expect(getReferenceNode(page)).toContainText('Key insight');
      });
    });
  });

  test.describe('GIVEN a canvas holding a reference to another thread', () => {
    let sourceThreadId: string;

    test.beforeEach(async ({ page, workspace, account }) => {
      const source = await seedThread(workspace.id, 'Source thread', account.id, { question: 'Where is the proof?' });
      const [insightId] = await seedNodes(source.id, account.id, [{ label: 'Key insight', x: 460, y: 440 }]);
      sourceThreadId = source.id;
      const target = await seedThread(workspace.id, 'Target thread', account.id, {
        question: 'What backs this up?',
        position: 1,
      });
      await seedReferenceNode(target.id, account.id, insightId ?? '', { label: 'Key insight', x: 700, y: 440 });
      await page.goto(`/platform/${workspace.id}/${target.id}`);
      await waitForCanvas(page);
      await expect(getReferenceNode(page)).toBeVisible();
    });

    test.describe('WHEN the referenced canvas is opened from the reference context menu', () => {
      test.beforeEach(async ({ page }) => {
        const menu = await openNodeMenu(page, getReferenceNode(page));
        await menu.getByRole('menuitem', { name: COPY.platform.canvas.context.openReferenced }).click();
      });

      test('THEN the source canvas takes over with the source node in view', async ({ page, workspace }) => {
        await expect(page).toHaveURL(new RegExp(`/platform/${workspace.id}/${sourceThreadId}\\?focus=ref&node=`));

        await waitForCanvas(page);

        await expect(getNode(page, 'Key insight')).toBeVisible();
      });
    });

    test.describe('WHEN the reference is deleted from its context menu', () => {
      test.beforeEach(async ({ page }) => {
        const menu = await openNodeMenu(page, getReferenceNode(page));
        await menu.getByRole('menuitem', { name: COPY.platform.canvas.context.deleteReference }).click();
        await expectSaved(page);
      });

      test('THEN it stays gone after a reload', async ({ page }) => {
        await expect(getReferenceNode(page)).toHaveCount(0);

        await page.reload();
        await waitForCanvas(page);

        await expect(getReferenceNode(page)).toHaveCount(0);
      });
    });
  });
});
