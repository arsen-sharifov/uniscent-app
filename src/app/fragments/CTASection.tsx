'use client';

import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

import { useTranslations } from '@/i18n';

import { Section } from './components';

export const CTASection = () => {
  const t = useTranslations();

  return (
    <Section ground="close" snap={false}>
      <div aria-hidden className="cta-glow absolute inset-0" />

      <div className="relative mx-auto max-w-4xl py-8 text-center">
        <div>
          <h2 className="font-grotesk text-[clamp(2.8rem,5.5vw,4.75rem)] leading-[1.04] font-medium tracking-[-0.02em] text-[color:var(--hero-title)]">
            {t.landing.cta.title1}
            <br />
            <span className="text-[color:var(--hero-accent-text)]">{t.landing.cta.title2}</span>
          </h2>
          <p className="mx-auto mt-6 max-w-2xl font-grotesk text-lg leading-relaxed text-[color:var(--hero-ground-muted)] lg:text-xl">
            {t.landing.cta.subtitle}
          </p>
          <Link
            href="/signup"
            className="group mt-10 inline-flex items-center gap-2.5 rounded-md bg-[color:var(--hero-lime)] px-8 py-4 font-mono-ui text-[12.5px] font-bold tracking-[0.14em] text-[color:var(--hero-lime-ink)] uppercase shadow-[0_16px_40px_-14px_var(--hero-lime-glow)] transition-colors duration-200 hover:bg-[color:var(--hero-lime-strong)] focus-visible:ring-2 focus-visible:ring-[color:var(--hero-lime-glow)] focus-visible:outline-none"
          >
            {t.landing.cta.button}
            <ArrowRight
              aria-hidden
              className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
              strokeWidth={2.5}
            />
          </Link>
        </div>
      </div>
    </Section>
  );
};
