'use client';

import { clsx } from 'clsx';

import type { TWorkspaceSettingsSection } from '@interfaces';

import { SelectionStrip } from '@/components';
import { useTranslations } from '@/i18n';

import { WORKSPACE_SECTION_NAV_ANCHORS, WORKSPACE_SETTINGS_GROUPS } from '../consts';

interface IWorkspaceSettingsSidebarProps {
  activeSection: TWorkspaceSettingsSection;
  onSectionChange: (section: TWorkspaceSettingsSection) => void;
}

export const WorkspaceSettingsSidebar = ({ activeSection, onSectionChange }: IWorkspaceSettingsSidebarProps) => {
  const t = useTranslations();

  return (
    <div
      data-tour="workspaceSettingsNav"
      className="w-52 shrink-0 overflow-y-auto border-r border-[color:var(--border)] bg-[color:var(--surface-overlay)] py-4 transition-[background-color,border-color] duration-200 ease-out motion-reduce:transition-none"
    >
      {WORKSPACE_SETTINGS_GROUPS.map((group, index) => (
        <div key={group.labelKey} className={clsx('px-3 py-3', index > 0 && 'border-t border-[color:var(--border)]')}>
          <span className="mb-2 block px-3 font-mono-ui text-[10px] font-bold tracking-[0.14em] text-[color:var(--text-label)] uppercase">
            {t.platform.workspaceSettings.groups[group.labelKey]}
          </span>
          <div className="space-y-0.5">
            {group.items.map((item) => {
              const isActive = activeSection === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  data-tour={WORKSPACE_SECTION_NAV_ANCHORS[item.id]}
                  onClick={() => onSectionChange(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={clsx(
                    'group relative flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-1.5 font-grotesk text-sm transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-[color:var(--ring-focus)] focus-visible:outline-none focus-visible:ring-inset motion-reduce:transition-none',
                    isActive
                      ? 'bg-[color:var(--accent-soft)] font-medium text-[color:var(--accent-text)]'
                      : 'text-[color:var(--text-muted)] hover:bg-[color:var(--surface-overlay)] hover:text-[color:var(--text-strong)] active:bg-[color:var(--surface-overlay)] active:text-[color:var(--text-strong)]',
                  )}
                >
                  {isActive && <SelectionStrip />}
                  <item.icon
                    aria-hidden
                    className={clsx(
                      'h-4 w-4 shrink-0 transition-colors duration-150 motion-reduce:transition-none',
                      isActive
                        ? 'text-[color:var(--accent-text)]'
                        : 'text-[color:var(--text-subtle)] group-hover:text-[color:var(--text-muted)]',
                    )}
                  />
                  <span className="truncate">{t.platform.workspaceSettings.sections[item.id]}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
