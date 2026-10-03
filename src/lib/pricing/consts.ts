import type { IPricingPlanMeta } from '@interfaces';

export const PRICING_PLANS = [
  {
    id: 'demo',
    price: 'free',
    href: '/platform',
    disabled: true,
  },
  {
    id: 'lite',
    price: 2,
    period: 'month',
    href: '/signup',
  },
  {
    id: 'standard',
    price: 5,
    period: 'month',
    href: '/signup',
    highlighted: true,
  },
  {
    id: 'pro',
    price: 20,
    period: 'month',
    href: '/signup',
  },
] as const satisfies readonly IPricingPlanMeta[];
