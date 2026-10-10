'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

import { LandingWorld } from '@/app/fragments/components';
import { Logo } from '@/components';
import { useTranslations } from '@/i18n';

import { AuthPanel } from './fragments';

const AuthLayout = ({ children }: { children: ReactNode }) => {
  const t = useTranslations();

  return (
    <LandingWorld className="relative flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div className="relative z-[1] flex w-full max-w-md flex-col items-center">
        <Link
          href="/"
          className="inline-flex rounded-md transition-opacity duration-200 hover:opacity-80 focus-visible:ring-2 focus-visible:ring-[color:var(--hero-lime-glow)] focus-visible:outline-none"
        >
          <Logo className="text-2xl text-[color:var(--hero-title)]" />
        </Link>

        <blockquote className="mt-7 text-center text-balance">
          <p className="font-grotesk text-lg leading-relaxed font-medium text-[color:var(--hero-ground-text)]">
            {`“${t.auth.aside.quote}”`}
          </p>
          <p className="mt-2 font-mono-ui text-[11px] tracking-[0.08em] text-[color:var(--hero-ground-muted)]">
            {t.auth.aside.tagline}
          </p>
        </blockquote>

        <AuthPanel className="mt-9 w-full">{children}</AuthPanel>
      </div>
    </LandingWorld>
  );
};

export default AuthLayout;
