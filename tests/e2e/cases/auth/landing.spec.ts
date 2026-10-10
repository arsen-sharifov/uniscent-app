import { COPY, COPY_UK, LANDING_WORLD_SELECTOR } from '../../consts';
import { expect, guestTest as test } from '../../fixtures';

test.describe('landing page', () => {
  test.describe('GIVEN a visitor without a session', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/');
    });

    test.describe('WHEN the landing page finishes loading', () => {
      test('THEN it shows the hero pitch', async ({ page }) => {
        await expect(page.getByRole('heading', { name: COPY.landing.hero.title })).toBeVisible();
        await expect(page.getByText(COPY.landing.hero.tagline)).toBeVisible();
      });

      test('THEN it lists every pricing plan', async ({ page }) => {
        await expect(
          page.getByRole('heading', { name: COPY.landing.pricing.plans.demo.name, exact: true }),
        ).toBeVisible();
        await expect(
          page.getByRole('heading', { name: COPY.landing.pricing.plans.lite.name, exact: true }),
        ).toBeVisible();
        await expect(
          page.getByRole('heading', { name: COPY.landing.pricing.plans.standard.name, exact: true }),
        ).toBeVisible();
        await expect(
          page.getByRole('heading', { name: COPY.landing.pricing.plans.pro.name, exact: true }),
        ).toBeVisible();
      });
    });

    test.describe('WHEN the header sign-in link is followed', () => {
      test.beforeEach(async ({ page }) => {
        await page.getByRole('banner').getByRole('link', { name: COPY.landing.header.signIn }).click();
      });

      test('THEN the sign-in form opens', async ({ page }) => {
        await expect(page).toHaveURL(/\/login$/);
        await expect(page.getByRole('heading', { name: COPY.auth.signIn.heading })).toBeVisible();
      });
    });

    test.describe('WHEN the header call to action is followed', () => {
      test.beforeEach(async ({ page }) => {
        await page.getByRole('banner').getByRole('link', { name: COPY.landing.header.getStarted }).click();
      });

      test('THEN the sign-up flow opens on the plan step', async ({ page }) => {
        await expect(page).toHaveURL(/\/signup$/);
        await expect(page.getByRole('heading', { name: COPY.auth.signUp.planStep.heading })).toBeVisible();
      });
    });
  });

  test.describe('GIVEN a visitor whose browser speaks Ukrainian and runs a dark system scheme', () => {
    test.use({ locale: 'uk-UA', colorScheme: 'dark' });

    test.describe('WHEN the landing page opens with nothing picked yet', () => {
      test.beforeEach(async ({ page }) => {
        await page.goto('/');
      });

      test('THEN it speaks the language of the browser', async ({ page }) => {
        await expect(page.locator('html')).toHaveAttribute('lang', 'uk');
        await expect(page.getByRole('heading', { name: COPY_UK.landing.hero.title })).toBeVisible();
      });

      test('THEN it follows the dark scheme of the system', async ({ page }) => {
        await expect(page.locator('html')).toHaveAttribute('data-theme', 'auto');
        await expect(page.locator(LANDING_WORLD_SELECTOR)).toHaveCSS('color-scheme', 'dark');
      });
    });
  });

  test.describe('GIVEN a visitor whose browser asks only for unsupported languages and runs a light system scheme', () => {
    test.use({ locale: 'de-DE', colorScheme: 'light' });

    test.describe('WHEN the landing page opens with nothing picked yet', () => {
      test.beforeEach(async ({ page }) => {
        await page.goto('/');
      });

      test('THEN it falls back to English', async ({ page }) => {
        await expect(page.locator('html')).toHaveAttribute('lang', 'en');
        await expect(page.getByRole('heading', { name: COPY.landing.hero.title })).toBeVisible();
      });

      test('THEN it follows the light scheme of the system', async ({ page }) => {
        await expect(page.locator(LANDING_WORLD_SELECTOR)).toHaveCSS('color-scheme', 'light');
      });
    });
  });
});
