import type { IPricingPlan, TTranslations } from '@interfaces';

import { PRICING_PLANS } from './consts';

export const mergePlansWithTranslations = (t: TTranslations): readonly IPricingPlan[] =>
  PRICING_PLANS.map((plan) => ({ ...plan, ...t.landing.pricing.plans[plan.id] }));

export const formatPlanPrice = (price: IPricingPlan['price'], freeLabel: string): string =>
  price === 'free' ? freeLabel : `$${price}`;
