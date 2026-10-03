import { COPY, E2E_ACCOUNT_DOMAIN, E2E_ACCOUNT_PASSWORD } from '../../consts';
import { expect, guestTest as test } from '../../fixtures';
import type { IE2ESeededAccount } from '../../interfaces';
import {
  declineTourOffer,
  deleteAccountByEmail,
  getUserMenuTrigger,
  getWorkspaceRow,
  openWorkspacePanel,
  readInviteLink,
  seedAccount,
  seedInvitation,
  sendInviteEmail,
  signIn,
  uniqueLabel,
} from '../../utils';

test.describe('workspace join', () => {
  test.describe('GIVEN a teammate invited to a workspace by email', () => {
    let email: string;
    let inviteLink: string;

    test.beforeEach(async ({ workspace }) => {
      email = `${uniqueLabel('joined')}@${E2E_ACCOUNT_DOMAIN}`;
      await seedInvitation(workspace.id, email, 'member');
      await sendInviteEmail(email, workspace.name);
      inviteLink = await readInviteLink(email);
    });

    test.afterEach(async () => {
      await deleteAccountByEmail(email);
    });

    test.describe('WHEN the emailed link is followed', () => {
      test.beforeEach(async ({ page }) => {
        await page.goto(inviteLink);
      });

      test('THEN the invitation waits for an explicit acceptance', async ({ page }) => {
        await expect(page).toHaveURL(/\/join\?token_hash=/);
        await expect(page.getByRole('heading', { name: COPY.auth.join.heading })).toBeVisible();
        await expect(page.getByRole('button', { name: COPY.auth.join.accept, exact: true })).toBeEnabled();
      });
    });

    test.describe('WHEN the link is accepted and the account is completed', () => {
      test.beforeEach(async ({ page }) => {
        await page.goto(inviteLink);
        await page.getByRole('button', { name: COPY.auth.join.accept, exact: true }).click();
        await page.getByRole('button', { name: COPY.auth.signUp.planStep.continue }).click();
        await expect(page.getByRole('heading', { name: COPY.auth.signUp.inviteHeading })).toBeVisible();
        await expect(page.getByLabel(COPY.auth.signUp.accountStep.email)).toHaveValue(email);
        await page.getByLabel(COPY.auth.signUp.accountStep.name).fill('Invited Teammate');
        await page.getByLabel(COPY.auth.signUp.accountStep.password).fill(E2E_ACCOUNT_PASSWORD);
        await page.getByRole('button', { name: COPY.auth.signUp.accountStep.join, exact: true }).click();
        await page.waitForURL(/\/platform/);
        await declineTourOffer(page);
      });

      test('THEN the platform opens with the shared workspace joined', async ({ page, workspace }) => {
        await expect(page).toHaveURL(/\/platform/);

        const panel = await openWorkspacePanel(page);

        await expect(getWorkspaceRow(panel, workspace.name)).toBeVisible();
      });
    });

    test.describe('WHEN the link is accepted, the setup is left unfinished and the link is followed again', () => {
      test.beforeEach(async ({ page }) => {
        await page.goto(inviteLink);
        await page.getByRole('button', { name: COPY.auth.join.accept, exact: true }).click();
        await expect(page.getByRole('button', { name: COPY.auth.signUp.planStep.continue })).toBeVisible();
        await page.goto(inviteLink);
        await page.getByRole('button', { name: COPY.auth.signUp.planStep.continue }).click();
      });

      test('THEN the setup continues for the invited email without the account choice', async ({ page }) => {
        await expect(page.getByRole('heading', { name: COPY.auth.signUp.inviteHeading })).toBeVisible();
        await expect(page.getByLabel(COPY.auth.signUp.accountStep.email)).toHaveValue(email);
        await expect(page.getByRole('button', { name: COPY.auth.join.switchAccount })).toHaveCount(0);
      });
    });

    test.describe('WHEN a mail scanner fetches the link before the teammate accepts it', () => {
      test.beforeEach(async ({ page }) => {
        await page.request.get(inviteLink);
        await page.goto(inviteLink);
        await page.getByRole('button', { name: COPY.auth.join.accept, exact: true }).click();
        await page.getByRole('button', { name: COPY.auth.signUp.planStep.continue }).click();
      });

      test('THEN the link still opens the account setup for the invited email', async ({ page }) => {
        await expect(page.getByRole('heading', { name: COPY.auth.signUp.inviteHeading })).toBeVisible();
        await expect(page.getByLabel(COPY.auth.signUp.accountStep.email)).toHaveValue(email);
      });
    });
  });

  test.describe('GIVEN someone signed in with another account who follows an emailed invitation', () => {
    let email: string;
    let inviteLink: string;
    let current: IE2ESeededAccount;

    test.beforeEach(async ({ page, workspace }) => {
      email = `${uniqueLabel('switched')}@${E2E_ACCOUNT_DOMAIN}`;
      current = await seedAccount(uniqueLabel('current'));
      await seedInvitation(workspace.id, email, 'member');
      await sendInviteEmail(email, workspace.name);
      inviteLink = await readInviteLink(email);
      await signIn(page, current.email, current.password);
      await page.goto(inviteLink);
    });

    test.afterEach(async () => {
      await deleteAccountByEmail(email);
      await deleteAccountByEmail(current.email);
    });

    test.describe('WHEN the join page opens', () => {
      test('THEN the current account is named and both choices are offered', async ({ page }) => {
        await expect(page.getByText(COPY.auth.join.signedInAs.replace('{email}', current.email))).toBeVisible();
        await expect(page.getByRole('button', { name: COPY.auth.join.switchAccount })).toBeEnabled();
        await expect(page.getByRole('button', { name: COPY.auth.join.stay })).toBeEnabled();
      });
    });

    test.describe('WHEN they stay signed in', () => {
      test.beforeEach(async ({ page }) => {
        await page.getByRole('button', { name: COPY.auth.join.stay }).click();
        await page.waitForURL(/\/platform/);
      });

      test('THEN the platform opens for the current account', async ({ page }) => {
        await expect(getUserMenuTrigger(page)).toContainText(current.name);
      });
    });

    test.describe('WHEN they sign out and accept', () => {
      test.beforeEach(async ({ page }) => {
        await page.getByRole('button', { name: COPY.auth.join.switchAccount }).click();
        await page.getByRole('button', { name: COPY.auth.signUp.planStep.continue }).click();
      });

      test('THEN the account setup opens for the invited email', async ({ page }) => {
        await expect(page.getByRole('heading', { name: COPY.auth.signUp.inviteHeading })).toBeVisible();
        await expect(page.getByLabel(COPY.auth.signUp.accountStep.email)).toHaveValue(email);
      });
    });
  });

  test.describe('GIVEN an invitation link whose token is not valid', () => {
    test.describe('WHEN it is accepted', () => {
      test.beforeEach(async ({ page }) => {
        await page.goto('/join?token_hash=not-a-real-token');
        await page.getByRole('button', { name: COPY.auth.join.accept, exact: true }).click();
      });

      test('THEN the sign-in page explains that the link is invalid', async ({ page }) => {
        await expect(page).toHaveURL(/\/login\?error=invalid_code$/);
        await expect(page.getByRole('alert').filter({ hasText: COPY.auth.signIn.invalidLink })).toBeVisible();
      });
    });
  });

  test.describe('GIVEN a visitor without an invited session', () => {
    test.describe('WHEN the join page is opened directly', () => {
      test.beforeEach(async ({ page }) => {
        await page.goto('/join');
      });

      test('THEN the visitor lands on the sign-in page', async ({ page }) => {
        await expect(page).toHaveURL(/\/login/);
      });
    });
  });
});
