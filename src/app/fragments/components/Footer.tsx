'use client';

import { useTranslations } from '@/i18n';

export const Footer = () => {
  const t = useTranslations();

  return (
    <footer className="relative z-[1] border-t border-[color:var(--hero-hairline)] bg-[color:var(--hero-veil-close)] px-6 py-12">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <span className="font-grotesk text-lg font-semibold tracking-tight text-[color:var(--hero-title)]">
          {t.landing.header.logo}
        </span>
        <span className="font-mono-ui text-[11px] tracking-[0.06em] text-[color:var(--hero-ground-muted)]">
          © {new Date().getFullYear()} {t.landing.header.logo}
        </span>
      </div>
    </footer>
  );
};
