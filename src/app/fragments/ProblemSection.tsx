'use client';

import { clsx } from 'clsx';
import { XCircle } from 'lucide-react';

import { useTranslations } from '@/i18n';

import { Section, SectionHeading, ThreadStream, TiltPanel } from './components';
import { HERO_EXHIBITS, LANDING_SURFACE_CLASSES } from './consts';

export const ProblemSection = () => {
  const t = useTranslations();

  return (
    <Section id="problem" ground="deep">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 max-w-2xl">
          <SectionHeading title={t.landing.problem.title} subtitle={t.landing.problem.subtitle} />
        </div>

        <div className="grid items-start gap-6 lg:grid-cols-[1.15fr_1fr]">
          <ThreadStream />

          <div className="flex flex-col gap-4">
            {HERO_EXHIBITS.map((exhibitId) => (
              <TiltPanel key={exhibitId}>
                <article className={clsx(LANDING_SURFACE_CLASSES.card, 'relative flex h-full flex-col p-5')}>
                  <p className="font-grotesk text-lg leading-snug font-semibold tracking-tight text-[color:var(--hero-card-text)]">
                    {t.landing.problem.exhibits[exhibitId].claim}
                  </p>
                  <p className="mt-2 flex-1 font-grotesk text-[13.5px] leading-snug text-[color:var(--hero-card-muted)]">
                    {t.landing.problem.exhibits[exhibitId].detail}
                  </p>
                  <span className="mt-3 inline-flex w-fit items-center gap-1.5 rounded border border-[color:var(--hero-refuted)]/35 bg-[color:var(--hero-refuted)]/8 px-2 py-1 font-mono-ui text-[9px] font-bold tracking-[0.14em] text-[color:var(--hero-refuted)] uppercase">
                    <XCircle aria-hidden className="h-2.5 w-2.5 shrink-0" strokeWidth={2.5} />
                    {t.landing.problem.exhibits[exhibitId].verdict} · {t.landing.problem.exhibits[exhibitId].medium}
                  </span>
                </article>
              </TiltPanel>
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
};
