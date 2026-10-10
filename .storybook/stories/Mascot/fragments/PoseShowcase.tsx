import type { TMascotCharacter } from '@interfaces';

import { Mascot } from '@/components';
import { useTranslations } from '@/i18n';

import { Showcase } from '../../../components';
import { MASCOT_POSE_HINTS, MASCOT_POSE_IDS } from '../consts';

interface IPoseShowcaseProps {
  character: TMascotCharacter;
}

export const PoseShowcase = ({ character }: IPoseShowcaseProps) => {
  const t = useTranslations();

  return (
    <Showcase
      title={`${character === 'ergo' ? t.platform.onboarding.ergoName : t.platform.onboarding.nodiName} poses`}
      caption={`${MASCOT_POSE_IDS.length} poses`}
      columns={4}
      items={MASCOT_POSE_IDS.map((pose) => ({
        label: pose,
        hint: MASCOT_POSE_HINTS[pose],
        children: (
          <div className="flex w-full justify-center">
            <Mascot
              pose={pose}
              character={character}
              label={character === 'ergo' ? t.platform.onboarding.ergoAlt : t.platform.onboarding.nodiAlt}
              className="h-24 w-24"
            />
          </div>
        ),
      }))}
    />
  );
};
