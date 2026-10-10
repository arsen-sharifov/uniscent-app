'use client';

import { Mail, X } from 'lucide-react';
import { useMemo, useState } from 'react';

import type { IWorkspaceInvitation, IWorkspaceMember, IWorkspaceRole } from '@interfaces';
import { EMAIL_PATTERN } from '@constants';
import { useTranslations } from '@/i18n';
import { roleLabel } from '@/lib/utils';

import { MemberRow } from './MemberRow';
import { OwnershipTransferDialog } from './OwnershipTransferDialog';
import { RoleSelect } from './RoleSelect';
import { SettingsInput, SettingsPrimaryButton } from '../../Settings';
import { canGrantRole } from '../utils';

interface IMembersSectionProps {
  members: IWorkspaceMember[];
  roles: IWorkspaceRole[];
  invitations: IWorkspaceInvitation[];
  currentUserId: string | null;
  currentRole: IWorkspaceRole | null;
  canManageMembers: boolean;
  onAssignRole: (userId: string, roleId: string) => void;
  onRemoveMember: (userId: string) => void;
  onTransferOwnership: (userId: string) => void;
  onInvite: (email: string, roleId: string) => Promise<boolean>;
  onRevokeInvitation: (invitationId: string) => void;
}

export const MembersSection = ({
  members,
  roles,
  invitations,
  currentUserId,
  currentRole,
  canManageMembers,
  onAssignRole,
  onRemoveMember,
  onTransferOwnership,
  onInvite,
  onRevokeInvitation,
}: IMembersSectionProps) => {
  const t = useTranslations();

  const grantableRoleIds = useMemo(
    () => new Set(roles.filter((role) => canGrantRole(role, currentRole)).map((role) => role.id)),
    [roles, currentRole],
  );
  const assignableRoles = useMemo(
    () => roles.filter((role) => !role.isOwner && grantableRoleIds.has(role.id)),
    [roles, grantableRoleIds],
  );
  const ownerRoleId = roles.find((role) => role.isOwner)?.id ?? null;
  const currentIsOwner = currentRole?.isOwner ?? false;
  const defaultRoleId = (assignableRoles.find((role) => role.key === 'member') ?? assignableRoles[0])?.id ?? '';

  const [transferTarget, setTransferTarget] = useState<IWorkspaceMember | null>(null);
  const [email, setEmail] = useState('');
  const [inviteRoleId, setInviteRoleId] = useState('');
  const [sending, setSending] = useState(false);

  const effectiveInviteRoleId = assignableRoles.some((role) => role.id === inviteRoleId) ? inviteRoleId : defaultRoleId;
  const emailValid = EMAIL_PATTERN.test(email.trim());
  const canInvite = emailValid && effectiveInviteRoleId.length > 0 && !sending;

  const handleInvite = async () => {
    if (!canInvite) return;

    setSending(true);
    const ok = await onInvite(email.trim(), effectiveInviteRoleId);
    setSending(false);
    if (ok) setEmail('');
  };

  return (
    <div className="space-y-6">
      <section>
        <header className="mb-2 flex items-baseline justify-between gap-3">
          <p className="font-grotesk text-xs leading-snug text-[color:var(--text-muted)]">
            {t.platform.workspaceSettings.members.hint}
          </p>
          <span className="shrink-0 font-mono-ui text-[10px] tracking-[0.14em] text-[color:var(--text-faint)] uppercase tabular-nums">
            {members.length}
          </span>
        </header>
        <div className="divide-y divide-[color:var(--border)] overflow-hidden rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-elevated)]">
          {members.map((member) => (
            <MemberRow
              key={member.userId}
              member={member}
              roles={currentIsOwner ? roles : assignableRoles}
              ownerRoleId={ownerRoleId}
              isSelf={member.userId === currentUserId}
              canManage={canManageMembers && grantableRoleIds.has(member.roleId)}
              onAssignRole={onAssignRole}
              onRemove={onRemoveMember}
              onRequestTransfer={setTransferTarget}
            />
          ))}
        </div>
      </section>

      {canManageMembers && (
        <section className="border-t border-[color:var(--border)] pt-4">
          <h3 className="font-mono-ui text-[10px] font-bold tracking-[0.14em] text-[color:var(--text-label)] uppercase">
            {t.platform.workspaceSettings.members.inviteTitle}
          </h3>
          <p className="mt-1 mb-2 font-grotesk text-xs leading-snug text-[color:var(--text-muted)]">
            {t.platform.workspaceSettings.members.inviteHint}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <div className="min-w-[12rem] flex-1">
              <SettingsInput
                type="email"
                value={email}
                placeholder={t.platform.workspaceSettings.members.emailPlaceholder}
                onChange={(inputEvent) => setEmail(inputEvent.target.value)}
              />
            </div>
            <RoleSelect
              className="w-40"
              value={effectiveInviteRoleId}
              roles={assignableRoles}
              onChange={setInviteRoleId}
              ariaLabel={t.platform.workspaceSettings.general.roleStat}
            />
            <SettingsPrimaryButton onClick={handleInvite} disabled={!canInvite}>
              {sending ? t.platform.workspaceSettings.members.sending : t.platform.workspaceSettings.members.sendInvite}
            </SettingsPrimaryButton>
          </div>

          {invitations.length > 0 && (
            <div className="mt-5">
              <h4 className="mb-1.5 font-mono-ui text-[10px] font-bold tracking-[0.14em] text-[color:var(--text-label)] uppercase">
                {t.platform.workspaceSettings.members.pendingTitle}
              </h4>
              <div className="divide-y divide-[color:var(--border)] overflow-hidden rounded-xl border border-[color:var(--status-warning-border)] bg-[color:var(--surface-elevated)]">
                {invitations.map((invitation) => (
                  <div
                    key={invitation.id}
                    className="group flex items-center gap-3 px-3 py-2.5 transition-colors duration-150 hover:bg-[color:var(--status-warning-bg)] motion-reduce:transition-none"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[color:var(--status-warning-border)] bg-[color:var(--status-warning-bg)] text-[color:var(--status-warning)]">
                      <Mail className="h-3.5 w-3.5" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-mono-ui text-xs text-[color:var(--text-strong)]">
                        {invitation.email}
                      </p>
                      <span className="mt-1 inline-block max-w-full truncate rounded-md border border-[color:var(--status-warning-border)] bg-[color:var(--status-warning-bg)] px-1.5 py-0.5 font-mono-ui text-[10px] font-bold tracking-[0.14em] text-[color:var(--status-warning)] uppercase">
                        {roleLabel(invitation.roleKey, invitation.roleName, t)}
                      </span>
                    </div>
                    {grantableRoleIds.has(invitation.roleId) && (
                      <button
                        type="button"
                        onClick={() => onRevokeInvitation(invitation.id)}
                        className="flex shrink-0 cursor-pointer items-center gap-1 rounded-lg px-2 py-1 font-grotesk text-xs font-medium text-[color:var(--text-muted)] opacity-0 transition-[color,background-color,opacity] duration-150 group-focus-within:opacity-100 group-hover:opacity-100 hover:bg-[color:var(--status-error-bg)] hover:text-[color:var(--status-error)] focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-[color:var(--ring-focus)] focus-visible:outline-none active:bg-[color:var(--status-error-soft)] active:text-[color:var(--status-error)] motion-reduce:transition-none"
                      >
                        <X className="h-3.5 w-3.5" aria-hidden />
                        {t.platform.workspaceSettings.members.revoke}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {transferTarget && (
        <OwnershipTransferDialog
          member={transferTarget}
          onConfirm={() => {
            onTransferOwnership(transferTarget.userId);
            setTransferTarget(null);
          }}
          onCancel={() => setTransferTarget(null)}
        />
      )}
    </div>
  );
};
