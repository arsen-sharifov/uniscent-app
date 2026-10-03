'use client';

import { clsx } from 'clsx';
import { Crown, Trash2 } from 'lucide-react';
import { useState } from 'react';

import type { IWorkspaceMember, IWorkspaceRole } from '@interfaces';

import { Avatar } from '@/components';
import { useTranslations } from '@/i18n';
import { roleLabel } from '@/lib/utils';

import { InlineConfirm } from './InlineConfirm';
import { RoleSelect } from './RoleSelect';

interface IMemberRowProps {
  member: IWorkspaceMember;
  roles: IWorkspaceRole[];
  ownerRoleId: string | null;
  isSelf: boolean;
  canManage: boolean;
  onAssignRole: (userId: string, roleId: string) => void;
  onRemove: (userId: string) => void;
  onRequestTransfer: (member: IWorkspaceMember) => void;
}

export const MemberRow = ({
  member,
  roles,
  ownerRoleId,
  isSelf,
  canManage,
  onAssignRole,
  onRemove,
  onRequestTransfer,
}: IMemberRowProps) => {
  const t = useTranslations();
  const [confirmingRemove, setConfirmingRemove] = useState(false);

  const displayName = member.name || member.email;

  const handleRoleChange = (roleId: string) => {
    if (roleId === ownerRoleId) {
      onRequestTransfer(member);
    } else {
      onAssignRole(member.userId, roleId);
    }
  };

  const renderControl = () => {
    if (member.isOwner) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md bg-[color:var(--accent-soft)] px-2.5 py-1 font-mono-ui text-[10px] font-bold tracking-[0.14em] text-[color:var(--accent-text)] uppercase">
          <Crown className="h-3.5 w-3.5" aria-hidden />
          {t.platform.workspaceSettings.roleNames.owner}
        </span>
      );
    }

    if (!canManage) {
      const isBaseline = member.roleKey === 'member' || member.roleKey === 'viewer';

      return (
        <span
          className={clsx(
            'inline-block max-w-36 truncate rounded-md px-2.5 py-1 font-mono-ui text-[10px] font-bold tracking-[0.14em] uppercase',
            isBaseline
              ? 'bg-[color:var(--surface-overlay)] text-[color:var(--text-muted)]'
              : 'bg-[color:var(--accent-soft)] text-[color:var(--accent-text)]',
          )}
        >
          {roleLabel(member.roleKey, member.roleName, t)}
        </span>
      );
    }

    if (confirmingRemove) {
      return (
        <InlineConfirm
          prompt={`${t.platform.workspaceSettings.members.remove}?`}
          cancelLabel={t.platform.workspaceSettings.members.cancel}
          confirmLabel={t.platform.workspaceSettings.members.removeConfirm}
          onCancel={() => setConfirmingRemove(false)}
          onConfirm={() => {
            setConfirmingRemove(false);
            onRemove(member.userId);
          }}
        />
      );
    }

    return (
      <div className="flex items-center gap-1.5">
        <RoleSelect
          className="w-32"
          value={member.roleId}
          roles={roles}
          onChange={handleRoleChange}
          ariaLabel={t.platform.workspaceSettings.members.changeRole}
        />
        {!isSelf && (
          <button
            type="button"
            onClick={() => setConfirmingRemove(true)}
            title={t.platform.workspaceSettings.members.remove}
            aria-label={t.platform.workspaceSettings.members.remove}
            className="cursor-pointer rounded-lg p-1.5 text-[color:var(--text-subtle)] opacity-0 transition-[color,background-color,opacity] duration-150 group-focus-within:opacity-100 group-hover:opacity-100 hover:bg-[color:var(--status-error-bg)] hover:text-[color:var(--status-error)] focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-[color:var(--ring-focus)] focus-visible:outline-none active:bg-[color:var(--status-error-soft)] active:text-[color:var(--status-error)] motion-reduce:transition-none"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="group flex items-center gap-3 px-3 py-2.5 transition-colors duration-150 hover:bg-[color:var(--surface-overlay)] motion-reduce:transition-none">
      <Avatar name={displayName} icon={member.avatarIcon} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 font-grotesk text-sm font-medium text-[color:var(--text-strong)]">
          <span className="truncate">{displayName}</span>
          {isSelf && (
            <span className="shrink-0 rounded-md bg-[color:var(--surface-overlay)] px-1.5 py-0.5 font-mono-ui text-[10px] font-bold tracking-[0.14em] text-[color:var(--text-muted)] uppercase">
              {t.platform.workspaceSettings.members.you}
            </span>
          )}
        </p>
        <p className="truncate font-mono-ui text-[10px] text-[color:var(--text-label)]">{member.email}</p>
      </div>
      <div className="shrink-0">{renderControl()}</div>
    </div>
  );
};
