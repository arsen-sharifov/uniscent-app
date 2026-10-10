'use client';

import type { IMyInvitation } from '@interfaces';

import { useTranslations } from '@/i18n';
import { roleLabel } from '@/lib/utils';

interface IInvitationCardProps {
  invitation: IMyInvitation;
  onAccept: () => void;
  onDecline: () => void;
}

export const InvitationCard = ({ invitation, onAccept, onDecline }: IInvitationCardProps) => {
  const t = useTranslations();

  return (
    <div className="rounded-xl border border-[color:var(--status-warning-border)] bg-[color:var(--status-warning-bg)] px-2.5 py-2">
      <p className="truncate font-grotesk text-xs font-semibold text-[color:var(--text-strong)]">
        {invitation.workspaceName}
      </p>
      <p className="truncate font-mono-ui text-[10px] text-[color:var(--text-label)] lowercase">
        {roleLabel(invitation.roleKey, invitation.roleName, t)}
      </p>
      <div className="mt-1.5 flex gap-1.5">
        <button
          type="button"
          onClick={onAccept}
          className="flex-1 cursor-pointer rounded-lg bg-[color:var(--accent)] px-2 py-1 font-grotesk text-[11px] font-semibold text-[color:var(--on-accent)] shadow-[0_10px_28px_-12px_var(--accent-glow)] transition-colors duration-150 hover:bg-[color:var(--accent-strong)] focus-visible:ring-2 focus-visible:ring-[color:var(--ring-focus)] focus-visible:outline-none active:bg-[color:var(--accent-strong)] motion-reduce:transition-none"
        >
          {t.platform.sidebar.invitations.accept}
        </button>
        <button
          type="button"
          onClick={onDecline}
          className="cursor-pointer rounded-lg border border-[color:var(--border-strong)] px-2 py-1 font-grotesk text-[11px] font-medium text-[color:var(--text-muted)] transition-colors duration-150 hover:bg-[color:var(--surface-overlay)] hover:text-[color:var(--text-strong)] focus-visible:ring-2 focus-visible:ring-[color:var(--ring-focus)] focus-visible:outline-none active:bg-[color:var(--surface-overlay)] active:text-[color:var(--text-strong)] motion-reduce:transition-none"
        >
          {t.platform.sidebar.invitations.decline}
        </button>
      </div>
    </div>
  );
};
