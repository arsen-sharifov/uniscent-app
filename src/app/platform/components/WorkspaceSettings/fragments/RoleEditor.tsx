'use client';

import { clsx } from 'clsx';
import { useState } from 'react';

import type { IWorkspaceAccess, IWorkspaceRole, IWorkspaceRolePermissions } from '@interfaces';
import { MAX_NAME_LENGTH } from '@constants';
import { useTranslations } from '@/i18n';

import { SettingsInput, SettingsPrimaryButton, Toggle } from '../../Settings';
import { DEFAULT_ROLE_ICON_KEY, EMPTY_PERMISSIONS, PERMISSION_DEFINITIONS, ROLE_ICONS } from '../consts';
import { canGrantPermission } from '../utils';

interface IRoleEditorProps {
  role: IWorkspaceRole | null;
  granter: IWorkspaceAccess | null;
  onSave: (name: string, icon: string, permissions: IWorkspaceRolePermissions) => Promise<boolean>;
  onCancel: () => void;
}

export const RoleEditor = ({ role, granter, onSave, onCancel }: IRoleEditorProps) => {
  const t = useTranslations();

  const [name, setName] = useState(role?.name ?? '');
  const [icon, setIcon] = useState(role?.icon ?? DEFAULT_ROLE_ICON_KEY);
  const [permissions, setPermissions] = useState<IWorkspaceRolePermissions>(
    role
      ? {
          canEditCanvas: role.canEditCanvas,
          canComment: role.canComment,
          canManageStructure: role.canManageStructure,
          canManageMembers: role.canManageMembers,
          canManageRoles: role.canManageRoles,
          canManageWorkspace: role.canManageWorkspace,
        }
      : EMPTY_PERMISSIONS,
  );
  const [saving, setSaving] = useState(false);

  const trimmedName = name.trim();
  const canSave = trimmedName.length > 0 && !saving;
  const submitLabel = role ? t.platform.workspaceSettings.roles.save : t.platform.workspaceSettings.roles.create;

  const handleSave = async () => {
    if (!canSave) return;

    setSaving(true);
    const ok = await onSave(trimmedName, icon, permissions);
    setSaving(false);
    if (ok) onCancel();
  };

  return (
    <div className="space-y-5 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-elevated)] p-5">
      <div>
        <header className="mb-1.5 flex items-baseline justify-between gap-3">
          <h3 className="font-mono-ui text-[10px] font-bold tracking-[0.14em] text-[color:var(--text-label)] uppercase">
            {t.platform.workspaceSettings.roles.nameLabel}
          </h3>
          <span className="shrink-0 font-mono-ui text-[10px] tracking-[0.14em] text-[color:var(--text-faint)] uppercase tabular-nums">
            {trimmedName.length}/{MAX_NAME_LENGTH}
          </span>
        </header>
        <SettingsInput
          autoFocus
          type="text"
          value={name}
          maxLength={MAX_NAME_LENGTH}
          aria-label={t.platform.workspaceSettings.roles.nameLabel}
          placeholder={t.platform.workspaceSettings.roles.namePlaceholder}
          onChange={(inputEvent) => setName(inputEvent.target.value)}
        />
      </div>

      <div>
        <h3 className="mb-2 font-mono-ui text-[10px] font-bold tracking-[0.14em] text-[color:var(--text-label)] uppercase">
          {t.platform.workspaceSettings.roles.iconLabel}
        </h3>
        <div
          role="radiogroup"
          aria-label={t.platform.workspaceSettings.roles.iconLabel}
          className="grid grid-cols-6 gap-2"
        >
          {ROLE_ICONS.map((option) => (
            <button
              key={option.key}
              type="button"
              role="radio"
              aria-checked={icon === option.key}
              aria-label={t.platform.workspaceSettings.roleIcons[option.key]}
              onClick={() => setIcon(option.key)}
              className={clsx(
                'flex aspect-square cursor-pointer items-center justify-center rounded-lg border transition-[color,background-color,border-color,scale] duration-150 focus-visible:ring-2 focus-visible:ring-[color:var(--ring-focus)] focus-visible:outline-none active:scale-95 motion-reduce:transition-none',
                icon === option.key
                  ? 'border-[color:var(--border-active)] bg-[color:var(--accent-soft)] text-[color:var(--accent-text)]'
                  : 'border-[color:var(--border)] text-[color:var(--text-subtle)] hover:border-[color:var(--border-strong)] hover:bg-[color:var(--surface-overlay)] hover:text-[color:var(--text)]',
              )}
            >
              <option.icon className="h-4 w-4" aria-hidden />
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-3 font-mono-ui text-[10px] font-bold tracking-[0.14em] text-[color:var(--text-label)] uppercase">
          {t.platform.workspaceSettings.roles.permissionsLabel}
        </h3>
        <div className="divide-y divide-[color:var(--border)] overflow-hidden rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-soft)]">
          {PERMISSION_DEFINITIONS.filter(({ key }) => canGrantPermission(key, granter)).map((definition) => (
            <div
              key={definition.key}
              className={clsx(
                'px-3 py-2.5 transition-colors duration-150 motion-reduce:transition-none',
                permissions[definition.key]
                  ? 'bg-[color:var(--accent-soft)]'
                  : 'hover:bg-[color:var(--surface-overlay)]',
              )}
            >
              <Toggle
                icon={definition.icon}
                label={t.platform.workspaceSettings.permissions[definition.key].name}
                description={t.platform.workspaceSettings.permissions[definition.key].description}
                checked={permissions[definition.key]}
                onChange={(value) => setPermissions((previous) => ({ ...previous, [definition.key]: value }))}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="cursor-pointer rounded-lg border border-[color:var(--border-strong)] px-4 py-2 font-grotesk text-sm font-medium text-[color:var(--text-muted)] transition-[color,background-color,scale] duration-150 hover:bg-[color:var(--surface-overlay)] hover:text-[color:var(--text-strong)] focus-visible:ring-2 focus-visible:ring-[color:var(--ring-focus)] focus-visible:outline-none active:scale-95 motion-reduce:transition-none"
        >
          {t.platform.workspaceSettings.roles.cancel}
        </button>
        <SettingsPrimaryButton onClick={handleSave} disabled={!canSave}>
          {saving ? t.platform.workspaceSettings.roles.saving : submitLabel}
        </SettingsPrimaryButton>
      </div>
    </div>
  );
};
