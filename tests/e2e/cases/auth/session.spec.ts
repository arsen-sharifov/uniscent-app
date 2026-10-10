import { COPY } from '../../consts';
import { expect, guestTest, test } from '../../fixtures';
import { deleteAccount, getErrorToast, getSidebar, seedAccount, signIn, signOut, uniqueLabel } from '../../utils';

guestTest.describe('sign in', () => {
  guestTest.describe('GIVEN a confirmed account and no session', () => {
    guestTest.beforeEach(async ({ page }) => {
      await page.goto('/login');
    });

    guestTest.describe('WHEN the right credentials are submitted', () => {
      guestTest.beforeEach(async ({ page, account }) => {
        await page.getByLabel(COPY.auth.signIn.email).fill(account.email);
        await page.getByLabel(COPY.auth.signIn.password).fill(account.password);
        await page.getByRole('button', { name: COPY.auth.signIn.submit, exact: true }).click();
      });

      guestTest('THEN the platform opens', async ({ page }) => {
        await expect(page).toHaveURL(/\/platform/);
        await expect(getSidebar(page)).toBeVisible();
      });
    });

    guestTest.describe('WHEN the password is wrong', () => {
      guestTest.beforeEach(async ({ page, account }) => {
        await page.getByLabel(COPY.auth.signIn.email).fill(account.email);
        await page.getByLabel(COPY.auth.signIn.password).fill('definitely-not-the-password');
        await page.getByRole('button', { name: COPY.auth.signIn.submit, exact: true }).click();
      });

      guestTest('THEN the sign-in form stays open behind an error toast', async ({ page }) => {
        await expect(getErrorToast(page, COPY.common.errors.invalidCredentials)).toBeVisible();
        await expect(page).toHaveURL(/\/login$/);
      });
    });
  });
});

guestTest.describe('route protection', () => {
  guestTest.describe('GIVEN a visitor without a session', () => {
    guestTest.describe('WHEN a platform route is opened directly', () => {
      guestTest.beforeEach(async ({ page }) => {
        await page.goto('/platform');
      });

      guestTest('THEN the sign-in form takes over', async ({ page }) => {
        await expect(page).toHaveURL(/\/login$/);
        await expect(page.getByRole('heading', { name: COPY.auth.signIn.heading })).toBeVisible();
      });
    });
  });
});

test.describe('session handover', () => {
  test.describe('GIVEN a signed-in user', () => {
    test.describe('WHEN the sign-in page is opened again', () => {
      test.beforeEach(async ({ page }) => {
        await page.goto('/login');
      });

      test('THEN the platform takes over', async ({ page }) => {
        await expect(page).toHaveURL(/\/platform/);
      });
    });
  });
});

test.describe('unknown routes', () => {
  test.describe('GIVEN a signed-in user who opened a route that does not exist', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/this-route-does-not-exist');
    });

    test.describe('WHEN the not-found page finishes loading', () => {
      test('THEN it offers a way back to the platform', async ({ page }) => {
        await expect(page.getByRole('heading', { name: COPY.common.errorPages.notFoundTitle })).toBeVisible();
        await expect(page.getByRole('link', { name: COPY.common.errorPages.backHome })).toBeVisible();
      });
    });

    test.describe('WHEN the way back is followed', () => {
      test.beforeEach(async ({ page }) => {
        await page.getByRole('link', { name: COPY.common.errorPages.backHome }).click();
      });

      test('THEN it lands back on the platform', async ({ page }) => {
        await expect(page).toHaveURL(/\/platform/);
      });
    });
  });
});

guestTest.describe('sign out', () => {
  guestTest.describe('GIVEN a freshly signed-in throwaway account', () => {
    let disposableId: string;

    guestTest.beforeEach(async ({ page }) => {
      const disposable = await seedAccount(uniqueLabel('out'));
      disposableId = disposable.id;
      await signIn(page, disposable.email, disposable.password);
    });

    guestTest.afterEach(async () => {
      await deleteAccount(disposableId);
    });

    guestTest.describe('WHEN they sign out from the user menu', () => {
      guestTest.beforeEach(async ({ page }) => {
        await signOut(page);
      });

      guestTest('THEN the session is gone and the platform is protected again', async ({ page }) => {
        await expect(page).toHaveURL(/\/login$/);

        await page.goto('/platform');

        await expect(page).toHaveURL(/\/login$/);
      });
    });
  });
});
