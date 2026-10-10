'use client';

import { ArrowLeft, Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type SubmitEvent, useState } from 'react';

import { MIN_PASSWORD_LENGTH } from '@constants';
import {
  acceptWorkspaceInvitation,
  addUserBadge,
  completeInvitedAccount,
  getMyInvitations,
  signUp,
  verifyInviteCode,
} from '@api/client';
import { Stepper, Tooltip } from '@/components';
import { useTranslations } from '@/i18n';
import { event } from '@/lib/events';

import { AuthButton } from './AuthButton';
import { AuthField } from './AuthField';
import { AuthHeading } from './AuthHeading';
import { AuthInput } from './AuthInput';
import { AuthLabel } from './AuthLabel';
import { AuthLink } from './AuthLink';
import { PlanStep } from './PlanStep';

interface ISignUpFlowProps {
  mode?: 'signup' | 'invite';
  lockedEmail?: string;
}

export const SignUpFlow = ({ mode = 'signup', lockedEmail }: ISignUpFlowProps) => {
  const isInvite = mode === 'invite';

  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState(lockedEmail ?? '');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  const t = useTranslations();
  const copy = isInvite
    ? {
        heading: t.auth.signUp.inviteHeading,
        subtitle: t.auth.signUp.inviteSubtitle,
        submit: t.auth.signUp.accountStep.join,
        submitting: t.auth.signUp.accountStep.joining,
      }
    : {
        heading: t.auth.signUp.heading,
        subtitle: t.auth.signUp.subtitle,
        submit: t.auth.signUp.accountStep.submit,
        submitting: t.auth.signUp.accountStep.submitting,
      };

  const handleSubmit = async (submitEvent: SubmitEvent) => {
    submitEvent.preventDefault();
    setError('');
    setLoading(true);

    if (isInvite) {
      const { error: completeError } = await completeInvitedAccount(name, password);

      if (completeError) {
        event.error(completeError, { title: t.auth.errors.joinFailed, context: 'auth.completeInvite' });
        setLoading(false);

        return;
      }

      const invitations = await getMyInvitations().catch((loadError: unknown) => {
        event.error(loadError, { title: t.platform.sidebar.invitations.acceptFailed, context: 'auth.loadInvitations' });

        return [];
      });
      const accepted = await Promise.all(
        invitations.map((invitation) =>
          acceptWorkspaceInvitation(invitation.id)
            .then(() => true)
            .catch((acceptError: unknown) => {
              event.error(acceptError, {
                title: t.platform.sidebar.invitations.acceptFailed,
                context: 'auth.acceptInvitation',
              });

              return false;
            }),
        ),
      );

      if (accepted.includes(true)) {
        await addUserBadge('collaborator').catch((badgeError: unknown) => {
          event.error(badgeError, { toast: false, context: 'auth.collaboratorBadge' });
        });
      }

      router.push('/platform');

      return;
    }

    const valid = await verifyInviteCode(inviteCode, email).catch((verifyError: unknown) => {
      event.error(verifyError, { title: t.auth.errors.signUpFailed, context: 'auth.verifyInvite' });

      return null;
    });

    if (valid === null) {
      setLoading(false);

      return;
    }

    if (!valid) {
      setError(t.auth.errors.invalidInviteCode);
      setLoading(false);

      return;
    }

    const { error: authError } = await signUp(email, password, name);

    if (authError) {
      event.error(authError, { title: t.auth.errors.signUpFailed, context: 'auth.signUp' });
      setLoading(false);

      return;
    }

    router.push('/login?emailSent=true');
  };

  return (
    <div className="w-full max-w-sm">
      <AuthHeading
        title={step === 1 ? t.auth.signUp.planStep.heading : copy.heading}
        subtitle={step === 1 ? t.auth.signUp.planStep.subtitle : copy.subtitle}
      />

      <div className="mb-6">
        <Stepper steps={[t.auth.signUp.steps.plan, t.auth.signUp.steps.account]} currentStep={step} />
      </div>

      {step === 1 && (
        <PlanStep
          onContinue={() => {
            setError('');
            setStep(2);
          }}
        />
      )}

      {step === 2 && (
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isInvite && (
            <div>
              <div className="mb-1.5 flex items-center gap-1.5">
                <AuthLabel htmlFor="invite-code">{t.auth.signUp.accountStep.inviteCode}</AuthLabel>
                <Tooltip text={t.auth.signUp.accountStep.inviteCodeTooltip} />
              </div>
              <AuthInput
                id="invite-code"
                type="text"
                value={inviteCode}
                onChange={(inputEvent) => setInviteCode(inputEvent.target.value)}
                required
                placeholder={t.auth.signUp.accountStep.inviteCodePlaceholder}
              />
            </div>
          )}

          <AuthField
            id="name"
            label={t.auth.signUp.accountStep.name}
            type="text"
            value={name}
            onChange={(inputEvent) => setName(inputEvent.target.value)}
            required
            autoFocus={isInvite}
            placeholder={t.auth.placeholders.name}
          />

          <AuthField
            id="email"
            label={t.auth.signUp.accountStep.email}
            type="email"
            value={email}
            onChange={(inputEvent) => setEmail(inputEvent.target.value)}
            required
            disabled={isInvite}
            placeholder={t.auth.placeholders.email}
          >
            {isInvite && (
              <p className="mt-1.5 flex items-center gap-1.5 font-grotesk text-xs text-[color:var(--hero-ground-muted)]">
                <Lock aria-hidden className="h-3 w-3 shrink-0" />
                {t.auth.signUp.accountStep.emailLocked}
              </p>
            )}
          </AuthField>

          <AuthField
            id="password"
            label={t.auth.signUp.accountStep.password}
            type="password"
            value={password}
            onChange={(inputEvent) => setPassword(inputEvent.target.value)}
            required
            minLength={MIN_PASSWORD_LENGTH}
            placeholder={t.auth.placeholders.password}
          />

          {error && (
            <p role="alert" className="font-grotesk text-sm text-[color:var(--hero-refuted)]">
              {error}
            </p>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setError('');
                setStep(1);
              }}
              className="flex cursor-pointer items-center justify-center gap-1 rounded-lg border border-[color:var(--hero-hairline-strong)] bg-[color:var(--hero-chip-bg)] px-4 py-2.5 font-grotesk text-sm font-medium text-[color:var(--hero-ground-text)] transition-colors duration-200 hover:bg-[color:var(--hero-chip-hover)] focus-visible:ring-2 focus-visible:ring-[color:var(--hero-lime-glow)] focus-visible:outline-none active:bg-[color:var(--hero-chip-strong)]"
            >
              <ArrowLeft aria-hidden className="h-4 w-4" />
              {t.auth.signUp.accountStep.back}
            </button>
            <AuthButton type="submit" disabled={loading} className="flex-1">
              {loading ? copy.submitting : copy.submit}
            </AuthButton>
          </div>
        </form>
      )}

      {!isInvite && (
        <p className="mt-6 text-center font-grotesk text-sm text-[color:var(--hero-ground-muted)]">
          {t.auth.signUp.hasAccount} <AuthLink href="/login">{t.auth.signUp.signInLink}</AuthLink>
        </p>
      )}
    </div>
  );
};
