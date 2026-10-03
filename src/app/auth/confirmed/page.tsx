'use client';

import { CircleCheck } from 'lucide-react';

import { AuthButton, AuthHeading, AuthPanel } from '@/app/(auth)/fragments';
import { LandingWorld } from '@/app/fragments/components';
import { Logo } from '@/components';
import { useTranslations } from '@/i18n';

const ConfirmedPage = () => {
  const t = useTranslations();

  return (
    <LandingWorld className="relative flex min-h-screen flex-col items-center justify-center px-6">
      <Logo className="relative z-[1] mb-12 text-2xl text-[color:var(--hero-title)]" />

      <AuthPanel className="relative z-[1] w-full max-w-sm text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-[color:var(--hero-lime)]/40 bg-[color:var(--hero-lime)]/10">
          <CircleCheck aria-hidden className="h-8 w-8 text-[color:var(--hero-accent-text)]" />
        </div>

        <AuthHeading title={t.auth.confirmed.heading} subtitle={t.auth.confirmed.message} />

        <AuthButton onClick={() => window.close()} className="w-full">
          {t.auth.confirmed.close}
        </AuthButton>
      </AuthPanel>
    </LandingWorld>
  );
};

export default ConfirmedPage;
