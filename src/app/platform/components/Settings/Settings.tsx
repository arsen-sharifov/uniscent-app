'use client';

import { X } from 'lucide-react';
import { useId, useState } from 'react';

import type { IPreferences, TPreferenceUpdater, TSettingsSection } from '@interfaces';

import { Modal } from '@/components';
import { useTranslations } from '@/i18n';
import { useOnboardingStore } from '@/lib/onboarding';

import { SECTION_ANCHORS } from './consts';
import {
  AppearanceSection,
  EditorSection,
  NotificationsSection,
  PlanSection,
  ProfileSection,
  SecuritySection,
  SettingsSidebar,
  SettingsSkeleton,
} from './fragments';
import { useSettings } from './hooks';

interface ISettingsProps {
  onClose: () => void;
  preferences: IPreferences;
  updatePreference: TPreferenceUpdater;
}

export const Settings = ({ onClose, preferences, updatePreference }: ISettingsProps) => {
  const t = useTranslations();
  const titleId = useId();
  const [activeSection, setActiveSection] = useState<TSettingsSection>('profile');
  const { user, loading, updateProfile, changeEmail, changePassword, getMyOwnedSharedWorkspaces, deleteAccount } =
    useSettings();

  const renderSection = () => {
    if (loading && (activeSection === 'profile' || activeSection === 'plan')) {
      return <SettingsSkeleton section={activeSection} />;
    }

    if (activeSection === 'profile') {
      return (
        <ProfileSection
          key={user?.id}
          user={user}
          onUpdateProfile={async (update) => {
            await updateProfile(update);
            useOnboardingStore.getState().markSignal('profileSaved');
          }}
          onUpdateEmail={changeEmail}
        />
      );
    }

    if (activeSection === 'security') {
      return (
        <SecuritySection
          onChangePassword={changePassword}
          onCheckDeletion={getMyOwnedSharedWorkspaces}
          onDeleteAccount={deleteAccount}
        />
      );
    }

    if (activeSection === 'notifications') {
      return <NotificationsSection />;
    }

    if (activeSection === 'appearance') {
      return <AppearanceSection preferences={preferences} onUpdate={updatePreference} />;
    }

    if (activeSection === 'editor') {
      return <EditorSection preferences={preferences} onUpdate={updatePreference} />;
    }

    return <PlanSection user={user} />;
  };

  return (
    <Modal open onClose={onClose} width="max-w-[1100px]" overflowHidden labelledBy={titleId}>
      <div
        data-tour="settingsModal"
        data-theme={preferences.theme}
        className="flex h-[86vh] rounded-2xl font-grotesk text-[color:var(--text)] transition-[color] duration-200 ease-out motion-reduce:transition-none"
      >
        <SettingsSidebar activeSection={activeSection} onSectionChange={setActiveSection} />

        <div className="relative flex-1 [scrollbar-width:none] overflow-y-auto px-10 py-5 [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            onClick={onClose}
            aria-label={t.platform.settings.close}
            className="absolute top-4 right-4 z-10 cursor-pointer rounded-lg p-1.5 text-[color:var(--text-subtle)] transition-colors duration-200 ease-out hover:bg-[color:var(--surface-overlay)] hover:text-[color:var(--text-strong)] focus-visible:ring-2 focus-visible:ring-[color:var(--ring-focus)] focus-visible:outline-none active:bg-[color:var(--border)] motion-reduce:transition-none"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>

          <h2
            id={titleId}
            className="mb-6 font-grotesk text-lg font-semibold tracking-tight text-[color:var(--text-strong)]"
          >
            {t.platform.settings.sections[activeSection]}
          </h2>

          <div data-tour={SECTION_ANCHORS[activeSection]}>{renderSection()}</div>
        </div>
      </div>
    </Modal>
  );
};
