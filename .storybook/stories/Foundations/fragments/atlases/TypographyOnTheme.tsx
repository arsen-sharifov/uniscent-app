import { clsx } from 'clsx';

import type { TTheme } from '@interfaces';

import { THEME_LIST, TYPE_SCALE } from '../../consts';
import { findActiveTheme } from '../../utils';
import { AtlasFrame, Section, ThemedSurface } from '../layout';

interface ITypographyOnThemeProps {
  activeTheme: TTheme;
}

export const TypographyOnTheme = ({ activeTheme }: ITypographyOnThemeProps) => {
  const samples = TYPE_SCALE.filter((row) =>
    ['display/grotesk', 'h1/grotesk', 'body/grotesk', 'label/mono'].includes(row.token),
  );

  return (
    <AtlasFrame
      tag="Themes · Typography"
      title="Type, theme-bound."
      intro="The same four scale steps rendered against every theme, so the rhythm can be checked on mist, on ink, on bright cyan, on blue-grey, and on deep violet."
    >
      <Section
        id="grid"
        index="§ 01"
        title="Voices in context"
        description={`Currently anchored to ${findActiveTheme(activeTheme).name}.`}
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {THEME_LIST.map((theme) => (
            <ThemedSurface key={theme.id} themeId={theme.id} className="space-y-4 p-6">
              <header className="flex items-baseline justify-between">
                <h3 className="font-grotesk text-[20px] leading-none font-semibold tracking-[-0.01em] text-[color:var(--text-strong)]">
                  {theme.name}
                </h3>
                <span className="font-mono-ui text-[9px] tracking-[0.22em] text-[color:var(--text-subtle)] uppercase">
                  {theme.mode}
                </span>
              </header>
              {samples.map((sample) => (
                <div key={sample.token} className="space-y-1">
                  <span className="block font-mono-ui text-[8.5px] font-semibold tracking-[0.24em] text-[color:var(--text-faint)] uppercase">
                    {sample.token}
                  </span>
                  <p
                    className={clsx(
                      sample.classes,
                      sample.uppercase ? 'text-[color:var(--text-subtle)]' : 'text-[color:var(--text-strong)]',
                    )}
                  >
                    {sample.sample}
                  </p>
                </div>
              ))}
            </ThemedSurface>
          ))}
        </div>
      </Section>
    </AtlasFrame>
  );
};
