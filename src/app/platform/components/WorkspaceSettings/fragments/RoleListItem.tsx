'use client';

import { clsx } from 'clsx';
import { useState } from 'react';

import type { IWorkspaceRole } from '@interfaces';

import { Tooltip } from '@/components';
import { useTranslations } from '@/i18n';
import { roleLabel } from '@/lib/utils';

import { PERMISSION_DEFINITIONS } from '../consts';
import { InlineConfirm } from './InlineConfirm';
import { RoleIcon } from './RoleIcon';

interface IRoleListItemProps {
  role: IWorkspaceRole;
  canManage: boolean;
  canDelete: boolean;
  onEdit: (role: IWorkspaceRole) => void;
  onDelete: (roleId: string) => void;
}

export const RoleListItem = ({ role, canManage, canDelete, onEdit, onDelete }: IRoleListItemProps) => {
  const t = useTranslations();
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const editable = canManage && !role.isSystem;

  return (
    <div
      className={clsx(
        'rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-elevated)] p-4 transition-[border-color,box-shadow] duration-200 ease-out motion-reduce:transition-none',
        editable && 'hover:border-[color:var(--border-strong)] hover:shadow-[var(--shadow-card-hover)]',
      )}
    >
      <div className="flex items-center gap-3">
        <span
          className={clsx(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
            role.isSystem
              ? 'bg-[color:var(--surface-overlay)] text-[color:var(--text-muted)]'
              : 'bg-[color:var(--accent-soft)] text-[color:var(--accent-text)]',
          )}
        >
          <RoleIcon role={role} className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="truncate font-grotesk text-sm font-semibold text-[color:var(--text-strong)]">
              {roleLabel(role.key, role.name, t)}
            </h4>
            {role.isSystem && (
              <span className="shrink-0 rounded-md bg-[color:var(--surface-overlay)] px-1.5 py-0.5 font-mono-ui text-[10px] font-bold tracking-[0.14em] text-[color:var(--text-label)] uppercase">
                {t.platform.workspaceSettings.roles.systemLocked}
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate font-mono-ui text-[10px] tracking-[0.14em] text-[color:var(--text-label)] uppercase tabular-nums">
            {t('platform.workspaceSettings.roles.memberCount', { count: role.memberCount })}
          </p>
        </div>

        {editable &&
          (confirmingDelete ? (
            <InlineConfirm
              cancelLabel={t.platform.workspaceSettings.roles.cancel}
              confirmLabel={t.platform.workspaceSettings.roles.deleteConfirm}
              onCancel={() => setConfirmingDelete(false)}
              onConfirm={() => {
                setConfirmingDelete(false);
                onDelete(role.id);
              }}
            />
          ) : (
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => onEdit(role)}
                className="cursor-pointer rounded-lg px-2.5 py-1 font-grotesk text-xs font-medium text-[color:var(--text-muted)] transition-[color,background-color,scale] duration-150 hover:bg-[color:var(--surface-overlay)] hover:text-[color:var(--text-strong)] focus-visible:ring-2 focus-visible:ring-[color:var(--ring-focus)] focus-visible:outline-none active:scale-95 motion-reduce:transition-none"
              >
                {t.platform.workspaceSettings.roles.edit}
              </button>
              {canDelete && (
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(true)}
                  className="cursor-pointer rounded-lg px-2.5 py-1 font-grotesk text-xs font-medium text-[color:var(--text-subtle)] transition-[color,background-color,scale] duration-150 hover:bg-[color:var(--status-error-bg)] hover:text-[color:var(--status-error)] focus-visible:ring-2 focus-visible:ring-[color:var(--ring-focus)] focus-visible:outline-none active:scale-95 motion-reduce:transition-none"
                >
                  {t.platform.workspaceSettings.roles.delete}
                </button>
              )}
            </div>
          ))}
      </div>

      <ul aria-label={t.platform.workspaceSettings.roles.permissionsLabel} className="sr-only">
        {PERMISSION_DEFINITIONS.filter(({ key }) => role[key]).map(({ key }) => (
          <li key={key}>{t.platform.workspaceSettings.permissions[key].name}</li>
        ))}
      </ul>

      <div aria-hidden className="mt-3 flex flex-wrap gap-1.5">
        {PERMISSION_DEFINITIONS.map((definition) => (
          <Tooltip key={definition.key} text={t.platform.workspaceSettings.permissions[definition.key].name}>
            <span
              className={clsx(
                'flex h-6 w-6 items-center justify-center rounded-md border',
                role[definition.key]
                  ? 'border-[color:var(--border-active)] bg-[color:var(--accent-soft)] text-[color:var(--accent-text)]'
                  : 'border-dashed border-[color:var(--border-strong)] text-[color:var(--text-faint)]',
              )}
            >
              <definition.icon className="h-3.5 w-3.5" aria-hidden />
            </span>
          </Tooltip>
        ))}
      </div>
    </div>
  );
};
