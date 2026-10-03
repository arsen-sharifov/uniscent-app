'use client';

import { useTranslations } from '@/i18n';

import { NOTIFICATION_ITEMS } from '../consts';
import { Toggle } from './Toggle';

export const NotificationsSection = () => {
  const t = useTranslations();

  return (
    <div className="space-y-8">
      <section>
        <header className="mb-4 flex items-center gap-2.5">
          <h3 className="font-mono-ui text-[10px] font-bold tracking-[0.14em] text-[color:var(--text-label)] uppercase">
            {t.platform.settings.notifications.title}
          </h3>
          <span className="rounded-md bg-[color:var(--surface-overlay)] px-2 py-0.5 font-mono-ui text-[10px] font-bold tracking-[0.14em] text-[color:var(--text-label)] uppercase ring-1 ring-[color:var(--border-strong)]">
            {t.platform.settings.comingSoon}
          </span>
        </header>

        <div className="divide-y divide-[color:var(--border)] rounded-xl border border-dashed border-[color:var(--border-strong)] bg-[color:var(--surface-soft)] px-5">
          {NOTIFICATION_ITEMS.map(({ icon, labelKey, descriptionKey }) => (
            <div key={labelKey} className="py-4">
              <Toggle
                icon={icon}
                label={t.platform.settings.notifications[labelKey]}
                description={t.platform.settings.notifications[descriptionKey]}
                checked
                onChange={() => {}}
                disabled
              />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
