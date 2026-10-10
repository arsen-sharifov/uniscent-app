'use client';

import { clsx } from 'clsx';
import type { CSSProperties } from 'react';

import type { IPreferences, TCanvasPattern, TPreferenceUpdater, TTheme } from '@interfaces';

import { useTranslations } from '@/i18n';

import { CANVAS_PATTERNS, THEMES } from '../consts';
import { LanguagePicker } from './LanguagePicker';
import { SectionHeader } from './SectionHeader';
import { SelectedPip } from './SelectedPip';
import { SettingsSwitch } from './SettingsSwitch';

interface IAppearanceSectionProps {
  preferences: IPreferences;
  onUpdate: TPreferenceUpdater;
}

export const AppearanceSection = ({ preferences, onUpdate }: IAppearanceSectionProps) => {
  const t = useTranslations();

  const followsSystem = preferences.theme === 'auto';

  const handleThemeChange = (next: TTheme) => {
    if (next === preferences.theme) {
      return;
    }

    onUpdate('theme', next);
  };

  const handleFollowSystemChange = (next: boolean) => {
    if (next) {
      onUpdate('theme', 'auto');

      return;
    }

    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    onUpdate('theme', prefersDark ? 'eclipse' : 'daybreak');
  };

  const handlePatternChange = (next: TCanvasPattern) => {
    if (next === preferences.canvasPattern) {
      return;
    }

    onUpdate('canvasPattern', next);
  };

  return (
    <div className="space-y-4">
      <LanguagePicker onChange={(next) => onUpdate('language', next)} />

      <section className="border-t border-[color:var(--border)] pt-2.5">
        <SectionHeader
          title={t.platform.settings.appearance.theme}
          caption={t.platform.settings.appearance.themeIntro}
          description={t.platform.settings.appearance.themeBlurb}
        />
        <div
          className={clsx(
            'mb-3 flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-[border-color,background-color] duration-200 ease-out motion-reduce:transition-none',
            followsSystem
              ? 'border-[color:var(--border-active)] bg-[color:var(--accent-soft)]'
              : 'border-[color:var(--border)] bg-[color:var(--surface-elevated)]',
          )}
        >
          <span
            data-theme="auto"
            aria-hidden
            style={{ '--swatch-height': '2.25rem' } as CSSProperties}
            className="theme-swatch block w-20 shrink-0 rounded-md border border-[color:var(--border-strong)]"
          >
            <span className="theme-swatch__sky" />
            <span className="theme-swatch__grid" />
          </span>

          <span className="min-w-0 flex-1">
            <span className="block font-grotesk text-[14px] leading-tight font-semibold tracking-tight text-[color:var(--text-strong)]">
              {t.platform.settings.appearance.themeAuto}
            </span>
            <span className="block font-mono-ui text-[10px] font-bold tracking-[0.04em] text-[color:var(--text-label)] uppercase">
              {t.platform.settings.appearance.autoDesc}
            </span>
          </span>

          <SettingsSwitch
            checked={followsSystem}
            label={t.platform.settings.appearance.themeAuto}
            onChange={handleFollowSystemChange}
          />
        </div>
        <div
          role="radiogroup"
          aria-label={t.platform.settings.appearance.theme}
          className="grid grid-cols-2 gap-3 sm:grid-cols-4"
        >
          {THEMES.map(({ value, labelKey, descriptionKey, systemPair, icon: Icon }) => {
            const isActive = value === preferences.theme;
            const isPaired = followsSystem && systemPair === true;

            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={isActive}
                onClick={() => handleThemeChange(value)}
                className={clsx(
                  'group relative flex cursor-pointer flex-col overflow-hidden rounded-xl border text-left transition-[border-color,background-color,transform,box-shadow] duration-200 ease-out',
                  'hover:-translate-y-0.5 active:translate-y-0',
                  'focus-visible:ring-2 focus-visible:ring-[color:var(--ring-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--surface-panel)] focus-visible:outline-none',
                  'motion-reduce:transition-none motion-reduce:hover:translate-y-0',
                  isActive && 'border-[color:var(--border-active)] bg-[color:var(--accent-soft)]',
                  isPaired && !isActive && 'border-dashed border-[color:var(--border-active)]',
                  !isActive &&
                    !isPaired &&
                    'border-[color:var(--border)] hover:border-[color:var(--border-strong)] hover:shadow-[var(--shadow-card-hover)]',
                )}
              >
                <span
                  data-theme={value}
                  aria-hidden
                  className="theme-swatch block w-full border-b border-[color:var(--border)]"
                >
                  <span className="theme-swatch__sky" />
                  <span className="theme-swatch__grid" />
                  <span className="theme-swatch__pip" />
                  <span className="absolute top-2 left-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-[color:var(--surface)] text-[color:var(--text-strong)] shadow-[var(--shadow-pip)] ring-1 ring-[color:var(--border-strong)] transition-transform duration-200 ease-out group-hover:-translate-y-0.5 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:translate-y-0 motion-reduce:group-hover:scale-100">
                    <Icon className="h-3 w-3" strokeWidth={2.25} />
                  </span>
                </span>

                <span
                  className={clsx(
                    'flex flex-col gap-0.5 px-3 pt-2 pb-2.5',
                    !isActive && 'bg-[color:var(--surface-elevated)]',
                  )}
                >
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="truncate font-grotesk text-[14px] leading-none font-semibold tracking-tight text-[color:var(--text-strong)]">
                      {t.platform.settings.appearance[labelKey]}
                    </span>
                    <SelectedPip active={isActive} />
                  </span>
                  <span className="font-mono-ui text-[10px] font-bold tracking-[0.04em] text-[color:var(--text-label)] uppercase">
                    {t.platform.settings.appearance[descriptionKey]}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="border-t border-[color:var(--border)] pt-2.5">
        <SectionHeader
          title={t.platform.settings.appearance.canvas}
          caption={t.platform.settings.appearance.canvasIntro}
          description={t.platform.settings.appearance.canvasBlurb}
        />

        <div
          role="radiogroup"
          aria-label={t.platform.settings.appearance.canvas}
          className="grid grid-cols-2 gap-3 sm:grid-cols-4"
        >
          {CANVAS_PATTERNS.map(({ value, labelKey, descriptionKey, icon: Icon }) => {
            const isActive = value === preferences.canvasPattern;

            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={isActive}
                onClick={() => handlePatternChange(value)}
                className={clsx(
                  'group relative flex cursor-pointer flex-col overflow-hidden rounded-xl border text-left transition-[border-color,background-color,transform,box-shadow] duration-200 ease-out',
                  'hover:-translate-y-0.5 active:translate-y-0',
                  'focus-visible:ring-2 focus-visible:ring-[color:var(--ring-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--surface)] focus-visible:outline-none',
                  'motion-reduce:transition-none motion-reduce:hover:translate-y-0',
                  isActive
                    ? 'border-[color:var(--border-active)] bg-[color:var(--accent-soft)]'
                    : 'border-[color:var(--border)] hover:border-[color:var(--border-strong)] hover:shadow-[var(--shadow-card-hover)]',
                )}
              >
                <div
                  data-pattern={value}
                  aria-hidden
                  className="pattern-swatch w-full border-b border-[color:var(--border)]"
                >
                  <div className="pattern-swatch__sky" />
                  <div className="pattern-swatch__grid" />
                  <span className="absolute top-2 left-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-[color:var(--surface-elevated)] text-[color:var(--text-strong)] shadow-[var(--shadow-pip)] ring-1 ring-[color:var(--border-strong)] transition-transform duration-200 ease-out group-hover:-translate-y-0.5 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:translate-y-0 motion-reduce:group-hover:scale-100">
                    <Icon className="h-3.5 w-3.5" strokeWidth={2.25} />
                  </span>
                </div>

                <div
                  className={clsx(
                    'flex flex-col gap-0.5 px-3 pt-2 pb-2.5',
                    !isActive && 'bg-[color:var(--surface-elevated)]',
                  )}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-grotesk text-[14px] leading-none font-semibold tracking-tight text-[color:var(--text-strong)]">
                      {t.platform.settings.appearance[labelKey]}
                    </span>
                    <SelectedPip active={isActive} />
                  </div>
                  <span className="font-mono-ui text-[10px] font-bold tracking-[0.04em] text-[color:var(--text-label)] uppercase">
                    {t.platform.settings.appearance[descriptionKey]}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
};
