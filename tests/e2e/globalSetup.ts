import type { FullConfig } from '@playwright/test';

const WARMUP_ROUTES = [
  '/',
  '/login',
  '/signup',
  '/join',
  '/platform',
  '/platform/warmup/warmup',
  '/auth/verify-invite',
  '/auth/workspace-invite',
  '/auth/change-password',
  '/auth/delete-account',
];

const globalSetup = async (config: FullConfig): Promise<void> => {
  const baseURL = config.projects[0]?.use.baseURL;

  if (!baseURL) return;

  await Promise.all(WARMUP_ROUTES.map((route) => fetch(`${baseURL}${route}`).catch(() => null)));
};

export default globalSetup;
