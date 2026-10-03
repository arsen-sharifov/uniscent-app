import { type Download, expect, type Locator, type Page } from '@playwright/test';

import {
  CANVAS_NODE_TYPE,
  CONTEXT_MENU_ATTEMPTS,
  CONTEXT_MENU_TIMEOUT_MS,
  COPY,
  EDGE_SELECTOR,
  EXPORT_TIMEOUT_MS,
  LABEL_EDITOR_ATTEMPTS,
  LABEL_EDITOR_TIMEOUT_MS,
  NODE_SELECTOR,
  PANE_SELECTOR,
  QUESTION_NODE_TYPE,
  REFERENCE_NODE_TYPE,
  SAVE_STATE_ATTRIBUTE,
  SAVE_STATE_SAVED,
  SAVE_STATE_SELECTOR,
} from '../consts';

export const getPane = (page: Page): Locator => page.locator(PANE_SELECTOR);

export const getNodes = (page: Page): Locator => page.locator(`${NODE_SELECTOR}-${CANVAS_NODE_TYPE}`);

export const getNode = (page: Page, label: string): Locator => getNodes(page).filter({ hasText: label });

export const getQuestionNode = (page: Page): Locator => page.locator(`${NODE_SELECTOR}-${QUESTION_NODE_TYPE}`);

export const getReferenceNode = (page: Page): Locator => page.locator(`${NODE_SELECTOR}-${REFERENCE_NODE_TYPE}`);

export const getEdges = (page: Page): Locator => page.locator(EDGE_SELECTOR);

export const waitForCanvas = async (page: Page): Promise<void> => {
  await expect(getQuestionNode(page)).toBeVisible({ timeout: 30_000 });
};

export const expectSaved = async (page: Page): Promise<void> => {
  await expect(page.locator(SAVE_STATE_SELECTOR)).toHaveAttribute(SAVE_STATE_ATTRIBUTE, SAVE_STATE_SAVED);
};

const getToolbar = (page: Page): Locator =>
  page.getByRole('complementary', { name: COPY.platform.canvas.tools.ariaLabel });

export const selectTool = async (page: Page, label: string): Promise<void> => {
  await getToolbar(page).getByRole('button', { name: label, exact: true }).click();
};

export const downloadExport = async (page: Page, format: string): Promise<Download> => {
  await getToolbar(page).getByRole('button', { name: COPY.platform.canvas.export.label, exact: true }).click();

  const menu = page.getByRole('menu', { name: COPY.platform.canvas.export.label });
  await expect(menu).toBeVisible();

  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: EXPORT_TIMEOUT_MS }),
    menu.getByRole('menuitem', { name: format }).click(),
  ]);

  return download;
};

export const addNodeAt = async (page: Page, x: number, y: number): Promise<void> => {
  await selectTool(page, COPY.platform.canvas.tools.items.addNode.label);
  await getPane(page).click({ position: { x, y } });
};

const commitLabel = async (node: Locator, label: string, attempt = 1): Promise<void> => {
  await node.dblclick();

  const editor = node.locator('textarea');
  const opened = await editor
    .waitFor({ state: 'visible', timeout: LABEL_EDITOR_TIMEOUT_MS })
    .then(() => true)
    .catch(() => false);

  if (!opened && attempt < LABEL_EDITOR_ATTEMPTS) return commitLabel(node, label, attempt + 1);

  await editor.click();
  await editor.fill(label);
  await editor.press('Enter');
  await expect(editor).toHaveCount(0);
};

export const renameNode = async (page: Page, node: Locator, label: string): Promise<void> => {
  await selectTool(page, COPY.platform.canvas.tools.items.select.label);
  await commitLabel(node, label);
};

export const editQuestion = async (page: Page, label: string): Promise<void> => {
  await selectTool(page, COPY.platform.canvas.tools.items.select.label);
  await commitLabel(getQuestionNode(page), label);
};

const openContextMenu = async (
  page: Page,
  target: Locator,
  options: { force?: boolean; position?: { x: number; y: number } } = {},
  attempt = 1,
): Promise<Locator> => {
  await target.click({ button: 'right', ...options });
  const menu = page.getByRole('menu', { name: COPY.platform.canvas.context.ariaLabel });
  const opened = await menu
    .waitFor({ state: 'visible', timeout: CONTEXT_MENU_TIMEOUT_MS })
    .then(() => true)
    .catch(() => false);

  if (opened || attempt === CONTEXT_MENU_ATTEMPTS) {
    await expect(menu).toBeVisible();

    return menu;
  }

  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();

  return openContextMenu(page, target, options, attempt + 1);
};

export const openNodeMenu = (page: Page, node: Locator): Promise<Locator> => openContextMenu(page, node);

export const openEdgeMenu = (page: Page): Promise<Locator> =>
  openContextMenu(page, getEdges(page).first(), { force: true });

export const openPaneMenu = (page: Page, position: { x: number; y: number }): Promise<Locator> =>
  openContextMenu(page, getPane(page), { position });

export const addNodeComment = async (node: Locator, text: string): Promise<void> => {
  await node.hover();
  await node.getByRole('button', { name: COPY.platform.canvas.node.addComment }).click();
  await node.getByPlaceholder(COPY.platform.canvas.node.addCommentPlaceholder).fill(text);
  await node.getByRole('button', { name: COPY.platform.canvas.node.sendComment }).click();
};
