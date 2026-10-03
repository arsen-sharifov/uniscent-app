import { BADGES } from '@constants';
import { Badge } from '@/components';
import { useTranslations } from '@/i18n';

interface IFounderBadgeProps {
  earned: boolean;
}

export const FounderBadge = ({ earned }: IFounderBadgeProps) => {
  const t = useTranslations();
  const [founder] = BADGES;

  if (!founder) return null;

  return (
    <div className="w-36">
      <Badge
        icon={founder.icon}
        label={t.platform.settings.profile.badges[founder.labelKey]}
        unlock={t.platform.settings.profile.badges[founder.unlockKey]}
        earned={earned}
      />
    </div>
  );
};
