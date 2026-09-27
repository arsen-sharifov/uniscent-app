'use client';

import { clsx } from 'clsx';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useRef } from 'react';

import { isAffected } from '@/components/Canvas/utils';
import { useTranslations } from '@/i18n';

import { HeroStage } from './components';
import { DESKTOP_QUERY, HERO_LOG_LINES, HERO_VISIBLE_LOG_LINES, LANDING_SURFACE_CLASSES } from './consts';
import { useHeroCascade, useMediaQuery } from './hooks';

export const Hero = () => {
  const t = useTranslations();
  const lightRef = useRef<HTMLDivElement>(null);
  const cascade = useHeroCascade();
  const desktop = useMediaQuery(DESKTOP_QUERY);
  const { phase, claims, statuses, refutedIds } = cascade;

  const statements = claims.filter((claim) => claim.kind === 'statement' && (desktop || !claim.desktopOnly));
  const visibleLogLines = HERO_LOG_LINES.filter((line) => line.phases.includes(phase)).slice(-HERO_VISIBLE_LOG_LINES);

  const counters = [
    {
      id: 'valid',
      value: statements.filter((claim) => statuses.get(claim.id) === 'valid').length,
      label: t.landing.hero.demo.counterValid,
    },
    { id: 'refuted', value: refutedIds.size, label: t.landing.hero.demo.counterRefuted },
    {
      id: 'affected',
      value: statements.filter((claim) => isAffected(statuses.get(claim.id))).length,
      label: t.landing.hero.demo.counterAffected,
    },
  ];

  return (
    <section
      id="top"
      data-phase={phase}
      className="hero-stage relative z-[1] flex min-h-svh snap-start flex-col justify-center overflow-hidden pt-20"
    >
      <div aria-hidden className="hero-quiet absolute inset-0 z-0" />

      <div className="relative mx-auto grid w-full max-w-7xl items-center gap-12 px-6 py-10 lg:grid-cols-[1fr_1.05fr] lg:gap-10 lg:px-8">
        <div>
          <h1 className="font-grotesk text-[clamp(2.9rem,5vw,5.25rem)] leading-[0.98] font-extrabold tracking-[-0.03em] text-balance text-[color:var(--hero-title)]">
            {t.landing.hero.title}{' '}
            <span className="text-[color:var(--hero-accent-text)]">{t.landing.hero.titleAccent}</span>
          </h1>

          <p className="mt-7 max-w-xl font-grotesk text-lg leading-relaxed text-[color:var(--hero-ground-muted)] lg:text-xl">
            {t.landing.hero.subtitle1}
            <br />
            {t.landing.hero.subtitle2}
          </p>
          <p className="mt-3 font-grotesk text-lg font-semibold text-[color:var(--hero-ground-text)] lg:text-xl">
            {t.landing.hero.tagline}
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-lg bg-[color:var(--hero-lime)] px-6 py-3.5 font-grotesk text-[15px] font-bold tracking-tight text-[color:var(--hero-lime-ink)] shadow-[0_12px_36px_-10px_var(--hero-lime-glow)] transition-colors duration-200 hover:bg-[color:var(--hero-lime-strong)] focus-visible:ring-2 focus-visible:ring-[color:var(--hero-lime-glow)] focus-visible:outline-none"
            >
              {t.landing.hero.ctaPrimary}
              <ArrowRight aria-hidden className="h-4 w-4" strokeWidth={2.5} />
            </Link>
            <button
              type="button"
              onClick={() => document.getElementById('problem')?.scrollIntoView({ block: 'start' })}
              className="landing-glass cursor-pointer rounded-lg border border-[color:var(--hero-hairline-strong)] bg-[color:var(--hero-chip-bg)] px-6 py-3.5 font-grotesk text-[15px] font-semibold tracking-tight text-[color:var(--hero-ground-text)] transition-colors duration-200 hover:bg-[color:var(--hero-chip-hover)] focus-visible:ring-2 focus-visible:ring-[color:var(--hero-lime-glow)] focus-visible:outline-none"
            >
              {t.landing.hero.ctaSecondary}
            </button>
          </div>
        </div>

        <section
          aria-label={t.landing.hero.demo.ariaDemo}
          onMouseMove={(event) => {
            const light = lightRef.current;
            if (!light) return;

            const rect = event.currentTarget.getBoundingClientRect();
            light.style.setProperty('--px', `${event.clientX - rect.left}px`);
            light.style.setProperty('--py', `${event.clientY - rect.top}px`);
          }}
          className={clsx(
            LANDING_SURFACE_CLASSES.sheet,
            'group/panel relative animate-node-drop overflow-hidden [animation-fill-mode:backwards] motion-reduce:animate-none',
          )}
        >
          <div className="flex h-10 items-center gap-2 border-b border-[color:var(--hero-hairline)] px-3.5">
            <span className="h-2 w-2 rounded-full bg-[color:var(--hero-lime)] shadow-[0_0_8px_var(--hero-lime-glow)]" />
            <span className="font-mono-ui text-[10.5px] tracking-[0.04em] text-[color:var(--hero-ground-muted)] lowercase">
              uniscept · {t.landing.hero.demo.threadBand} · T-001
            </span>
            <span className="ml-auto hidden items-center gap-1.5 sm:flex">
              {counters.map((counter) => (
                <span
                  key={counter.id}
                  data-tone={counter.id}
                  className="hero-counter rounded border px-1.5 py-0.5 font-mono-ui text-[9px] font-bold tracking-[0.1em] uppercase"
                >
                  <span className="tabular-nums">{String(counter.value).padStart(2, '0')}</span> {counter.label}
                </span>
              ))}
            </span>
          </div>

          <HeroStage cascade={cascade} />

          <div className="flex min-h-16 flex-col justify-center gap-1 border-t border-[color:var(--hero-hairline)] px-3.5 py-2.5">
            {visibleLogLines.map((line) => (
              <p
                key={line.id}
                className="font-mono-ui text-[11px] leading-relaxed text-[color:var(--hero-ground-text)]"
              >
                <span className="text-[color:var(--hero-accent-text)]">❯</span>
                <span className="mx-1.5 text-[color:var(--hero-ground-muted)]">{line.time}</span>
                {t.landing.hero.demo.log[line.id]}
              </p>
            ))}
          </div>

          <div
            ref={lightRef}
            aria-hidden
            className="panel-light pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover/panel:opacity-100"
          />
        </section>
      </div>
    </section>
  );
};
