'use client';

import type { User } from '@supabase/supabase-js';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { getSession, signOut, verifyInvitation } from '@api/client';
import { useTranslations } from '@/i18n';
import { event } from '@/lib/events';

import { AuthButton, AuthHeading, SignUpFlow } from '../fragments';

const isUnfinishedInvitee = (user: User): boolean => Boolean(user.invited_at) && !user.user_metadata.plan;

const JoinPage = () => {
  const [invitedEmail, setInvitedEmail] = useState<string | null>(null);
  const [signedInEmail, setSignedInEmail] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [accepting, setAccepting] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenHash = searchParams.get('token_hash');

  const t = useTranslations();

  useEffect(() => {
    getSession()
      .then(({ data }) => {
        const user = data.session?.user;

        if (user?.email && isUnfinishedInvitee(user)) {
          setInvitedEmail(user.email);

          return;
        }

        if (tokenHash) {
          setSignedInEmail(user?.email ?? null);
          setReady(true);

          return;
        }

        router.replace('/login');
      })
      .catch((error: unknown) => {
        event.error(error, { toast: false, context: 'auth.readSession' });
        router.replace('/login');
      });
  }, [router, tokenHash]);

  const handleAccept = async () => {
    if (!tokenHash) return;

    setAccepting(true);

    if (signedInEmail) {
      await signOut({ scope: 'local' }).catch((error: unknown) =>
        event.error(error, { toast: false, context: 'auth.signOut' }),
      );
    }

    const { data, error } = await verifyInvitation(tokenHash);
    const email = data.user?.email;

    if (!email) {
      event.error(error, { toast: false, context: 'auth.verifyInvitation' });
      router.replace('/login?error=invalid_code');

      return;
    }

    window.history.replaceState(null, '', window.location.pathname);
    setInvitedEmail(email);
  };

  if (invitedEmail) return <SignUpFlow mode="invite" lockedEmail={invitedEmail} />;

  if (!ready) return null;

  const acceptLabel = signedInEmail ? t.auth.join.switchAccount : t.auth.join.accept;

  return (
    <div className="w-full max-w-sm">
      <AuthHeading title={t.auth.join.heading} subtitle={t.auth.join.subtitle} />

      {signedInEmail && (
        <p className="mb-4 rounded-lg border border-[color:var(--hero-tainted)]/35 bg-[color:var(--hero-tainted)]/10 px-4 py-3 text-center font-grotesk text-sm text-[color:var(--hero-tainted)]">
          {t('auth.join.signedInAs', { email: signedInEmail })}
        </p>
      )}

      <div className="space-y-2">
        <AuthButton onClick={handleAccept} disabled={accepting} className="w-full">
          {accepting ? t.auth.join.accepting : acceptLabel}
        </AuthButton>

        {signedInEmail && (
          <button
            type="button"
            onClick={() => router.replace('/platform')}
            disabled={accepting}
            className="w-full cursor-pointer rounded-lg border border-[color:var(--hero-hairline-strong)] bg-[color:var(--hero-chip-bg)] px-4 py-2.5 font-grotesk text-sm font-medium text-[color:var(--hero-ground-text)] transition-colors duration-200 hover:bg-[color:var(--hero-chip-hover)] focus-visible:ring-2 focus-visible:ring-[color:var(--hero-lime-glow)] focus-visible:outline-none active:bg-[color:var(--hero-chip-strong)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {t.auth.join.stay}
          </button>
        )}
      </div>
    </div>
  );
};

export default JoinPage;
