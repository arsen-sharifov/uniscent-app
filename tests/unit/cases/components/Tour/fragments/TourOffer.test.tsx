import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { TRANSLATIONS } from '@mocks/i18n';
import { TourOffer } from '@/components/Tour';
import { useOnboardingStore } from '@/lib/onboarding';

vi.mock('@/i18n', () => import('@mocks/i18n'));

afterEach(() => useOnboardingStore.getState().forget());

describe('TourOffer', () => {
  describe('GIVEN a first visit with the offer open', () => {
    beforeEach(() => {
      useOnboardingStore.setState({ offerOpen: true });
    });

    describe('WHEN the offer shows', () => {
      beforeEach(() => {
        render(<TourOffer />);
      });

      test('THEN Nodi introduces the tour and says where to start it later', () => {
        expect(screen.getByRole('heading', { name: TRANSLATIONS.platform.onboarding.offerTitle })).toBeInTheDocument();
        expect(screen.getByRole('img', { name: TRANSLATIONS.platform.onboarding.nodiAlt })).toBeInTheDocument();
        expect(screen.getByRole('dialog')).toHaveTextContent(TRANSLATIONS.platform.onboarding.nodiIntro);
        expect(screen.getByRole('dialog')).toHaveTextContent(TRANSLATIONS.platform.onboarding.offerBody);
        expect(screen.getByRole('dialog')).toHaveTextContent(TRANSLATIONS.platform.onboarding.offerLater);
      });

      test('THEN the dialog is named by its title', () => {
        expect(screen.getByRole('dialog', { name: TRANSLATIONS.platform.onboarding.offerTitle })).toBeInTheDocument();
      });
    });

    describe('WHEN the tour is accepted', () => {
      beforeEach(() => {
        render(<TourOffer />);
        fireEvent.click(screen.getByRole('button', { name: TRANSLATIONS.platform.onboarding.offerAccept }));
      });

      test('THEN the first canvas guide starts at its first step and the offer counts as answered', () => {
        expect(useOnboardingStore.getState()).toMatchObject({
          run: { guideId: 'base', stepIndex: 0 },
          offerAnswered: true,
          offerOpen: false,
          hint: null,
        });
      });
    });

    describe('WHEN the tour is declined', () => {
      beforeEach(() => {
        render(<TourOffer />);
        fireEvent.click(screen.getByRole('button', { name: TRANSLATIONS.platform.onboarding.offerDecline }));
      });

      test('THEN the offer closes as answered and a hint points at the help menu', () => {
        expect(useOnboardingStore.getState()).toMatchObject({
          run: null,
          offerAnswered: true,
          offerOpen: false,
          hint: 'afterDecline',
        });
      });
    });

    describe('WHEN the offer is closed without a choice', () => {
      beforeEach(() => {
        render(<TourOffer />);
        fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: TRANSLATIONS.common.close }));
      });

      test('THEN it counts as declined', () => {
        expect(useOnboardingStore.getState()).toMatchObject({
          run: null,
          offerAnswered: true,
          offerOpen: false,
          hint: 'afterDecline',
        });
      });
    });
  });

  describe('GIVEN an offer that was answered before', () => {
    beforeEach(() => {
      useOnboardingStore.setState({ offerAnswered: true });
    });

    describe('WHEN the platform renders', () => {
      beforeEach(() => {
        render(<TourOffer />);
      });

      test('THEN no offer is shown', () => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });
  });
});
