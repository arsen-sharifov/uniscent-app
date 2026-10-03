'use client';

import type { User } from '@supabase/supabase-js';
import { clsx } from 'clsx';
import { Check, Lock, Sparkles } from 'lucide-react';
import { useMemo } from 'react';

import { useTranslations } from '@/i18n';
import { formatPlanPrice, mergePlansWithTranslations } from '@/lib/pricing';

import { AVAILABLE_PLAN_IDS } from '../consts';
import { SectionHeader } from './SectionHeader';

interface IPlanSectionProps {
  user: User | null;
}

export const PlanSection = ({ user }: IPlanSectionProps) => {
  const t = useTranslations();
  const plans = useMemo(() => mergePlansWithTranslations(t), [t]);
  const currentPlanId = user?.user_metadata?.plan ?? 'beta';

  return (
    <div className="space-y-8">
      <section>
        <SectionHeader
          title={t.platform.settings.plan.title}
          caption={t.platform.settings.plan.caption}
          description={t.platform.settings.plan.blurb}
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan) => {
            const isCurrent = (currentPlanId === 'beta' && plan.id === 'demo') || plan.id === currentPlanId;
            const isLocked = !AVAILABLE_PLAN_IDS.includes(plan.id);
            const periodLabel = plan.period ? t.landing.pricing.periods[plan.period] : null;

            return (
              <article
                key={plan.id}
                data-locked={isLocked || undefined}
                className={clsx(
                  'group relative flex flex-col overflow-hidden rounded-xl border text-left transition-[border-color,transform,box-shadow] duration-200 ease-out',
                  'motion-reduce:transition-none motion-reduce:hover:translate-y-0',
                  isCurrent && 'border-[color:var(--border-active)] shadow-[0_18px_38px_-22px_var(--accent-glow)]',
                  isLocked && !isCurrent && 'cursor-not-allowed border-[color:var(--border)] opacity-60',
                  !isLocked &&
                    !isCurrent &&
                    'border-[color:var(--border)] hover:-translate-y-0.5 hover:border-[color:var(--border-strong)] hover:shadow-[var(--shadow-card-hover)]',
                )}
              >
                {isCurrent && (
                  <span className="absolute top-2.5 right-2.5 z-10 inline-flex items-center gap-1 rounded-md bg-[color:var(--accent)] px-2 py-0.5 font-mono-ui text-[10px] font-bold tracking-[0.14em] text-[color:var(--on-accent)] uppercase shadow-[0_4px_12px_-6px_var(--accent-glow)]">
                    <Sparkles className="h-2.5 w-2.5" strokeWidth={2.4} />
                    {t.platform.settings.plan.current}
                  </span>
                )}
                {isLocked && !isCurrent && (
                  <span className="absolute top-2.5 right-2.5 z-10 inline-flex items-center gap-1 rounded-md bg-[color:var(--surface-elevated)] px-2 py-0.5 font-mono-ui text-[10px] font-bold tracking-[0.14em] text-[color:var(--text-label)] uppercase ring-1 ring-[color:var(--border-strong)]">
                    <Lock className="h-2.5 w-2.5" strokeWidth={2.4} />
                    {t.platform.settings.plan.lockedBadge}
                  </span>
                )}

                <div
                  aria-hidden
                  className={clsx(
                    'relative flex h-16 w-full items-center border-b px-4',
                    isCurrent
                      ? 'border-[color:var(--border-active)] bg-[color:var(--accent-soft)]'
                      : 'border-[color:var(--border)] bg-[color:var(--surface-soft)]',
                  )}
                >
                  <span className="relative flex items-baseline gap-1">
                    <span
                      className={clsx(
                        'font-grotesk text-[24px] leading-none font-semibold tracking-tight',
                        isLocked && !isCurrent ? 'text-[color:var(--text-muted)]' : 'text-[color:var(--text-strong)]',
                      )}
                    >
                      {formatPlanPrice(plan.price, t.platform.settings.plan.free)}
                    </span>
                    {periodLabel && (
                      <span className="font-mono-ui text-[10px] tracking-[0.14em] text-[color:var(--text-label)] uppercase">
                        /{periodLabel}
                      </span>
                    )}
                  </span>
                </div>

                <div className="flex flex-1 flex-col gap-2 bg-[color:var(--surface-elevated)] px-3.5 pt-2.5 pb-3.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <span
                      className={clsx(
                        'truncate font-grotesk text-[16px] leading-none font-semibold tracking-tight',
                        isLocked && !isCurrent ? 'text-[color:var(--text-muted)]' : 'text-[color:var(--text-strong)]',
                      )}
                    >
                      {plan.name}
                    </span>
                    <span className="font-mono-ui text-[10px] font-bold tracking-[0.14em] text-[color:var(--text-label)] uppercase">
                      {plan.id}
                    </span>
                  </div>

                  {plan.description && (
                    <p className="text-[11.5px] leading-snug text-[color:var(--text-muted)]">{plan.description}</p>
                  )}

                  <ul className="mt-1 flex-1 space-y-1.5">
                    {plan.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-start gap-1.5 text-[11.5px] leading-snug text-[color:var(--text-muted)]"
                      >
                        <Check
                          className={clsx(
                            'mt-0.5 h-3 w-3 shrink-0',
                            isLocked && !isCurrent
                              ? 'text-[color:var(--text-muted)]'
                              : 'text-[color:var(--accent-text)]',
                          )}
                          strokeWidth={2.4}
                          aria-hidden
                        />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="border-t border-[color:var(--border)] pt-6">
        <SectionHeader
          title={t.platform.settings.plan.billingTitle}
          caption={t.platform.settings.plan.billingCaption}
          description={t.platform.settings.plan.paidPlansNote}
        />
        <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-elevated)] px-4 py-3">
          <p className="text-[12.5px] leading-snug text-[color:var(--accent-text)]">
            <Sparkles className="mr-1 inline h-3 w-3" strokeWidth={2.4} aria-hidden />
            {t.platform.settings.plan.earlyBirdNote}
          </p>
        </div>
      </section>
    </div>
  );
};
