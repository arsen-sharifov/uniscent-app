import { COPY } from '../../consts';
import { expect, test as base } from '../../fixtures';
import type { IE2EWorkspace } from '../../interfaces';
import {
  addNodeAt,
  addNodeComment,
  deleteAccount,
  expectSaved,
  getNavItem,
  getNode,
  getNodes,
  getQuestionNode,
  getSidebar,
  getStructureHeader,
  renameNode,
  seedAccount,
  seedMember,
  seedMemberWithRole,
  seedNodes,
  seedRole,
  seedThread,
  seedWorkspace,
  selectTool,
  uniqueLabel,
  waitForCanvas,
} from '../../utils';

const test = base.extend<{
  hostedWorkspace: IE2EWorkspace;
  commenterWorkspace: IE2EWorkspace;
  editorWorkspace: IE2EWorkspace;
}>({
  hostedWorkspace: async ({ account }, use) => {
    const host = await seedAccount(uniqueLabel('host'));
    const workspace = await seedWorkspace(host.id, 'Shared workspace');
    await seedMember(workspace.id, account.id, 'viewer');

    const thread = await seedThread(workspace.id, 'Shared thread', host.id, { question: 'Can a viewer edit this?' });
    await seedNodes(thread.id, host.id, [{ label: 'Owner idea', x: 460, y: 440 }]);

    await use(workspace);

    await deleteAccount(host.id);
  },

  editorWorkspace: async ({ account }, use) => {
    const host = await seedAccount(uniqueLabel('ehost'));
    const workspace = await seedWorkspace(host.id, 'Editor lab');
    await seedMember(workspace.id, account.id, 'member');

    const thread = await seedThread(workspace.id, 'Editor thread', host.id, { question: 'Who edits what?' });
    await seedNodes(thread.id, host.id, [{ label: 'Host claim', x: 460, y: 440 }]);

    await use(workspace);

    await deleteAccount(host.id);
  },

  commenterWorkspace: async ({ account }, use) => {
    const host = await seedAccount(uniqueLabel('chost'));
    const workspace = await seedWorkspace(host.id, 'Comment lab');
    const roleId = await seedRole(workspace.id, 'Commenter', { canComment: true });
    await seedMemberWithRole(workspace.id, account.id, roleId);

    const thread = await seedThread(workspace.id, 'Comment thread', host.id, { question: 'Any objections?' });
    await seedNodes(thread.id, host.id, [{ label: 'Host proposal', x: 460, y: 440 }]);

    await use(workspace);

    await deleteAccount(host.id);
  },
});

test.describe('viewer access', () => {
  test.describe('GIVEN a workspace where the signed-in user only has the viewer role', () => {
    test.beforeEach(async ({ page, hostedWorkspace }) => {
      await page.goto('/platform');
      await expect(getSidebar(page)).toContainText(hostedWorkspace.name);
    });

    test.describe('WHEN the shared structure is opened', () => {
      test.beforeEach(async ({ page }) => {
        await expect(getNavItem(page, 'Shared thread')).toBeVisible();
      });

      test('THEN the structure is readable but not editable', async ({ page }) => {
        await expect(getStructureHeader(page).getByTitle(COPY.platform.sidebar.newThread)).toHaveCount(0);
        await expect(getStructureHeader(page).getByTitle(COPY.platform.sidebar.newFolder)).toHaveCount(0);
      });
    });

    test.describe('WHEN a node on the shared canvas is double-clicked', () => {
      test.beforeEach(async ({ page }) => {
        await getNavItem(page, 'Shared thread').click();
        await waitForCanvas(page);
        await selectTool(page, COPY.platform.canvas.tools.items.select.label);
        await getNode(page, 'Owner idea').dblclick();
      });

      test('THEN no label editor opens', async ({ page }) => {
        await expect(getNode(page, 'Owner idea').locator('textarea')).toHaveCount(0);
        await expect(getQuestionNode(page)).toBeVisible();
      });
    });
  });
});

test.describe('comment-only access', () => {
  test.describe('GIVEN a workspace where the signed-in user holds a comment-only custom role', () => {
    test.beforeEach(async ({ page, commenterWorkspace }) => {
      await page.goto('/platform');
      await expect(getSidebar(page)).toContainText(commenterWorkspace.name);
      await getNavItem(page, 'Comment thread').click();
      await waitForCanvas(page);
    });

    test.describe('WHEN the host node is double-clicked', () => {
      test.beforeEach(async ({ page }) => {
        await selectTool(page, COPY.platform.canvas.tools.items.select.label);
        await getNode(page, 'Host proposal').dblclick();
      });

      test('THEN no label editor opens', async ({ page }) => {
        await expect(getNode(page, 'Host proposal').locator('textarea')).toHaveCount(0);
        await expect(getQuestionNode(page)).toBeVisible();
      });
    });

    test.describe('WHEN a comment is posted on the host node', () => {
      test.beforeEach(async ({ page }) => {
        await addNodeComment(getNode(page, 'Host proposal'), 'Can we estimate the cost?');
        await expectSaved(page);
      });

      test('THEN the comment is listed on the node after a reload', async ({ page }) => {
        await expect(getNode(page, 'Host proposal')).toContainText('Can we estimate the cost?');

        await page.reload();
        await waitForCanvas(page);

        await expect(
          getNode(page, 'Host proposal').getByRole('button', { name: COPY.platform.canvas.node.viewComments }),
        ).toContainText('1');
      });
    });
  });
});

test.describe('editor access', () => {
  test.describe('GIVEN a workspace where the signed-in user holds the member role', () => {
    test.beforeEach(async ({ page, editorWorkspace }) => {
      await page.goto('/platform');
      await expect(getSidebar(page)).toContainText(editorWorkspace.name);
    });

    test.describe('WHEN the shared structure is inspected', () => {
      test.beforeEach(async ({ page }) => {
        await expect(getNavItem(page, 'Editor thread')).toBeVisible();
      });

      test('THEN the structure creation actions are available', async ({ page }) => {
        await expect(getStructureHeader(page).getByTitle(COPY.platform.sidebar.newThread)).toBeVisible();
        await expect(getStructureHeader(page).getByTitle(COPY.platform.sidebar.newFolder)).toBeVisible();
      });
    });

    test.describe("WHEN the host's node is double-clicked", () => {
      test.beforeEach(async ({ page }) => {
        await getNavItem(page, 'Editor thread').click();
        await waitForCanvas(page);
        await selectTool(page, COPY.platform.canvas.tools.items.select.label);
        await getNode(page, 'Host claim').dblclick();
      });

      test('THEN the authorship rule keeps the label editor closed', async ({ page }) => {
        await expect(getNode(page, 'Host claim').locator('textarea')).toHaveCount(0);
        await expect(getQuestionNode(page)).toBeVisible();
      });
    });

    test.describe('WHEN the member drops and renames their own node', () => {
      test.beforeEach(async ({ page }) => {
        await getNavItem(page, 'Editor thread').click();
        await waitForCanvas(page);
        await addNodeAt(page, 700, 300);
        await renameNode(page, getNodes(page).last(), 'Member insight');
        await expectSaved(page);
      });

      test('THEN the member node survives a reload', async ({ page }) => {
        await page.reload();
        await waitForCanvas(page);

        await expect(getNode(page, 'Member insight')).toBeVisible();
      });
    });
  });
});
