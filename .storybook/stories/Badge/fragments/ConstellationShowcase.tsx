import { BADGES } from '@constants';
import { BadgeConstellation } from '@/components';
import { useTranslations } from '@/i18n';

import { Showcase } from '../../../components';
import { EARNED_DEMO } from '../consts';

export const ConstellationShowcase = () => {
  const t = useTranslations();
  const earnedSet = new Set(EARNED_DEMO);
  const pips = BADGES.map((definition) => ({
    id: definition.id,
    icon: definition.icon,
    label: t.platform.settings.profile.badges[definition.labelKey],
    earned: earnedSet.has(definition.id),
  }));

  return (
    <Showcase
      title="Badge constellation"
      caption="identity card"
      columns={2}
      items={[
        {
          label: 'Default mix',
          hint: `${EARNED_DEMO.length} / ${BADGES.length}`,
          description: `${EARNED_DEMO.length} badges earned, ${BADGES.length - EARNED_DEMO.length} locked. Mirrors the ProfileSection identity card.`,
          children: <BadgeConstellation pips={pips} />,
        },
        {
          label: 'All earned',
          hint: 'maxed',
          description: 'Every badge unlocked. Every pip lit.',
          children: <BadgeConstellation pips={pips.map((pip) => ({ ...pip, earned: true }))} />,
        },
      ]}
    />
  );
};
