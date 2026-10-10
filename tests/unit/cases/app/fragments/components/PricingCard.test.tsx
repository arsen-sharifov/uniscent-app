import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { IPricingPlan } from '@interfaces';

import { TRANSLATIONS } from '@mocks/i18n';
import { PricingCard } from '@/app/fragments/components';

vi.mock('@/i18n', () => import('@mocks/i18n'));

const DEMO_PLAN: IPricingPlan = {
  id: 'demo',
  price: 'free',
  href: '/platform',
  disabled: true,
  name: TRANSLATIONS.landing.pricing.plans.demo.name,
  features: TRANSLATIONS.landing.pricing.plans.demo.features,
};

describe('PricingCard', () => {
  describe('GIVEN the free demo plan', () => {
    describe('WHEN it renders', () => {
      beforeEach(() => {
        render(<PricingCard plan={DEMO_PLAN} />);
      });

      test('THEN its price reads as free and it offers no sign-up link yet', () => {
        expect(screen.getByText(TRANSLATIONS.landing.pricing.free)).toBeInTheDocument();
        expect(screen.queryByRole('link')).not.toBeInTheDocument();
      });
    });
  });
});
