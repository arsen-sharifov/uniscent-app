'use client';

import { useState } from 'react';

import { useTranslations } from '@/i18n';

import { TourButton } from './TourButton';

interface IExampleChoiceProps {
  onKeep: () => void;
  onRemove: () => Promise<void>;
}

export const ExampleChoice = ({ onKeep, onRemove }: IExampleChoiceProps) => {
  const t = useTranslations();
  const [removing, setRemoving] = useState(false);

  const remove = () => {
    setRemoving(true);
    onRemove();
  };

  return (
    <div className="ml-auto flex shrink-0 items-center gap-2">
      <TourButton variant="secondary" onClick={remove} disabled={removing}>
        {t.platform.onboarding.example.remove}
      </TourButton>
      <TourButton variant="primary" onClick={onKeep} disabled={removing}>
        {t.platform.onboarding.example.keep}
      </TourButton>
    </div>
  );
};
