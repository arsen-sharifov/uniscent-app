import { COPY } from '../../consts';
import { expect, test } from '../../fixtures';
import {
  expectSaved,
  getNavItem,
  getNode,
  getNodes,
  openNodeMenu,
  seedEdge,
  seedNodes,
  seedThread,
  selectTool,
  waitForCanvas,
} from '../../utils';

test.describe('discussion outcome', () => {
  test.describe('GIVEN a node hanging off the central question', () => {
    test.beforeEach(async ({ page, workspace, account }) => {
      const thread = await seedThread(workspace.id, 'Outcome', account.id, { question: 'Which option wins?' });
      const [optionId] = await seedNodes(thread.id, account.id, [{ label: 'Option A', x: 460, y: 440 }]);
      await seedEdge(thread.id, thread.questionNodeId, optionId ?? '');
      await page.goto(`/platform/${workspace.id}/${thread.id}`);
      await waitForCanvas(page);
    });

    test.describe('WHEN the node is marked as a valid step', () => {
      test.beforeEach(async ({ page }) => {
        await selectTool(page, COPY.platform.canvas.tools.items.validPath.label);
        await getNode(page, 'Option A').click();
        await expectSaved(page);
      });

      test('THEN the node carries the valid badge after a reload', async ({ page }) => {
        await expect(getNode(page, 'Option A')).toContainText(COPY.platform.canvas.node.validBadge);

        await page.reload();
        await waitForCanvas(page);

        await expect(getNode(page, 'Option A')).toContainText(COPY.platform.canvas.node.validBadge);
      });
    });

    test.describe('WHEN the node is marked as the answer', () => {
      test.beforeEach(async ({ page }) => {
        await selectTool(page, COPY.platform.canvas.tools.items.answer.label);
        await getNode(page, 'Option A').click();
      });

      test('THEN the canvas and the sidebar both report the discussion as resolved', async ({ page }) => {
        await expect(getNode(page, 'Option A')).toContainText(COPY.platform.canvas.node.answerBadge);
        await expect(page.getByText(COPY.platform.canvas.resolution.resolved, { exact: true })).toBeVisible();
        await expect(getNavItem(page, 'Outcome').getByLabel(COPY.platform.sidebar.resolved)).toBeVisible();
      });
    });

    test.describe('WHEN the answer is unmarked from the context menu', () => {
      test.beforeEach(async ({ page }) => {
        await selectTool(page, COPY.platform.canvas.tools.items.answer.label);
        await getNode(page, 'Option A').click();
        await expect(getNode(page, 'Option A')).toContainText(COPY.platform.canvas.node.answerBadge);
        const menu = await openNodeMenu(page, getNode(page, 'Option A'));
        await menu.getByRole('menuitem', { name: COPY.platform.canvas.context.unmarkAnswer }).click();
        await expectSaved(page);
      });

      test('THEN the discussion is open again on both surfaces', async ({ page }) => {
        await expect(getNode(page, 'Option A')).not.toContainText(COPY.platform.canvas.node.answerBadge);
        await expect(page.getByText(COPY.platform.canvas.resolution.resolved, { exact: true })).toHaveCount(0);
        await expect(getNavItem(page, 'Outcome').getByLabel(COPY.platform.sidebar.resolved)).toHaveCount(0);
      });
    });

    test.describe('WHEN the node is marked as an invalid path', () => {
      test.beforeEach(async ({ page }) => {
        await selectTool(page, COPY.platform.canvas.tools.items.invalidPath.label);
        await getNode(page, 'Option A').click();
        await expectSaved(page);
      });

      test('THEN the node carries the invalid badge after a reload', async ({ page }) => {
        await expect(getNode(page, 'Option A')).toContainText(COPY.platform.canvas.node.invalidBadge);

        await page.reload();
        await waitForCanvas(page);

        await expect(getNode(page, 'Option A')).toContainText(COPY.platform.canvas.node.invalidBadge);
      });
    });

    test.describe('WHEN the node is removed with the delete tool', () => {
      test.beforeEach(async ({ page }) => {
        await selectTool(page, COPY.platform.canvas.tools.items.delete.label);
        await getNode(page, 'Option A').click();
        await expectSaved(page);
      });

      test('THEN it stays gone after a reload', async ({ page }) => {
        await expect(getNodes(page)).toHaveCount(0);

        await page.reload();
        await waitForCanvas(page);

        await expect(getNodes(page)).toHaveCount(0);
      });
    });
  });
});
