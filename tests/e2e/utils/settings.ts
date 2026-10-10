import { expect, type Locator, type Page } from '@playwright/test';

import { COPY, PREFERENCES_ENDPOINT } from '../consts';
import { getUserMenuTrigger, getWorkspaceRow, openWorkspacePanel, runRowAction } from './sidebar';

export const getSettingsModal = (page: Page, copy = COPY): Locator =>
  page.getByRole('dialog').filter({ has: page.getByRole('button', { name: copy.platform.settings.close }) });

export const getWorkspaceSettingsModal = (page: Page): Locator =>
  page.getByRole('dialog').filter({ has: page.getByRole('button', { name: COPY.platform.workspaceSettings.close }) });

export const openSettings = async (page: Page, copy = COPY): Promise<Locator> => {
  await getUserMenuTrigger(page).click();
  await page.getByRole('dialog').getByRole('button', { name: copy.platform.settings.title, exact: true }).click();

  const modal = getSettingsModal(page, copy);
  await expect(modal).toBeVisible();

  return modal;
};

export const openWorkspaceSettings = async (page: Page, workspaceName: string): Promise<Locator> => {
  const panel = await openWorkspacePanel(page);
  await runRowAction(getWorkspaceRow(panel, workspaceName), COPY.platform.sidebar.workspaceSettings);

  const modal = getWorkspaceSettingsModal(page);
  await expect(modal).toBeVisible();

  return modal;
};

export const waitForPreferencesSave = async (page: Page): Promise<void> => {
  const response = await page.waitForResponse(
    (candidate) => candidate.url().includes(PREFERENCES_ENDPOINT) && candidate.request().method() === 'POST',
  );

  expect(response.ok(), `Preferences save failed with ${response.status()}`).toBe(true);
};

export const openSection = async (modal: Locator, name: string): Promise<void> => {
  await modal.getByRole('button', { name, exact: true }).click();
  await expect(modal.getByRole('heading', { name, exact: true })).toBeVisible();
};

export const inviteTeammate = async (modal: Locator, email: string): Promise<void> => {
  await openSection(modal, COPY.platform.workspaceSettings.sections.members);
  await modal.getByPlaceholder(COPY.platform.workspaceSettings.members.emailPlaceholder).fill(email);
  await modal.getByRole('button', { name: COPY.platform.workspaceSettings.members.sendInvite, exact: true }).click();
  await expect(modal).toContainText(email);
};

export const createRole = async (modal: Locator, name: string): Promise<void> => {
  await openSection(modal, COPY.platform.workspaceSettings.sections.roles);
  await modal.getByRole('button', { name: COPY.platform.workspaceSettings.roles.newRole }).click();
  await modal.getByPlaceholder(COPY.platform.workspaceSettings.roles.namePlaceholder).fill(name);
  await modal.getByRole('switch', { name: COPY.platform.workspaceSettings.permissions.canComment.name }).click();
  await modal.getByRole('button', { name: COPY.platform.workspaceSettings.roles.create, exact: true }).click();
  await expect(modal.getByRole('heading', { name, exact: true })).toBeVisible();
};
