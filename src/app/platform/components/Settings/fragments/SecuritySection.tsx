'use client';

import { ShieldAlert, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import type { IChangePasswordPayload, IWorkspace, TChangePasswordResult } from '@interfaces';
import { MIN_PASSWORD_LENGTH } from '@constants';
import { useAsyncAction } from '@hooks';
import { useTranslations } from '@/i18n';

import { PasswordField } from './PasswordField';
import { SectionHeader } from './SectionHeader';
import { SettingsPrimaryButton } from './SettingsPrimaryButton';

interface ISecuritySectionProps {
  onChangePassword: (payload: IChangePasswordPayload) => Promise<TChangePasswordResult>;
  onCheckDeletion: () => Promise<Pick<IWorkspace, 'id' | 'name'>[]>;
  onDeleteAccount: (password: string) => Promise<void>;
}

export const SecuritySection = ({ onChangePassword, onCheckDeletion, onDeleteAccount }: ISecuritySectionProps) => {
  const router = useRouter();
  const t = useTranslations();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [sharedWorkspaces, setSharedWorkspaces] = useState<Pick<IWorkspace, 'id' | 'name'>[]>([]);

  const passwordAction = useAsyncAction();
  const deletionCheck = useAsyncAction();
  const deleteAction = useAsyncAction();

  const handleChangePassword = () => {
    if (!currentPassword) {
      passwordAction.setError(t.platform.settings.security.currentPasswordRequired);

      return;
    }

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      passwordAction.setError(t.platform.settings.security.passwordTooShort);

      return;
    }

    if (newPassword !== confirmPassword) {
      passwordAction.setError(t.platform.settings.security.passwordMismatch);

      return;
    }

    if (newPassword === currentPassword) {
      passwordAction.setError(t.platform.settings.security.passwordSame);

      return;
    }

    passwordAction.run(async () => {
      const result = await onChangePassword({ currentPassword, newPassword });
      if (result === 'incorrectCurrentPassword') {
        passwordAction.setError(t.platform.settings.security.currentPasswordIncorrect);

        return false;
      }

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      return true;
    }, t.platform.settings.security.updateFailed);
  };

  const handleOpenDelete = async () => {
    setSharedWorkspaces([]);
    await deletionCheck.run(async () => setSharedWorkspaces(await onCheckDeletion()), t.common.errorTitles.loadFailed);
    setShowDeleteConfirm(true);
  };

  const handleDelete = () => {
    deleteAction.run(async () => {
      await onDeleteAccount(deletePassword);
      router.push('/login');
    }, t.platform.settings.security.deleteFailed);
  };

  const canSubmit = Boolean(currentPassword && newPassword && confirmPassword);
  const isDeletionBlocked = sharedWorkspaces.length > 0;

  return (
    <div className="space-y-8">
      <section>
        <SectionHeader
          title={t.platform.settings.security.changePassword}
          caption={t.platform.settings.security.passwordCaption}
          description={t.platform.settings.security.passwordBlurb}
        />

        <div className="relative overflow-hidden rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-elevated)] p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[color:var(--surface-overlay)] text-[color:var(--accent-text)] ring-1 ring-[color:var(--border-strong)]">
              <ShieldCheck className="h-4 w-4" strokeWidth={1.8} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-grotesk text-[16px] leading-none font-semibold tracking-tight text-[color:var(--text-strong)]">
                {t.platform.settings.security.passwordCardTitle}
              </p>
              <p className="mt-1 font-mono-ui text-[10px] font-bold tracking-[0.14em] text-[color:var(--text-label)] uppercase">
                {t.platform.settings.security.passwordCardCaption}
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <PasswordField
              label={t.platform.settings.security.currentPassword}
              autoComplete="current-password"
              value={currentPassword}
              onChange={setCurrentPassword}
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <PasswordField
                label={t.platform.settings.security.newPassword}
                autoComplete="new-password"
                minLength={MIN_PASSWORD_LENGTH}
                value={newPassword}
                onChange={setNewPassword}
              />
              <PasswordField
                label={t.platform.settings.security.confirmPassword}
                autoComplete="new-password"
                minLength={MIN_PASSWORD_LENGTH}
                value={confirmPassword}
                onChange={setConfirmPassword}
              />
            </div>
          </div>

          <div className="mt-4 flex items-center justify-end gap-3">
            <div className="min-w-0 flex-1 truncate text-[11.5px] leading-snug">
              {passwordAction.success && (
                <span className="text-[color:var(--status-success)]">
                  {t.platform.settings.security.passwordUpdated}
                </span>
              )}
              {passwordAction.error && <span className="text-[color:var(--status-error)]">{passwordAction.error}</span>}
            </div>
            <SettingsPrimaryButton onClick={handleChangePassword} disabled={passwordAction.loading || !canSubmit}>
              {passwordAction.loading
                ? t.platform.settings.security.updatingPassword
                : t.platform.settings.security.updatePassword}
            </SettingsPrimaryButton>
          </div>
        </div>
      </section>

      <section className="border-t border-[color:var(--border)] pt-6">
        <SectionHeader
          title={t.platform.settings.security.dangerZone}
          caption={t.platform.settings.security.dangerZoneCaption}
          description={t.platform.settings.security.dangerZoneBlurb}
          danger
        />

        <div className="relative overflow-hidden rounded-xl border border-[color:var(--status-error-border)] bg-[color:var(--status-error-bg)] p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[color:var(--status-error-soft)] text-[color:var(--status-error)] ring-1 ring-[color:var(--status-error-border)]">
              <ShieldAlert className="h-4 w-4" strokeWidth={1.8} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-grotesk text-[16px] leading-none font-semibold tracking-tight text-[color:var(--text-strong)]">
                {t.platform.settings.security.deleteAccount}
              </p>
              <p className="mt-1 font-mono-ui text-[10px] font-bold tracking-[0.14em] text-[color:var(--status-error)]/80 uppercase">
                {t.platform.settings.security.deleteAccountCaption}
              </p>
            </div>
            {!showDeleteConfirm && (
              <button
                type="button"
                onClick={handleOpenDelete}
                disabled={deletionCheck.loading}
                className="shrink-0 cursor-pointer rounded-lg border border-[color:var(--status-error-border)] bg-transparent px-4 py-2 text-[12px] font-medium tracking-tight text-[color:var(--status-error)] transition-colors duration-200 ease-out hover:bg-[color:var(--status-error-soft)] focus-visible:ring-2 focus-visible:ring-[color:var(--ring-focus)] focus-visible:outline-none active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60 disabled:active:translate-y-0 motion-reduce:transition-none"
              >
                {t.platform.settings.security.deleteAccount}
              </button>
            )}
          </div>

          {showDeleteConfirm && (
            <div className="mt-4 space-y-3">
              {isDeletionBlocked && (
                <div role="alert" className="space-y-2 text-[12.5px] leading-relaxed">
                  <p className="text-[color:var(--status-error)]">{t.platform.settings.security.deleteBlocked}</p>
                  <ul className="list-disc space-y-0.5 pl-5 font-medium break-words text-[color:var(--text-strong)]">
                    {sharedWorkspaces.map((workspace) => (
                      <li key={workspace.id}>{workspace.name}</li>
                    ))}
                  </ul>
                </div>
              )}

              {!isDeletionBlocked && (
                <>
                  <p className="text-[12.5px] leading-relaxed text-[color:var(--status-error)]">
                    {t.platform.settings.security.deleteConfirm}
                  </p>
                  <PasswordField
                    label={t.platform.settings.security.deletePassword}
                    autoComplete="current-password"
                    value={deletePassword}
                    onChange={setDeletePassword}
                  />
                </>
              )}

              <div className="flex flex-wrap items-center gap-2">
                {!isDeletionBlocked && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleteAction.loading || !deletePassword}
                    className="cursor-pointer rounded-lg bg-[color:var(--status-error)] px-5 py-2 text-[13px] font-medium text-[color:var(--on-status)] shadow-[0_10px_28px_-12px_var(--status-error-soft)] transition-[opacity,transform,box-shadow] duration-200 ease-out hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[color:var(--ring-focus)] focus-visible:outline-none active:translate-y-px disabled:cursor-not-allowed disabled:bg-[color:var(--surface-overlay)] disabled:text-[color:var(--text-subtle)] disabled:shadow-none disabled:active:translate-y-0 motion-reduce:transition-none"
                  >
                    {deleteAction.loading
                      ? t.platform.settings.security.deleting
                      : t.platform.settings.security.deleteButton}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeletePassword('');
                  }}
                  className="cursor-pointer rounded-lg border border-[color:var(--border-strong)] px-5 py-2 text-[13px] font-medium text-[color:var(--text)] transition-colors duration-200 ease-out hover:bg-[color:var(--surface-overlay)] focus-visible:ring-2 focus-visible:ring-[color:var(--ring-focus)] focus-visible:outline-none active:translate-y-px motion-reduce:transition-none"
                >
                  {t.platform.settings.security.cancel}
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
