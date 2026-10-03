import { COPY, COPY_UK, VIEWPORT_SELECTOR } from '../../consts';
import { expect, guestTest, test } from '../../fixtures';
import type { IE2ESeededAccount } from '../../interfaces';
import {
  deleteAccountByEmail,
  getErrorToast,
  getSettingsModal,
  getSidebar,
  openSection,
  openSettings,
  seedAccount,
  seedMember,
  seedThread,
  seedWorkspace,
  signIn,
  signOut,
  uniqueLabel,
  waitForCanvas,
  waitForPreferencesSave,
} from '../../utils';

const NEW_PASSWORD = 'Uniscept-E2E-2!';

test.describe('the interface language', () => {
  test.describe('GIVEN a Ukrainian browser and an account that never picked a language', () => {
    test.use({ locale: 'uk-UA' });

    test.beforeEach(async ({ page, workspace }) => {
      await page.goto('/platform');
      await expect(getSidebar(page)).toContainText(workspace.name);
    });

    test.describe('WHEN the platform opens', () => {
      test('THEN it speaks the language of the browser', async ({ page }) => {
        await expect(page.locator('html')).toHaveAttribute('lang', 'uk');
        await expect(getSidebar(page)).toContainText(COPY_UK.platform.sidebar.structure);
      });
    });

    test.describe('WHEN the appearance settings are opened', () => {
      test.beforeEach(async ({ page }) => {
        const modal = await openSettings(page, COPY_UK);
        await openSection(modal, COPY_UK.platform.settings.sections.appearance);
      });

      test('THEN the language in use is the one marked as picked', async ({ page }) => {
        await expect(
          page.getByRole('button', { name: COPY_UK.platform.settings.appearance.languages.uk, exact: true }),
        ).toHaveAttribute('aria-pressed', 'true');
      });
    });

    test.describe('WHEN another theme is picked and the page is reloaded', () => {
      test.beforeEach(async ({ page }) => {
        const modal = await openSettings(page, COPY_UK);
        await openSection(modal, COPY_UK.platform.settings.sections.appearance);
        const saved = waitForPreferencesSave(page);
        await page.getByRole('radio', { name: COPY_UK.platform.settings.appearance.themeEclipse }).click();
        await saved;
        await page.reload();
      });

      test('THEN the interface keeps the language of the browser', async ({ page }) => {
        await expect(page.locator('html')).toHaveAttribute('data-theme', 'eclipse');
        await expect(getSidebar(page)).toContainText(COPY_UK.platform.sidebar.structure);
      });
    });
  });
});

test.describe('appearance preferences', () => {
  test.describe('GIVEN the settings dialog on its appearance section', () => {
    test.beforeEach(async ({ page, workspace }) => {
      await page.goto('/platform');
      await expect(getSidebar(page)).toContainText(workspace.name);
      const modal = await openSettings(page);
      await openSection(modal, COPY.platform.settings.sections.appearance);
    });

    test.describe('WHEN another theme is picked', () => {
      test.beforeEach(async ({ page }) => {
        const saved = waitForPreferencesSave(page);
        await page.getByRole('radio', { name: COPY.platform.settings.appearance.themeEclipse }).click();
        await saved;
      });

      test('THEN the app repaints and keeps the theme after a reload', async ({ page }) => {
        await expect(page.locator('html')).toHaveAttribute('data-theme', 'eclipse');

        await page.reload();

        await expect(page.locator('html')).toHaveAttribute('data-theme', 'eclipse');
      });
    });

    test.describe('WHEN another language is picked', () => {
      test.beforeEach(async ({ page }) => {
        const saved = waitForPreferencesSave(page);
        await page.getByRole('button', { name: COPY.platform.settings.appearance.languages.uk, exact: true }).click();
        await saved;
      });

      test('THEN the interface is translated and stays translated after a reload', async ({ page }) => {
        await expect(page.getByRole('heading', { name: COPY_UK.platform.settings.sections.appearance })).toBeVisible();

        await page.reload();

        await expect(getSidebar(page)).toContainText(COPY_UK.platform.sidebar.structure);
      });
    });

    test.describe('WHEN another canvas pattern is picked', () => {
      test.beforeEach(async ({ page }) => {
        const saved = waitForPreferencesSave(page);
        await page.getByRole('radio', { name: COPY.platform.settings.appearance.patternLines }).click();
        await saved;
      });

      test('THEN the canvas texture changes and survives a reload', async ({ page }) => {
        await expect(page.locator('html')).toHaveAttribute('data-canvas-pattern', 'lines');

        await page.reload();

        await expect(page.locator('html')).toHaveAttribute('data-canvas-pattern', 'lines');
      });
    });
  });
});

test.describe('editor preferences', () => {
  test.describe('GIVEN the settings dialog on its editor section', () => {
    test.beforeEach(async ({ page, workspace, account }) => {
      const thread = await seedThread(workspace.id, 'Preferences', account.id, { question: 'Snap or not?' });
      await page.goto(`/platform/${workspace.id}/${thread.id}`);
      await waitForCanvas(page);
      const modal = await openSettings(page);
      await openSection(modal, COPY.platform.settings.sections.editor);
    });

    test.describe('WHEN snap to grid is switched on', () => {
      test.beforeEach(async ({ page }) => {
        const saved = waitForPreferencesSave(page);
        await page.getByRole('switch', { name: COPY.platform.settings.editor.snapToGrid }).click();
        await saved;
      });

      test('THEN the switch stays on after a reload', async ({ page }) => {
        await expect(page.getByRole('switch', { name: COPY.platform.settings.editor.snapToGrid })).toHaveAttribute(
          'aria-checked',
          'true',
        );

        await page.reload();
        await waitForCanvas(page);
        const modal = await openSettings(page);
        await openSection(modal, COPY.platform.settings.sections.editor);

        await expect(page.getByRole('switch', { name: COPY.platform.settings.editor.snapToGrid })).toHaveAttribute(
          'aria-checked',
          'true',
        );
      });
    });

    test.describe('WHEN smart guides are switched off', () => {
      test.beforeEach(async ({ page }) => {
        await expect(page.getByRole('switch', { name: COPY.platform.settings.editor.smartGuides })).toHaveAttribute(
          'aria-checked',
          'true',
        );
        const saved = waitForPreferencesSave(page);
        await page.getByRole('switch', { name: COPY.platform.settings.editor.smartGuides }).click();
        await saved;
      });

      test('THEN the switch stays off after a reload', async ({ page }) => {
        await expect(page.getByRole('switch', { name: COPY.platform.settings.editor.smartGuides })).toHaveAttribute(
          'aria-checked',
          'false',
        );

        await page.reload();
        await waitForCanvas(page);
        const modal = await openSettings(page);
        await openSection(modal, COPY.platform.settings.sections.editor);

        await expect(page.getByRole('switch', { name: COPY.platform.settings.editor.smartGuides })).toHaveAttribute(
          'aria-checked',
          'false',
        );
      });
    });

    test.describe('WHEN another default zoom level is picked', () => {
      test.beforeEach(async ({ page }) => {
        const saved = waitForPreferencesSave(page);
        await page
          .getByRole('radiogroup', { name: COPY.platform.settings.editor.defaultZoom })
          .getByRole('radio', { name: /125/ })
          .click();
        await saved;
      });

      test('THEN the choice stays picked after a reload', async ({ page }) => {
        await page.reload();
        await waitForCanvas(page);
        const modal = await openSettings(page);
        await openSection(modal, COPY.platform.settings.sections.editor);

        await expect(
          page
            .getByRole('radiogroup', { name: COPY.platform.settings.editor.defaultZoom })
            .getByRole('radio', { name: /125/ }),
        ).toHaveAttribute('aria-checked', 'true');
      });

      test('THEN the canvas opens at the chosen zoom after a reload', async ({ page }) => {
        await page.reload();
        await waitForCanvas(page);

        await expect(page.locator(VIEWPORT_SELECTOR)).toHaveAttribute('style', /scale\(1\.25\)/);
      });
    });
  });
});

guestTest.describe('security', () => {
  guestTest.describe('GIVEN a throwaway sole owner on the security section', () => {
    let disposable: IE2ESeededAccount;

    guestTest.beforeEach(async ({ page }) => {
      disposable = await seedAccount(uniqueLabel('sec'));
      await seedWorkspace(disposable.id, uniqueLabel('Solo'));
      await signIn(page, disposable.email, disposable.password);
      const modal = await openSettings(page);
      await openSection(modal, COPY.platform.settings.sections.security);
    });

    guestTest.afterEach(async () => {
      await deleteAccountByEmail(disposable.email);
    });

    guestTest.describe('WHEN the password is changed and the account signs back in with it', () => {
      guestTest.beforeEach(async ({ page }) => {
        const modal = getSettingsModal(page);
        await modal.getByLabel(COPY.platform.settings.security.currentPassword).fill(disposable.password);
        await modal.getByLabel(COPY.platform.settings.security.newPassword, { exact: true }).fill(NEW_PASSWORD);
        await modal.getByLabel(COPY.platform.settings.security.confirmPassword).fill(NEW_PASSWORD);
        await modal.getByRole('button', { name: COPY.platform.settings.security.updatePassword, exact: true }).click();
        await expect(modal.getByText(COPY.platform.settings.security.passwordUpdated, { exact: true })).toBeVisible();
        await modal.getByRole('button', { name: COPY.platform.settings.close }).click();
        await signOut(page);
        await signIn(page, disposable.email, NEW_PASSWORD);
      });

      guestTest('THEN the platform opens for the new credentials', async ({ page }) => {
        await expect(page).toHaveURL(/\/platform/);
        await expect(getSidebar(page)).toBeVisible();
      });
    });

    guestTest.describe('WHEN the wrong current password is submitted', () => {
      guestTest.beforeEach(async ({ page }) => {
        const modal = getSettingsModal(page);
        await modal.getByLabel(COPY.platform.settings.security.currentPassword).fill('definitely-not-the-password');
        await modal.getByLabel(COPY.platform.settings.security.newPassword, { exact: true }).fill(NEW_PASSWORD);
        await modal.getByLabel(COPY.platform.settings.security.confirmPassword).fill(NEW_PASSWORD);
        await modal.getByRole('button', { name: COPY.platform.settings.security.updatePassword, exact: true }).click();
      });

      guestTest('THEN the form refuses the change inline', async ({ page }) => {
        await expect(
          getSettingsModal(page).getByText(COPY.platform.settings.security.currentPasswordIncorrect, { exact: true }),
        ).toBeVisible();
      });
    });

    guestTest.describe('WHEN the account is deleted from the danger zone with its password', () => {
      guestTest.beforeEach(async ({ page }) => {
        const modal = getSettingsModal(page);
        await modal.getByRole('button', { name: COPY.platform.settings.security.deleteAccount, exact: true }).click();
        await modal.getByLabel(COPY.platform.settings.security.deletePassword).fill(disposable.password);
        await modal.getByRole('button', { name: COPY.platform.settings.security.deleteButton, exact: true }).click();
        await page.waitForURL(/\/login$/);
      });

      guestTest('THEN the credentials stop working', async ({ page }) => {
        await page.getByLabel(COPY.auth.signIn.email).fill(disposable.email);
        await page.getByLabel(COPY.auth.signIn.password).fill(disposable.password);
        await page.getByRole('button', { name: COPY.auth.signIn.submit, exact: true }).click();

        await expect(getErrorToast(page, COPY.common.errors.invalidCredentials)).toBeVisible();
      });
    });

    guestTest.describe('WHEN the deletion is confirmed with a wrong password', () => {
      guestTest.beforeEach(async ({ page }) => {
        const modal = getSettingsModal(page);
        await modal.getByRole('button', { name: COPY.platform.settings.security.deleteAccount, exact: true }).click();
        await modal.getByLabel(COPY.platform.settings.security.deletePassword).fill('definitely-not-the-password');
        await modal.getByRole('button', { name: COPY.platform.settings.security.deleteButton, exact: true }).click();
      });

      guestTest('THEN the refusal is toasted and the account stays signed in', async ({ page }) => {
        await expect(getErrorToast(page, COPY.common.errors.invalidCredentials)).toBeVisible();
        await expect(page).toHaveURL(/\/platform/);
        await expect(getSettingsModal(page)).toBeVisible();
      });
    });
  });

  guestTest.describe('GIVEN a throwaway owner of a workspace a teammate still uses, on the security section', () => {
    let owner: IE2ESeededAccount;
    let teammate: IE2ESeededAccount;
    let sharedName: string;

    guestTest.beforeEach(async ({ page }) => {
      owner = await seedAccount(uniqueLabel('owner'));
      teammate = await seedAccount(uniqueLabel('mate'));
      sharedName = uniqueLabel('Shared');
      const shared = await seedWorkspace(owner.id, sharedName);
      await seedMember(shared.id, teammate.id, 'member');
      await signIn(page, owner.email, owner.password);
      const modal = await openSettings(page);
      await openSection(modal, COPY.platform.settings.sections.security);
    });

    guestTest.afterEach(async () => {
      await deleteAccountByEmail(owner.email);
      await deleteAccountByEmail(teammate.email);
    });

    guestTest.describe('WHEN the account deletion is opened', () => {
      guestTest.beforeEach(async ({ page }) => {
        await getSettingsModal(page)
          .getByRole('button', { name: COPY.platform.settings.security.deleteAccount, exact: true })
          .click();
      });

      guestTest('THEN the shared workspace is named and the deletion cannot be confirmed', async ({ page }) => {
        const modal = getSettingsModal(page);

        await expect(
          modal.getByRole('alert').filter({ hasText: COPY.platform.settings.security.deleteBlocked }),
        ).toContainText(sharedName);
        await expect(modal.getByLabel(COPY.platform.settings.security.deletePassword)).toHaveCount(0);
        await expect(
          modal.getByRole('button', { name: COPY.platform.settings.security.deleteButton, exact: true }),
        ).toHaveCount(0);
      });
    });
  });
});

test.describe('profile', () => {
  test.describe('GIVEN the settings dialog on its profile section', () => {
    test.beforeEach(async ({ page, workspace }) => {
      await page.goto('/platform');
      await expect(getSidebar(page)).toContainText(workspace.name);
      const modal = await openSettings(page);
      await openSection(modal, COPY.platform.settings.sections.profile);
    });

    test.describe('WHEN the display name is changed and saved', () => {
      test.beforeEach(async ({ page }) => {
        const modal = getSettingsModal(page);
        await modal.getByPlaceholder(COPY.platform.settings.profile.namePlaceholder).fill('Renamed thinker');
        await modal.getByRole('button', { name: COPY.platform.settings.profile.save }).click();
        await expect(modal.getByText(COPY.platform.settings.profile.saved, { exact: true })).toBeVisible();
      });

      test('THEN the sidebar greets the new name after a reload', async ({ page }) => {
        await page.reload();

        await expect(getSidebar(page)).toContainText('Renamed thinker');
      });
    });
  });
});
