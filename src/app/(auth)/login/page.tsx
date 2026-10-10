'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { type SubmitEvent, useEffect, useState } from 'react';

import { getSession, signIn } from '@api/client';
import { useTranslations } from '@/i18n';
import { event } from '@/lib/events';

import { AuthButton, AuthField, AuthHeading, AuthLink } from '../fragments';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const emailSent = searchParams.get('emailSent') === 'true';
  const invalidLink = searchParams.get('error') === 'invalid_code';

  const t = useTranslations();

  useEffect(() => {
    if (!emailSent) return;

    const interval = setInterval(async () => {
      const {
        data: { session },
      } = await getSession();

      if (session) {
        clearInterval(interval);
        router.push('/platform');
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [emailSent, router]);

  const handleLogin = async (submitEvent: SubmitEvent) => {
    submitEvent.preventDefault();
    setLoading(true);

    const { error: authError } = await signIn(email, password);

    if (authError) {
      event.error(authError, { title: t.auth.errors.signInFailed, context: 'auth.signIn' });
      setLoading(false);

      return;
    }

    router.push('/platform');
  };

  return (
    <div className="w-full max-w-sm">
      <AuthHeading title={t.auth.signIn.heading} subtitle={t.auth.signIn.subtitle} />

      {invalidLink && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-[color:var(--hero-refuted)]/35 bg-[color:var(--hero-refuted)]/10 px-4 py-3 text-center font-grotesk text-sm text-[color:var(--hero-refuted)]"
        >
          {t.auth.signIn.invalidLink}
        </div>
      )}

      {emailSent && (
        <div className="mb-4 rounded-lg border border-[color:var(--hero-tainted)]/35 bg-[color:var(--hero-tainted)]/10 px-4 py-3 text-center font-grotesk text-sm text-[color:var(--hero-tainted)]">
          {t.auth.signIn.emailSent}
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
        <AuthField
          id="email"
          label={t.auth.signIn.email}
          type="email"
          value={email}
          onChange={(inputEvent) => setEmail(inputEvent.target.value)}
          required
          placeholder={t.auth.placeholders.email}
        />

        <AuthField
          id="password"
          label={t.auth.signIn.password}
          type="password"
          value={password}
          onChange={(inputEvent) => setPassword(inputEvent.target.value)}
          required
          placeholder={t.auth.placeholders.password}
        />

        <AuthButton type="submit" disabled={loading} className="w-full">
          {loading ? t.auth.signIn.submitting : t.auth.signIn.submit}
        </AuthButton>
      </form>

      <p className="mt-6 text-center font-grotesk text-sm text-[color:var(--hero-ground-muted)]">
        {t.auth.signIn.noAccount} <AuthLink href="/signup">{t.auth.signIn.signUpLink}</AuthLink>
      </p>
    </div>
  );
};

export default LoginPage;
