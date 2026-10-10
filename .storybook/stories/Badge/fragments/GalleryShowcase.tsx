import { BADGES } from '@constants';
import { Badge } from '@/components';
import { useTranslations } from '@/i18n';

import { Showcase } from '../../../components';
import { EARNED_DEMO } from '../consts';

export const GalleryShowcase = () => {
  const t = useTranslations();
  const earnedSet = new Set(EARNED_DEMO);

  return (
    <Showcase
      title="Achievement catalogue"
      caption={`${BADGES.length} badges`}
      columns={4}
      items={BADGES.map((definition) => ({
        label: t.platform.settings.profile.badges[definition.labelKey],
        hint: earnedSet.has(definition.id) ? 'earned' : 'locked',
        children: (
          <div className="flex w-full justify-center">
            <Badge
              icon={definition.icon}
              label={t.platform.settings.profile.badges[definition.labelKey]}
              unlock={t.platform.settings.profile.badges[definition.unlockKey]}
              earned={earnedSet.has(definition.id)}
            />
          </div>
        ),
      }))}
    />
  );
};
