'use client';

import { ArrowRight, Lock } from 'lucide-react';

import { useTranslations } from '@/i18n';
import { formatPlanPrice, mergePlansWithTranslations } from '@/lib/pricing';

import { AuthButton } from './AuthButton';

interface IPlanStepProps {
  onContinue: () => void;
}

export const PlanStep = ({ onContinue }: IPlanStepProps) => {
  const t = useTranslations();
  const lockedPlans = mergePlansWithTranslations(t).flatMap((plan) =>
    plan.period
      ? [
          {
            id: plan.id,
            name: plan.name,
            price: `${formatPlanPrice(plan.price, t.auth.signUp.planStep.free)}/${t.landing.pricing.periods[plan.period]}`,
          },
        ]
      : [],
  );

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 font-mono-ui text-[10px] font-bold tracking-[0.14em] text-[color:var(--hero-ground-muted)] uppercase">
          {t.auth.signUp.planStep.available}
        </p>
        <div className="rounded-xl border border-[color:var(--hero-lime)]/45 bg-[color:var(--hero-lime)]/10 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-[color:var(--hero-lime)]">
                <div className="h-2.5 w-2.5 rounded-full bg-[color:var(--hero-lime)] shadow-[0_0_10px_var(--hero-lime-glow)]" />
              </div>
              <span className="font-grotesk text-sm font-semibold text-[color:var(--hero-ground-text)]">
                {t.auth.signUp.planStep.betaPlan}
              </span>
            </div>
            <span className="rounded-md border border-[color:var(--hero-lime)]/40 bg-[color:var(--hero-lime)]/10 px-2 py-0.5 font-mono-ui text-[10px] font-bold tracking-[0.14em] text-[color:var(--hero-accent-text)] uppercase">
              {t.auth.signUp.planStep.free}
            </span>
          </div>
          <p className="mt-1.5 ml-8 font-grotesk text-xs leading-relaxed text-[color:var(--hero-ground-muted)]">
            {t.auth.signUp.planStep.betaDescription}
          </p>
        </div>
      </div>

      <div>
        <p className="mb-2 font-mono-ui text-[10px] font-bold tracking-[0.14em] text-[color:var(--hero-ground-muted)] uppercase">
          {t.auth.signUp.planStep.comingSoon}
        </p>
        <div className="space-y-2">
          {lockedPlans.map((plan) => (
            <div
              key={plan.id}
              className="flex items-center justify-between rounded-xl border border-[color:var(--hero-hairline)] bg-[color:var(--hero-chip-bg)] px-4 py-3 opacity-60"
            >
              <div className="flex items-center gap-3">
                <Lock aria-hidden className="h-4 w-4 shrink-0 text-[color:var(--hero-ground-muted)]" />
                <span className="font-grotesk text-sm font-medium text-[color:var(--hero-ground-muted)]">
                  {plan.name}
                </span>
              </div>
              <span className="font-mono-ui text-[11px] tracking-[0.04em] text-[color:var(--hero-ground-muted)]">
                {plan.price}
              </span>
            </div>
          ))}
        </div>
      </div>

      <p className="text-center font-grotesk text-xs leading-relaxed text-[color:var(--hero-ground-muted)]">
        {t.auth.signUp.planStep.paidPlansNote}
        <br />
        {t.auth.signUp.planStep.earlyBirdNote}
      </p>

      <AuthButton onClick={onContinue} className="flex w-full items-center justify-center gap-2">
        {t.auth.signUp.planStep.continue}
        <ArrowRight aria-hidden className="h-4 w-4" />
      </AuthButton>
    </div>
  );
};
