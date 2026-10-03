'use client';

import type { TMascotPose } from '@interfaces';

import { Mascot } from '@/components/Mascot';
import { useTranslations } from '@/i18n';

interface INodiHeadingProps {
  title: string;
  titleId: string;
  pose: TMascotPose;
  nodiClassName?: string;
}

export const NodiHeading = ({ title, titleId, pose, nodiClassName }: INodiHeadingProps) => {
  const t = useTranslations();

  return (
    <div className="flex items-center gap-3">
      <Mascot pose={pose} label={t.platform.onboarding.nodiAlt} className={nodiClassName} />

      <div className="min-w-0">
        <span className="block font-mono-ui text-[10.5px] tracking-[0.12em] text-[color:var(--accent-text)]">
          {t.platform.onboarding.nodiName}
        </span>
        <h2
          id={titleId}
          className="mt-1 font-grotesk text-lg leading-tight font-semibold tracking-tight text-[color:var(--text-strong)]"
        >
          {title}
        </h2>
      </div>
    </div>
  );
};
