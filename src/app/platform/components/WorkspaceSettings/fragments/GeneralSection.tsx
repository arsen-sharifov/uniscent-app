'use client';

import { CalendarDays, LayoutGrid, Shield, Users } from 'lucide-react';
import { useFormatter } from 'next-intl';
import { type KeyboardEvent, useState } from 'react';

import { MAX_NAME_LENGTH } from '@constants';
import { useTranslations } from '@/i18n';

import { DetailRow } from './DetailRow';
import { SettingsInput, SettingsPrimaryButton } from '../../Settings';

interface IGeneralSectionProps {
  workspaceId: string;
  initialName: string;
  createdAt: string | null;
  memberCount: number;
  currentRoleName: string | null;
  canManageWorkspace: boolean;
  onRename: (id: string, name: string) => Promise<void> | void;
}

export const GeneralSection = ({
  workspaceId,
  initialName,
  createdAt,
  memberCount,
  currentRoleName,
  canManageWorkspace,
  onRename,
}: IGeneralSectionProps) => {
  const t = useTranslations();
  const format = useFormatter();

  const [name, setName] = useState(initialName);
  const [saving, setSaving] = useState(false);

  const trimmedName = name.trim();
  const changed = trimmedName !== initialName;
  const canSave = changed && trimmedName.length > 0 && !saving;

  const createdLabel = createdAt
    ? format.dateTime(new Date(createdAt), { day: 'numeric', month: 'short', year: 'numeric' })
    : null;

  const handleSave = async () => {
    if (!canSave) return;

    setSaving(true);
    await onRename(workspaceId, trimmedName);
    setSaving(false);
  };

  const handleKeyDown = (keyEvent: KeyboardEvent<HTMLInputElement>) => {
    if (keyEvent.key === 'Enter') handleSave();
  };

  return (
    <div className="space-y-6">
      {canManageWorkspace && (
        <section>
          <header className="mb-2 flex items-baseline justify-between gap-3">
            <h3 className="font-mono-ui text-[10px] font-bold tracking-[0.14em] text-[color:var(--text-label)] uppercase">
              {t.platform.workspaceSettings.general.nameLabel}
            </h3>
            <span className="shrink-0 font-mono-ui text-[10px] tracking-[0.14em] text-[color:var(--text-faint)] uppercase tabular-nums">
              {trimmedName.length}/{MAX_NAME_LENGTH}
            </span>
          </header>
          <div className="flex gap-2">
            <div className="min-w-0 flex-1">
              <SettingsInput
                type="text"
                value={name}
                maxLength={MAX_NAME_LENGTH}
                aria-label={t.platform.workspaceSettings.general.nameLabel}
                placeholder={t.platform.workspaceSettings.general.namePlaceholder}
                onChange={(inputEvent) => setName(inputEvent.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
            <SettingsPrimaryButton onClick={handleSave} disabled={!canSave}>
              {saving ? t.platform.workspaceSettings.general.saving : t.platform.workspaceSettings.general.save}
            </SettingsPrimaryButton>
          </div>
        </section>
      )}

      <section className="divide-y divide-[color:var(--border)] overflow-hidden rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-elevated)] px-5">
        {!canManageWorkspace && (
          <DetailRow icon={LayoutGrid} label={t.platform.workspaceSettings.general.nameLabel} value={initialName} />
        )}
        <DetailRow
          icon={Users}
          label={t.platform.workspaceSettings.general.membersStat}
          value={String(memberCount)}
          mono
        />
        {currentRoleName && (
          <DetailRow icon={Shield} label={t.platform.workspaceSettings.general.roleStat} value={currentRoleName} />
        )}
        {createdLabel && (
          <DetailRow
            icon={CalendarDays}
            label={t.platform.workspaceSettings.general.createdStat}
            value={createdLabel}
            mono
          />
        )}
      </section>
    </div>
  );
};
