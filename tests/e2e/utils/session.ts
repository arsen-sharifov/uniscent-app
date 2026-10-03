import type { Page } from '@playwright/test';

import { COPY } from '../consts';
import { getUserMenuTrigger } from './sidebar';

const isPlatformUrl = (url: URL): boolean => url.pathname.startsWith('/platform');

export const signIn = async (page: Page, email: string, password: string): Promise<void> => {
  await page.goto('/login');
  await page.getByLabel(COPY.auth.signIn.email).fill(email);
  await page.getByLabel(COPY.auth.signIn.password).fill(password);
  await page.getByRole('button', { name: COPY.auth.signIn.submit, exact: true }).click();
  await page.waitForURL(isPlatformUrl);
};

export const signOut = async (page: Page): Promise<void> => {
  await getUserMenuTrigger(page).click();
  await page.getByRole('dialog').getByRole('button', { name: COPY.platform.sidebar.signOut }).click();
  await page.waitForURL(/\/login$/);
};
