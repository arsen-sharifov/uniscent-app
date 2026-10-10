import { COPY } from '../../consts';
import { expect, test } from '../../fixtures';
import { addNodeComment, expectSaved, getNode, seedNodes, seedThread, waitForCanvas } from '../../utils';

test.describe('node comments', () => {
  test.describe('GIVEN a canvas node without comments', () => {
    test.beforeEach(async ({ page, workspace, account }) => {
      const thread = await seedThread(workspace.id, 'Comments', account.id, { question: 'What do you think?' });
      await seedNodes(thread.id, account.id, [{ label: 'Risky bet', x: 460, y: 440 }]);
      await page.goto(`/platform/${workspace.id}/${thread.id}`);
      await waitForCanvas(page);
    });

    test.describe('WHEN a comment is posted on the node', () => {
      test.beforeEach(async ({ page }) => {
        await addNodeComment(getNode(page, 'Risky bet'), 'Needs a cost estimate first.');
        await expectSaved(page);
      });

      test('THEN the comment is listed on the node after a reload', async ({ page }) => {
        await expect(getNode(page, 'Risky bet')).toContainText('Needs a cost estimate first.');

        await page.reload();
        await waitForCanvas(page);

        await expect(
          getNode(page, 'Risky bet').getByRole('button', { name: COPY.platform.canvas.node.viewComments }),
        ).toContainText('1');
      });
    });

    test.describe('WHEN an own comment is posted and deleted again', () => {
      test.beforeEach(async ({ page }) => {
        const node = getNode(page, 'Risky bet');
        await addNodeComment(node, 'Scratch that.');
        await expect(node).toContainText('Scratch that.');
        await node.getByText('Scratch that.').hover();
        await node.getByRole('button', { name: COPY.platform.canvas.comments.deleteAriaLabel }).click();
        await expectSaved(page);
      });

      test('THEN the node carries no comments after a reload', async ({ page }) => {
        await expect(getNode(page, 'Risky bet')).not.toContainText('Scratch that.');

        await page.reload();
        await waitForCanvas(page);

        await expect(
          getNode(page, 'Risky bet').getByRole('button', { name: COPY.platform.canvas.node.viewComments }),
        ).toHaveCount(0);
      });
    });
  });

  test.describe('GIVEN a node with a newer node right where its comments open', () => {
    test.beforeEach(async ({ page, workspace, account }) => {
      const thread = await seedThread(workspace.id, 'Layers', account.id, { question: 'Which bet?' });
      await seedNodes(thread.id, account.id, [{ label: 'Risky bet', x: 460, y: 440 }]);
      await seedNodes(thread.id, account.id, [{ label: 'Safe bet', x: 720, y: 440 }]);
      await page.goto(`/platform/${workspace.id}/${thread.id}`);
      await waitForCanvas(page);
    });

    test.describe('WHEN the comments of the older node are opened', () => {
      test.beforeEach(async ({ page }) => {
        const node = getNode(page, 'Risky bet');
        await node.hover();
        await node.getByRole('button', { name: COPY.platform.canvas.node.addComment }).click();
        await expect(node.getByPlaceholder(COPY.platform.canvas.node.addCommentPlaceholder)).toBeVisible();
      });

      test('THEN the panel sits on top of the newer node', async ({ page }) => {
        const box = await getNode(page, 'Safe bet').boundingBox();
        if (!box) throw new Error('The newer node is not on screen');

        const topmostIsPanel = await page.evaluate(
          ({ x, y }) => document.elementFromPoint(x, y)?.closest('[data-tour="canvasCommentsPanel"]') !== null,
          { x: box.x + box.width / 2, y: box.y + box.height / 2 },
        );

        expect(topmostIsPanel).toBe(true);
      });
    });
  });
});
