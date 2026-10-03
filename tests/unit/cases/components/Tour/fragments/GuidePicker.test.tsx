import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { canvasNode } from '@mocks/canvas';
import { TRANSLATIONS } from '@mocks/i18n';
import { snapshot } from '@mocks/onboarding';
import { GuidePicker } from '@/components/Tour';
import { useOnboardingStore } from '@/lib/onboarding';

vi.mock('@/i18n', () => import('@mocks/i18n'));

const READY = snapshot({ workspaceCount: 1, threadId: 'thread-1', nodes: [canvasNode('n1')], referenceTargetCount: 1 });

const guideRow = (title: string) =>
  screen.getAllByRole('button').find((button) => within(button).queryByText(title, { exact: true }) !== null)!;

afterEach(() => useOnboardingStore.getState().forget());

describe('GuidePicker', () => {
  describe('GIVEN an account that has not finished the first canvas', () => {
    beforeEach(() => {
      useOnboardingStore.setState({ pickerOpen: true, completedGuides: [] });
    });

    describe('WHEN the picker opens', () => {
      beforeEach(() => {
        render(<GuidePicker snapshot={READY} />);
      });

      test('THEN only the first canvas can start and the rest explain why they wait', () => {
        expect(guideRow(TRANSLATIONS.platform.onboarding.guides.baseTitle)).toBeEnabled();
        expect(guideRow(TRANSLATIONS.platform.onboarding.guides.settingsTitle)).toBeDisabled();
        expect(guideRow(TRANSLATIONS.platform.onboarding.guides.settingsTitle)).toHaveTextContent(
          TRANSLATIONS.platform.onboarding.pickerLocked,
        );
        expect(screen.getByText('0 of 5 complete')).toBeInTheDocument();
      });

      test('THEN the dialog is named by its title', () => {
        expect(screen.getByRole('dialog', { name: TRANSLATIONS.platform.onboarding.pickerTitle })).toBeInTheDocument();
      });
    });

    describe('WHEN the first canvas is chosen', () => {
      beforeEach(() => {
        render(<GuidePicker snapshot={READY} />);
        fireEvent.click(guideRow(TRANSLATIONS.platform.onboarding.guides.baseTitle));
      });

      test('THEN its run starts and the picker closes', () => {
        expect(useOnboardingStore.getState()).toMatchObject({
          run: { guideId: 'base', stepIndex: 0 },
          pickerOpen: false,
        });
      });
    });
  });

  describe('GIVEN a finished first canvas but no canvas on screen', () => {
    beforeEach(() => {
      useOnboardingStore.setState({ pickerOpen: true, completedGuides: ['base'] });
    });

    describe('WHEN the picker opens', () => {
      beforeEach(() => {
        render(<GuidePicker snapshot={snapshot({ workspaceCount: 1 })} />);
      });

      test('THEN the canvas guide names what it needs and the finished guide can be replayed', () => {
        expect(guideRow(TRANSLATIONS.platform.onboarding.guides.canvasTitle)).toBeDisabled();
        expect(guideRow(TRANSLATIONS.platform.onboarding.guides.canvasTitle)).toHaveTextContent(
          TRANSLATIONS.platform.onboarding.hints.needsCanvas,
        );
        expect(guideRow(TRANSLATIONS.platform.onboarding.guides.baseTitle)).toBeEnabled();
        expect(screen.getByLabelText(TRANSLATIONS.platform.onboarding.pickerReplay)).toBeInTheDocument();
        expect(screen.getByText('1 of 5 complete')).toBeInTheDocument();
      });
    });
  });
});
