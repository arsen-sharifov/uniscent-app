import { expect, type Locator, type Page } from '@playwright/test';

import { COPY } from '../consts';

export const getSidebar = (page: Page): Locator =>
  page.locator('aside').filter({ has: page.locator('[aria-haspopup="dialog"]') });

export const getStructureHeader = (page: Page): Locator =>
  getSidebar(page).locator('[data-sidebar-scroll] > div').first();

export const getNavRows = (page: Page): Locator => getSidebar(page).locator('[data-item-id]');

export const getNavRow = (page: Page, name: string): Locator => getNavRows(page).filter({ hasText: name });

export const getNavItem = (page: Page, name: string): Locator => getNavRow(page, name).getByRole('treeitem');

export const getEditingRow = (page: Page): Locator => getNavRows(page).filter({ has: page.locator('input') });

export const getUserMenuTrigger = (page: Page): Locator => page.locator('aside footer [aria-haspopup="dialog"]');

export const getWorkspaceTrigger = (page: Page): Locator =>
  getSidebar(page).locator('[aria-haspopup="dialog"]').first();

export const getWorkspacePanel = (page: Page): Locator =>
  page.getByRole('dialog').filter({ hasText: COPY.platform.sidebar.newWorkspace });

export const openWorkspacePanel = async (page: Page): Promise<Locator> => {
  await getWorkspaceTrigger(page).click();
  const panel = getWorkspacePanel(page);
  await expect(panel).toBeVisible();

  return panel;
};

export const getWorkspaceRows = (panel: Locator): Locator => panel.locator('[data-workspace-id]');

export const getWorkspaceRow = (panel: Locator, name: string): Locator =>
  getWorkspaceRows(panel).filter({ hasText: name });

export const createThread = async (page: Page): Promise<void> => {
  await getStructureHeader(page).getByTitle(COPY.platform.sidebar.newThread).click();
};

export const createFolder = async (page: Page): Promise<void> => {
  await getStructureHeader(page).getByTitle(COPY.platform.sidebar.newFolder).click();
};

export const runRowAction = async (row: Locator, action: string): Promise<void> => {
  await row.hover();
  await row.getByTitle(action).click();
};

export const commitRename = async (row: Locator, name: string): Promise<void> => {
  const input = row.locator('input');
  await expect(input).toBeFocused();
  await input.fill(name);
  await input.press('Enter');
};

export const confirmDelete = async (page: Page): Promise<void> => {
  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: COPY.platform.sidebar.delete, exact: true }).click();
  await expect(dialog).toBeHidden();
};
