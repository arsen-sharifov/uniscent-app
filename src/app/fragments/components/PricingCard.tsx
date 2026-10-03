'use client';

import { clsx } from 'clsx';
import { CheckCircle2, Flag } from 'lucide-react';
import Link from 'next/link';

import type { IPricingPlan } from '@interfaces';

import { useTranslations } from '@/i18n';

import { TickerNumber } from './TickerNumber';

interface IPricingCardProps {
  plan: IPricingPlan;
}

export const PricingCard = ({ plan }: IPricingCardProps) => {
  const t = useTranslations();
  const isHighlighted = plan.highlighted === true;

  return (
    <div
      className={clsx(
        'landing-glass relative flex h-full flex-col rounded-xl border bg-[color:var(--hero-card)] p-7 shadow-[var(--hero-card-shadow)] backdrop-blur-md transition-[border-color,box-shadow] duration-300 hover:border-[color:var(--hero-lime)]/45 hover:shadow-[0_22px_52px_-20px_var(--hero-lime-glow)]',
        isHighlighted ? 'border-[color:var(--hero-lime)]/55' : 'border-[color:var(--hero-card-border)]',
        plan.disabled && 'plan-quarantine',
      )}
    >
      {isHighlighted && (
        <div className="absolute inset-x-0 top-0 flex items-center gap-1.5 rounded-t-xl bg-[color:var(--hero-lime)] px-3 py-1.5 text-[color:var(--hero-lime-ink)] select-none">
          <Flag aria-hidden className="h-2.5 w-2.5 shrink-0" strokeWidth={2.5} />
          <span className="font-mono-ui text-[8.5px] font-bold tracking-[0.16em] uppercase">
            {t.landing.pricing.popular}
          </span>
        </div>
      )}

      <div className="mt-5 mb-7">
        <h3 className="mb-3 font-grotesk text-lg font-semibold text-[color:var(--hero-card-text)]">{plan.name}</h3>
        <div className="flex items-baseline gap-1.5">
          <span className="font-mono-ui text-4xl font-bold tracking-tight text-[color:var(--hero-card-text)]">
            {plan.price === 'free' ? (
              t.landing.pricing.free
            ) : (
              <>
                $
                <TickerNumber value={plan.price} />
              </>
            )}
          </span>
          {plan.period && (
            <span className="font-mono-ui text-[11px] text-[color:var(--hero-card-muted)]">
              /{t.landing.pricing.periods[plan.period]}
            </span>
          )}
        </div>
        {plan.description && (
          <p className="mt-2 font-grotesk text-sm text-[color:var(--hero-card-muted)]">{plan.description}</p>
        )}
      </div>

      <ul className="mb-8 flex-1 space-y-2.5">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2.5">
            <CheckCircle2
              aria-hidden
              className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[color:var(--hero-accent-text)]"
              strokeWidth={2.25}
            />
            <span className="font-grotesk text-[13.5px] leading-snug text-[color:var(--hero-card-text)]">
              {feature}
            </span>
          </li>
        ))}
      </ul>

      {plan.disabled ? (
        <span className="block w-full cursor-not-allowed rounded-md border border-[color:var(--hero-hairline-strong)] py-3 text-center font-mono-ui text-[11px] font-bold tracking-[0.12em] text-[color:var(--hero-card-muted)] uppercase">
          {t.landing.pricing.tryDemo}
        </span>
      ) : (
        <Link
          href={plan.href}
          className={clsx(
            'block w-full rounded-md py-3 text-center font-mono-ui text-[11px] font-bold tracking-[0.12em] uppercase transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-[color:var(--hero-lime-glow)] focus-visible:outline-none',
            isHighlighted
              ? 'bg-[color:var(--hero-lime)] text-[color:var(--hero-lime-ink)] hover:bg-[color:var(--hero-lime-strong)]'
              : 'border border-[color:var(--hero-hairline-strong)] text-[color:var(--hero-card-text)] hover:bg-[color:var(--hero-chip-bg)]',
          )}
        >
          {t.landing.pricing.getStarted}
        </Link>
      )}
    </div>
  );
};
