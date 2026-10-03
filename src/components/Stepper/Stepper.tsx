'use client';

import { clsx } from 'clsx';
import { Check } from 'lucide-react';

import { useTranslations } from '@/i18n';

interface IStepperProps {
  steps: string[];
  currentStep: number;
}

export const Stepper = ({ steps, currentStep }: IStepperProps) => {
  const t = useTranslations();

  return (
    <ol className="flex items-center">
      {steps.map((label, index) => {
        const stepNumber = index + 1;
        const isActive = currentStep >= stepNumber;
        const isDone = currentStep > stepNumber;
        const isCurrent = currentStep === stepNumber;
        const isLast = index === steps.length - 1;

        return (
          <li
            key={label}
            aria-current={isCurrent ? 'step' : undefined}
            className={clsx('flex items-center', !isLast && 'flex-1')}
          >
            <div className="flex items-center gap-2">
              <div
                className={clsx(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-mono-ui text-xs font-bold transition-colors duration-200 motion-reduce:transition-none',
                  isActive
                    ? 'bg-[color:var(--accent)] text-[color:var(--on-accent)]'
                    : 'border border-[color:var(--border-strong)] text-[color:var(--text-subtle)]',
                )}
              >
                {isDone ? (
                  <>
                    <Check aria-hidden="true" className="h-3.5 w-3.5" />
                    <span className="sr-only">{t.common.completed}</span>
                  </>
                ) : (
                  stepNumber
                )}
              </div>
              <span
                className={clsx(
                  'font-grotesk text-sm font-medium transition-colors duration-200 motion-reduce:transition-none',
                  isActive ? 'text-[color:var(--text-strong)]' : 'text-[color:var(--text-muted)]',
                )}
              >
                {label}
              </span>
            </div>
            {!isLast && (
              <div
                className={clsx(
                  'mx-4 h-0.5 flex-1 rounded-full transition-colors duration-200 motion-reduce:transition-none',
                  isDone ? 'bg-[color:var(--accent)]' : 'bg-[color:var(--border)]',
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
};
