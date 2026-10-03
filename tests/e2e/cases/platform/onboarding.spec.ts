import { COPY } from '../../consts';
import { expect, test } from '../../fixtures';
import {
  addNodeAt,
  answerOnboardingOffer,
  commitRename,
  createThread,
  declineTourOffer,
  deleteOnboarding,
  editQuestion,
  expectSaved,
  getEditingRow,
  getGuidePicker,
  getGuideRow,
  getHelpMenu,
  getNode,
  getNodes,
  getSidebar,
  getStepCard,
  getSettingsModal,
  getTourHint,
  getTourOffer,
  openHelpMenu,
  openSettings,
  readOnStep,
  renameNode,
  runHelpAction,
  startBasePass,
  waitForCanvas,
  waitForOnboardingSave,
  walkToQuestionStep,
  watchExample,
} from '../../utils';

const QUESTION = 'Do we ship on Friday?';

const CLAIM = 'The release checklist is green';

test.describe('the first sign-in offer', () => {
  test.describe('GIVEN an account that has never answered the offer', () => {
    test.beforeEach(async ({ account }) => {
      await deleteOnboarding(account.id);
    });

    test.describe('WHEN the platform opens', () => {
      test.beforeEach(async ({ page, workspace }) => {
        await page.goto('/platform');
        await expect(getSidebar(page)).toContainText(workspace.name);
      });

      test('THEN the tour is offered', async ({ page }) => {
        await expect(getTourOffer(page)).toBeVisible();
      });
    });

    test.describe('WHEN the offer is declined', () => {
      test.beforeEach(async ({ page, workspace }) => {
        await page.goto('/platform');
        await expect(getSidebar(page)).toContainText(workspace.name);
        await declineTourOffer(page);
      });

      test('THEN the help menu is pointed out as the place where the tour waits', async ({ page }) => {
        await expect(getTourHint(page)).toContainText(COPY.platform.onboarding.continueHint.afterDecline.title);
      });
    });

    test.describe('WHEN the pointer shown after declining is acknowledged', () => {
      test.beforeEach(async ({ page, workspace }) => {
        await page.goto('/platform');
        await expect(getSidebar(page)).toContainText(workspace.name);
        await declineTourOffer(page);
        await getTourHint(page).getByRole('button', { name: COPY.platform.onboarding.continueHint.dismiss }).click();
      });

      test('THEN it goes away without opening anything', async ({ page }) => {
        await expect(getTourHint(page)).toBeHidden();
        await expect(getGuidePicker(page)).toBeHidden();
      });
    });

    test.describe('WHEN the guides are opened from the pointer', () => {
      test.beforeEach(async ({ page, workspace }) => {
        await page.goto('/platform');
        await expect(getSidebar(page)).toContainText(workspace.name);
        await declineTourOffer(page);
        await getTourHint(page).getByRole('button', { name: COPY.platform.onboarding.continueHint.open }).click();
      });

      test('THEN the guide picker takes its place', async ({ page }) => {
        await expect(getGuidePicker(page)).toBeVisible();
        await expect(getTourHint(page)).toBeHidden();
      });
    });

    test.describe('WHEN the settings open while the pointer is shown', () => {
      test.beforeEach(async ({ page, workspace }) => {
        await page.goto('/platform');
        await expect(getSidebar(page)).toContainText(workspace.name);
        await declineTourOffer(page);
        await expect(getTourHint(page)).toBeVisible();
        await openSettings(page);
      });

      test('THEN the pointer steps aside instead of covering the dialog', async ({ page }) => {
        await expect(getTourHint(page)).toBeHidden();
      });
    });

    test.describe('WHEN the settings close again', () => {
      test.beforeEach(async ({ page, workspace }) => {
        await page.goto('/platform');
        await expect(getSidebar(page)).toContainText(workspace.name);
        await declineTourOffer(page);
        await expect(getTourHint(page)).toBeVisible();
        const modal = await openSettings(page);
        await modal.getByRole('button', { name: COPY.platform.settings.close }).click();
        await expect(getSettingsModal(page)).toBeHidden();
      });

      test('THEN the pointer comes back', async ({ page }) => {
        await expect(getTourHint(page)).toContainText(COPY.platform.onboarding.continueHint.afterDecline.title);
      });
    });

    test.describe('WHEN the offer is declined and the page is reloaded', () => {
      test.beforeEach(async ({ page, workspace }) => {
        await page.goto('/platform');
        await expect(getSidebar(page)).toContainText(workspace.name);
        const saved = waitForOnboardingSave(page);
        await declineTourOffer(page);
        await saved;
        await page.reload();
        await expect(getSidebar(page)).toBeVisible();
      });

      test('THEN it does not come back on its own', async ({ page }) => {
        await expect(getTourOffer(page)).toBeHidden();
      });
    });

    test.describe('WHEN the tour is started later from the help menu', () => {
      test.beforeEach(async ({ page, workspace }) => {
        await page.goto('/platform');
        await expect(getSidebar(page)).toContainText(workspace.name);
        await declineTourOffer(page);
        await expect(getTourOffer(page)).toBeHidden();
        await startBasePass(page);
      });

      test('THEN the base pass opens on its explanation', async ({ page }) => {
        await expect(getStepCard(page, COPY.platform.onboarding.steps.baseIntro.title)).toBeVisible();
      });
    });
  });
});

test.describe('the help menu', () => {
  test.describe('GIVEN a signed-in account on the platform', () => {
    test.beforeEach(async ({ page, workspace }) => {
      await page.goto('/platform');
      await expect(getSidebar(page)).toContainText(workspace.name);
    });

    test.describe('WHEN the menu is opened', () => {
      test.beforeEach(async ({ page }) => {
        await openHelpMenu(page);
      });

      test('THEN it offers the shortcuts and one entry for the tour and guides', async ({ page }) => {
        await expect(getHelpMenu(page).getByRole('menuitem')).toHaveText([
          COPY.platform.onboarding.menuShortcuts,
          COPY.platform.onboarding.menuGuides,
        ]);
      });
    });

    test.describe('WHEN the guides are opened before the first run', () => {
      test.beforeEach(async ({ page }) => {
        await runHelpAction(page, COPY.platform.onboarding.menuGuides);
      });

      test('THEN the area guides are locked behind the first run', async ({ page }) => {
        await expect(getGuideRow(page, COPY.platform.onboarding.guides.baseTitle)).toBeEnabled();
        await expect(getGuideRow(page, COPY.platform.onboarding.guides.canvasTitle)).toBeDisabled();
        await expect(getGuidePicker(page)).toContainText(COPY.platform.onboarding.pickerLocked);
      });
    });
  });
});

test.describe('the base pass', () => {
  test.describe('GIVEN a workspace with a thread already open', () => {
    test.beforeEach(async ({ page, workspace }) => {
      await page.goto('/platform');
      await expect(getSidebar(page)).toContainText(workspace.name);
      await createThread(page);
      await commitRename(getEditingRow(page), 'Tour thread');
      await waitForCanvas(page);
      await startBasePass(page);
    });

    test.describe('WHEN the run starts', () => {
      test('THEN it opens on the explanation before asking for anything', async ({ page }) => {
        await expect(getStepCard(page, COPY.platform.onboarding.steps.baseIntro.title)).toBeVisible();
      });
    });

    test.describe('WHEN the explanation is read', () => {
      test.beforeEach(async ({ page }) => {
        await readOnStep(page, COPY.platform.onboarding.steps.baseIntro.title);
      });

      test('THEN the satisfied workspace step is walked as already done, not skipped', async ({ page }) => {
        await expect(getStepCard(page, COPY.platform.onboarding.steps.baseWorkspace.title)).toContainText(
          COPY.platform.onboarding.stepDone,
        );
      });
    });

    test.describe('WHEN the workspace step is read as well', () => {
      test.beforeEach(async ({ page }) => {
        await readOnStep(page, COPY.platform.onboarding.steps.baseIntro.title);
        await readOnStep(page, COPY.platform.onboarding.steps.baseWorkspace.title);
      });

      test('THEN the satisfied thread step is walked as already done too', async ({ page }) => {
        await expect(getStepCard(page, COPY.platform.onboarding.steps.baseThread.title)).toContainText(
          COPY.platform.onboarding.stepDone,
        );
      });
    });

    test.describe('WHEN every satisfied step is read through', () => {
      test.beforeEach(async ({ page }) => {
        await walkToQuestionStep(page);
      });

      test('THEN the run lands on the question step', async ({ page }) => {
        await expect(getStepCard(page, COPY.platform.onboarding.steps.baseQuestion.title)).toBeVisible();
      });
    });

    test.describe('WHEN the central question is written', () => {
      test.beforeEach(async ({ page }) => {
        await walkToQuestionStep(page);
        await editQuestion(page, QUESTION);
      });

      test('THEN the run explains how an argument is built before asking for one', async ({ page }) => {
        await expect(getStepCard(page, COPY.platform.onboarding.steps.baseArgue.title)).toBeVisible();
      });
    });

    test.describe('WHEN the argument explanation is read', () => {
      test.beforeEach(async ({ page }) => {
        await walkToQuestionStep(page);
        await editQuestion(page, QUESTION);
        await readOnStep(page, COPY.platform.onboarding.steps.baseArgue.title);
      });

      test('THEN the run asks for the first claim', async ({ page }) => {
        await expect(getStepCard(page, COPY.platform.onboarding.steps.baseNode.title)).toBeVisible();
      });
    });

    test.describe('WHEN a reasoning node is added', () => {
      test.beforeEach(async ({ page }) => {
        await walkToQuestionStep(page);
        await editQuestion(page, QUESTION);
        await readOnStep(page, COPY.platform.onboarding.steps.baseArgue.title);
        await addNodeAt(page, 260, 520);
        await expect(getNodes(page)).toHaveCount(1);
      });

      test('THEN the run asks for the claim to be written', async ({ page }) => {
        await expect(getStepCard(page, COPY.platform.onboarding.steps.baseNodeText.title)).toBeVisible();
      });
    });

    test.describe('WHEN the new claim is written', () => {
      test.beforeEach(async ({ page }) => {
        await walkToQuestionStep(page);
        await editQuestion(page, QUESTION);
        await readOnStep(page, COPY.platform.onboarding.steps.baseArgue.title);
        await addNodeAt(page, 260, 520);
        await expect(getNodes(page)).toHaveCount(1);
        await renameNode(page, getNodes(page).first(), CLAIM);
      });

      test('THEN the run moves to the connect step', async ({ page }) => {
        await expect(getStepCard(page, COPY.platform.onboarding.steps.baseConnect.title)).toBeVisible();
      });
    });

    test.describe('WHEN the run is quit halfway', () => {
      test.beforeEach(async ({ page }) => {
        await walkToQuestionStep(page);
        await editQuestion(page, QUESTION);
        await readOnStep(page, COPY.platform.onboarding.steps.baseArgue.title);
        await addNodeAt(page, 260, 520);
        await expect(getNodes(page)).toHaveCount(1);
        await getStepCard(page, COPY.platform.onboarding.steps.baseNodeText.title)
          .getByRole('button', { name: COPY.platform.onboarding.quit })
          .click();
      });

      test('THEN the tour closes and everything created along the way stays', async ({ page }) => {
        await expect(getStepCard(page, COPY.platform.onboarding.steps.baseNodeText.title)).toBeHidden();
        await expect(getNode(page, COPY.platform.canvas.node.defaultLabel)).toBeVisible();
        await expect(page.getByText(QUESTION)).toBeVisible();
      });
    });

    test.describe('WHEN the guides are opened after quitting halfway', () => {
      test.beforeEach(async ({ page }) => {
        await walkToQuestionStep(page);
        await editQuestion(page, QUESTION);
        await readOnStep(page, COPY.platform.onboarding.steps.baseArgue.title);
        await getStepCard(page, COPY.platform.onboarding.steps.baseNode.title)
          .getByRole('button', { name: COPY.platform.onboarding.quit })
          .click();
        await runHelpAction(page, COPY.platform.onboarding.menuGuides);
      });

      test('THEN the base pass is still unfinished, so the area guides stay locked', async ({ page }) => {
        await expect(getGuidePicker(page)).toContainText(COPY.platform.onboarding.guides.canvasTitle);
        await expect(getGuideRow(page, COPY.platform.onboarding.guides.canvasTitle)).toBeDisabled();
      });
    });
  });
});

test.describe('the example guide', () => {
  test.describe('GIVEN an account that has finished the first run', () => {
    test.beforeEach(async ({ page, account, workspace }) => {
      test.slow();
      await answerOnboardingOffer(account.id, ['base']);
      await page.goto('/platform');
      await expect(getSidebar(page)).toContainText(workspace.name);
    });

    test.describe('WHEN the example is watched to the end', () => {
      test.beforeEach(async ({ page }) => {
        await watchExample(page);
      });

      test('THEN the example canvas is built and the user is asked whether to keep it', async ({ page }) => {
        const card = getStepCard(page, COPY.platform.onboarding.steps.exampleKeep.title);

        await expect(card.getByRole('button', { name: COPY.platform.onboarding.example.keep })).toBeVisible();
        await expect(card.getByRole('button', { name: COPY.platform.onboarding.example.remove })).toBeVisible();
        await expect(page.getByText(COPY.platform.onboarding.example.question)).toBeVisible();
        await expect(getNodes(page)).toHaveCount(Object.keys(COPY.platform.onboarding.example.nodes).length);
      });
    });

    test.describe('WHEN the example is kept', () => {
      test.beforeEach(async ({ page }) => {
        await watchExample(page);
        await getStepCard(page, COPY.platform.onboarding.steps.exampleKeep.title)
          .getByRole('button', { name: COPY.platform.onboarding.example.keep })
          .click();
      });

      test('THEN it stays as a normal thread and the guide counts as done', async ({ page }) => {
        await expect(getSidebar(page)).toContainText(COPY.platform.onboarding.example.threadName);
        await expect(getGuidePicker(page)).toContainText(
          COPY.platform.onboarding.pickerProgress.replace('{done}', '2').replace('{total}', '5'),
        );
      });
    });

    test.describe('WHEN the example is kept and the page is reloaded', () => {
      test.beforeEach(async ({ page }) => {
        await watchExample(page);
        await getStepCard(page, COPY.platform.onboarding.steps.exampleKeep.title)
          .getByRole('button', { name: COPY.platform.onboarding.example.keep })
          .click();
        await expectSaved(page);
        await page.reload();
        await waitForCanvas(page);
      });

      test('THEN the verdicts, the answer and the comments are all still there', async ({ page }) => {
        await expect(getNode(page, COPY.platform.onboarding.example.nodes.bean)).toContainText(
          COPY.platform.canvas.node.answerBadge,
        );
        await expect(getNode(page, COPY.platform.onboarding.example.nodes.perCup)).toContainText(
          COPY.platform.canvas.node.validBadge,
        );
        await expect(getNode(page, COPY.platform.onboarding.example.nodes.capsule)).toContainText(
          COPY.platform.canvas.node.invalidBadge,
        );
        await expect(getNode(page, COPY.platform.onboarding.example.nodes.oneButton)).toContainText(
          COPY.platform.canvas.node.affectedBadge,
        );
        await expect(getNode(page, COPY.platform.onboarding.example.nodes.filter)).toContainText(
          COPY.platform.canvas.node.invalidBadge,
        );
        await expect(
          getNode(page, COPY.platform.onboarding.example.nodes.bean).getByRole('button', {
            name: COPY.platform.canvas.node.viewComments,
          }),
        ).toContainText('1');
      });
    });

    test.describe('WHEN the example is deleted', () => {
      test.beforeEach(async ({ page }) => {
        await watchExample(page);
        await getStepCard(page, COPY.platform.onboarding.steps.exampleKeep.title)
          .getByRole('button', { name: COPY.platform.onboarding.example.remove })
          .click();
      });

      test('THEN the thread is gone and the guide still counts as done', async ({ page }) => {
        await expect(getGuidePicker(page)).toContainText(
          COPY.platform.onboarding.pickerProgress.replace('{done}', '2').replace('{total}', '5'),
        );
        await expect(getSidebar(page)).not.toContainText(COPY.platform.onboarding.example.threadName);
      });
    });
  });
});
