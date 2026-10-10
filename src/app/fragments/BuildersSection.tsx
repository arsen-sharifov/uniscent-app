'use client';

import { clsx } from 'clsx';
import { HelpCircle } from 'lucide-react';

import { useTranslations } from '@/i18n';

import { CanvasVignette, MiniNode, Section, SectionHeading, TiltPanel } from './components';
import { HERO_BUILDER_THREADS, LANDING_SURFACE_CLASSES } from './consts';

export const BuildersSection = () => {
  const t = useTranslations();

  return (
    <Section ground="deep">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 max-w-2xl">
          <SectionHeading title={t.landing.builders.title} subtitle={t.landing.builders.subtitle} />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {HERO_BUILDER_THREADS.map((thread, index) => (
            <div key={thread.id} className={clsx(index === 1 && 'md:translate-y-6')}>
              <TiltPanel className="h-full">
                <article className={clsx(LANDING_SURFACE_CLASSES.card, 'flex h-full flex-col overflow-hidden')}>
                  <div className="relative flex items-center gap-1.5 border-b border-[color:var(--hero-hairline)] px-3.5 py-2.5 select-none">
                    <span
                      aria-hidden
                      className="sweep-strip absolute inset-x-0 top-0 h-[3px] bg-[color:var(--hero-question)] opacity-90"
                    />
                    <HelpCircle
                      aria-hidden
                      className="h-3 w-3 shrink-0 text-[color:var(--hero-question)]"
                      strokeWidth={2.5}
                    />
                    <span className="font-mono-ui text-[9px] font-bold tracking-[0.16em] text-[color:var(--hero-question)] uppercase">
                      {t.landing.hero.demo.statusQuestion}
                    </span>
                    <span className="code-pulse ml-auto font-mono-ui text-[9px] tracking-[0.08em] text-[color:var(--hero-card-subtle)]">
                      {thread.code}
                    </span>
                  </div>

                  <div className="flex flex-1 flex-col p-6">
                    <p className="font-grotesk text-lg leading-snug font-semibold tracking-tight text-[color:var(--hero-card-text)]">
                      {t.landing.builders[thread.id].question}
                      <span aria-hidden className="type-caret ml-1 text-[color:var(--hero-accent-text)]">
                        ▍
                      </span>
                    </p>

                    <CanvasVignette edges={thread.edges} tones={thread.edgeTones} className="mt-4 h-28">
                      <MiniNode
                        nodeId={`bv-${thread.id[0]}-a`}
                        tone={thread.nodeTones.a}
                        label={t.landing.builders[thread.id].nodeA}
                        className="absolute top-2.5 left-2.5 w-32"
                      />
                      <MiniNode
                        nodeId={`bv-${thread.id[0]}-b`}
                        tone={thread.nodeTones.b}
                        label={t.landing.builders[thread.id].nodeB}
                        className="absolute right-2.5 bottom-2.5 w-32"
                      />
                    </CanvasVignette>

                    <h3 className="mt-4 font-mono-ui text-[10px] font-bold tracking-[0.16em] text-[color:var(--hero-card-subtle)] uppercase">
                      {t.landing.builders[thread.id].title}
                    </h3>
                    <p className="mt-2 flex-1 font-grotesk text-[14px] leading-relaxed text-[color:var(--hero-card-muted)]">
                      {t.landing.builders[thread.id].description}
                    </p>
                    <div className="mt-5 flex flex-wrap gap-1.5">
                      {t.landing.builders[thread.id].useCases.map((useCase) => (
                        <span
                          key={useCase}
                          className="rounded border border-[color:var(--hero-hairline-strong)] px-1.5 py-0.5 font-mono-ui text-[9px] font-bold tracking-[0.1em] text-[color:var(--hero-card-muted)] uppercase"
                        >
                          {useCase}
                        </span>
                      ))}
                    </div>
                  </div>
                </article>
              </TiltPanel>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
};
