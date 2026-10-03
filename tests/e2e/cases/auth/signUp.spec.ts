import { COPY, E2E_ACCOUNT_DOMAIN, E2E_ACCOUNT_PASSWORD } from '../../consts';
import { expect, guestTest as test } from '../../fixtures';
import {
  declineTourOffer,
  deleteAccountByEmail,
  getInviteCode,
  getSidebar,
  readConfirmationLink,
  signIn,
  uniqueLabel,
} from '../../utils';

const REJECTED_EMAIL = `rejected@${E2E_ACCOUNT_DOMAIN}`;

test.describe('sign up', () => {
  test.describe('GIVEN the sign-up flow on its plan step', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/signup');
      await expect(page.getByRole('heading', { name: COPY.auth.signUp.planStep.heading })).toBeVisible();
    });

    test.describe('WHEN the beta plan is confirmed', () => {
      test.beforeEach(async ({ page }) => {
        await page.getByRole('button', { name: COPY.auth.signUp.planStep.continue }).click();
      });

      test('THEN the account step asks for an invite code', async ({ page }) => {
        await expect(page.getByRole('heading', { name: COPY.auth.signUp.heading })).toBeVisible();
        await expect(page.getByLabel(COPY.auth.signUp.accountStep.inviteCode)).toBeVisible();
      });
    });

    test.describe('WHEN the account step is submitted with a wrong invite code', () => {
      test.beforeEach(async ({ page }) => {
        await page.getByRole('button', { name: COPY.auth.signUp.planStep.continue }).click();
        await page.getByLabel(COPY.auth.signUp.accountStep.inviteCode).fill('not-a-real-invite-code');
        await page.getByLabel(COPY.auth.signUp.accountStep.name).fill('Rejected Signup');
        await page.getByLabel(COPY.auth.signUp.accountStep.email).fill(REJECTED_EMAIL);
        await page.getByLabel(COPY.auth.signUp.accountStep.password).fill(E2E_ACCOUNT_PASSWORD);
        await page.getByRole('button', { name: COPY.auth.signUp.accountStep.submit, exact: true }).click();
      });

      test('THEN the form refuses the code and keeps the visitor on the page', async ({ page }) => {
        await expect(page.getByText(COPY.auth.errors.invalidInviteCode)).toBeVisible();
        await expect(page).toHaveURL(/\/signup$/);
      });
    });
  });
});

test.describe('sign-up completion', () => {
  test.describe('GIVEN the account step filled with a valid invite code', () => {
    let email: string;

    test.beforeEach(async ({ page }) => {
      email = `${uniqueLabel('joiner')}@${E2E_ACCOUNT_DOMAIN}`;
      await page.goto('/signup');
      await page.getByRole('button', { name: COPY.auth.signUp.planStep.continue }).click();
      await page.getByLabel(COPY.auth.signUp.accountStep.inviteCode).fill(getInviteCode());
      await page.getByLabel(COPY.auth.signUp.accountStep.name).fill('Fresh Joiner');
      await page.getByLabel(COPY.auth.signUp.accountStep.email).fill(email);
      await page.getByLabel(COPY.auth.signUp.accountStep.password).fill(E2E_ACCOUNT_PASSWORD);
    });

    test.afterEach(async () => {
      await deleteAccountByEmail(email);
    });

    test.describe('WHEN the form is submitted', () => {
      test.beforeEach(async ({ page }) => {
        await page.getByRole('button', { name: COPY.auth.signUp.accountStep.submit, exact: true }).click();
      });

      test('THEN the sign-in page reports that a confirmation email is on its way', async ({ page }) => {
        await expect(page).toHaveURL(/\/login\?emailSent=true$/);
        await expect(page.getByText(COPY.auth.signIn.emailSent)).toBeVisible();
      });
    });

    test.describe('WHEN the emailed confirmation link is followed and the new credentials sign in', () => {
      test.beforeEach(async ({ page }) => {
        await page.getByRole('button', { name: COPY.auth.signUp.accountStep.submit, exact: true }).click();
        await page.waitForURL(/\/login/);
        await page.goto(await readConfirmationLink(email));
        await page.context().clearCookies();
        await signIn(page, email, E2E_ACCOUNT_PASSWORD);
        await page.waitForURL(/\/platform/);
        await declineTourOffer(page);
      });

      test('THEN the platform opens for the confirmed account', async ({ page }) => {
        await expect(page).toHaveURL(/\/platform/);
        await expect(getSidebar(page)).toBeVisible();
      });
    });
  });
});
