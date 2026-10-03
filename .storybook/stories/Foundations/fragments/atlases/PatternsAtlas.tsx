import { clsx } from 'clsx';

import type { TCanvasPattern, TTheme } from '@interfaces';
import { CANVAS_PATTERN_VALUES } from '@constants';

import {
  PATTERN_CAPTIONS,
  PATTERNS_SECTIONS,
  RADIUS_SCALE,
  RADIUS_TABLE_COLUMNS,
  SHADOW_TABLE_COLUMNS,
  SHADOW_TOKENS,
  SPACING_TABLE_COLUMNS,
  SPACING_TOKENS,
  THEME_LIST,
} from '../../consts';
import { findActiveTheme } from '../../utils';
import { AtlasFrame, Cell, Section, Table, TableRow, ThemedSurface } from '../layout';
import { PatternStage } from '../patterns';
import { Copyable } from '../widgets';

interface IPatternsAtlasProps {
  pattern: TCanvasPattern;
  activeTheme: TTheme;
}

export const PatternsAtlas = ({ pattern, activeTheme }: IPatternsAtlasProps) => {
  const activeName = findActiveTheme(activeTheme).name;
  const patternMeta = PATTERN_CAPTIONS[pattern];

  return (
    <AtlasFrame
      tag="Patterns & Effects"
      title="Texture, depth, breath."
      intro="The canvas Background renders through real React Flow — what you see is what the platform draws. Underneath sit the three effect tables that shape every surface: radius, shadow, spacing."
      sections={PATTERNS_SECTIONS}
      utilities={
        <div className="flex flex-col items-end gap-0.5">
          <span className="font-mono-ui text-[9.5px] tracking-[0.22em] text-[color:var(--text-subtle)] uppercase">
            stage
          </span>
          <span className="font-grotesk text-[20px] leading-none font-semibold tracking-[-0.01em] text-[color:var(--text-strong)]">
            {patternMeta.label} · {activeName}
          </span>
        </div>
      }
    >
      <Section
        id="stage"
        index="§ 01"
        title="Stage"
        description="Active pattern × active theme, rendered through the real Background component."
      >
        <div className="space-y-3">
          <PatternStage pattern={pattern} className="h-[360px] rounded-2xl">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                backgroundImage:
                  'radial-gradient(80% 60% at 80% 6%, var(--accent-glow), transparent 60%), radial-gradient(60% 50% at 14% 100%, color-mix(in oklab, var(--accent-2) 22%, transparent), transparent 70%)',
                opacity: 0.4,
              }}
            />
          </PatternStage>
          <p className="max-w-[640px] text-[12.5px] leading-relaxed text-[color:var(--text-muted)]">
            {patternMeta.description}
          </p>
        </div>
      </Section>

      <Section
        id="variants"
        index="§ 02"
        title="Variants"
        description="The four canvas patterns under the active theme — switch `pattern` in Controls to choose."
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {CANVAS_PATTERN_VALUES.map((variant) => {
            const meta = PATTERN_CAPTIONS[variant];
            const isActive = variant === pattern;

            return (
              <div
                key={variant}
                className={clsx(
                  'overflow-hidden rounded-xl border bg-[color:var(--surface-elevated)] transition-colors',
                  isActive ? 'border-[color:var(--accent)]' : 'border-[color:var(--border)]',
                )}
              >
                <PatternStage pattern={variant} className="h-32 rounded-xl" />
                <div className="flex items-baseline justify-between gap-2 px-3 py-2.5">
                  <div>
                    <h4 className="font-grotesk text-[15px] leading-none font-semibold tracking-[-0.01em] text-[color:var(--text-strong)]">
                      {meta.label}
                    </h4>
                    <code className="mt-0.5 block font-mono-ui text-[9.5px] tracking-[0.06em] text-[color:var(--text-muted)]">
                      {variant}
                    </code>
                  </div>
                  {isActive && (
                    <span className="font-mono-ui text-[8.5px] font-semibold tracking-[0.22em] text-[color:var(--accent-text)] uppercase">
                      active
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      <Section
        id="across"
        index="§ 03"
        title="Across themes"
        description="The active pattern rendered against every theme. Useful for verifying grid contrast end-to-end."
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {THEME_LIST.map((theme) => (
            <ThemedSurface key={theme.id} themeId={theme.id} className="overflow-hidden">
              <PatternStage pattern={pattern} className="h-32 rounded-xl" />
              <div className="flex items-baseline justify-between gap-2 px-3 py-2.5">
                <span className="font-grotesk text-[15px] leading-none font-semibold tracking-[-0.01em] text-[color:var(--text-strong)]">
                  {theme.name}
                </span>
                <span className="font-mono-ui text-[8.5px] tracking-[0.22em] text-[color:var(--text-subtle)] uppercase">
                  {theme.mode}
                </span>
              </div>
            </ThemedSurface>
          ))}
        </div>
      </Section>

      <Section
        id="radius"
        index="§ 04"
        title="Radius"
        description="Most surfaces sit on lg / xl. full is for circular elements."
      >
        <Table columns={RADIUS_TABLE_COLUMNS}>
          {RADIUS_SCALE.map((radius) => (
            <TableRow key={radius.label}>
              <Cell>
                <div
                  className={clsx(
                    'h-10 w-16 border border-[color:var(--border-strong)] bg-[color:var(--accent-soft)]',
                    radius.className,
                  )}
                />
              </Cell>
              <Cell>
                <span className="font-grotesk text-[15px] leading-none font-semibold tracking-[-0.01em] text-[color:var(--text-strong)]">
                  {radius.label}
                </span>
              </Cell>
              <Cell>
                <Copyable value={radius.className} />
              </Cell>
              <Cell>
                <span className="font-mono-ui text-[10.5px] tracking-[0.06em] text-[color:var(--text-muted)]">
                  {radius.pixels}
                </span>
              </Cell>
              <Cell>
                <span className="line-clamp-2 text-[11.5px] leading-snug text-[color:var(--text-muted)]">
                  {radius.usage}
                </span>
              </Cell>
            </TableRow>
          ))}
        </Table>
      </Section>

      <Section id="shadow" index="§ 05" title="Shadow" description="Three depth layers, theme-bound.">
        <Table columns={SHADOW_TABLE_COLUMNS}>
          {SHADOW_TOKENS.map((shadow) => (
            <TableRow key={shadow.variable}>
              <Cell>
                <div
                  className="h-10 w-16 rounded-lg bg-[color:var(--surface)] ring-1 ring-[color:var(--border-strong)]"
                  style={{ boxShadow: `var(${shadow.variable})` }}
                />
              </Cell>
              <Cell>
                <span className="font-grotesk text-[14px] leading-none font-semibold tracking-[-0.01em] text-[color:var(--text-strong)]">
                  {shadow.label}
                </span>
              </Cell>
              <Cell>
                <Copyable value={shadow.variable} />
              </Cell>
              <Cell>
                <span className="line-clamp-2 text-[11.5px] leading-snug text-[color:var(--text-muted)]">
                  {shadow.usage}
                </span>
              </Cell>
            </TableRow>
          ))}
        </Table>
      </Section>

      <Section id="spacing" index="§ 06" title="Spacing" description="Tailwind 4 default scale, annotated with usage.">
        <Table columns={SPACING_TABLE_COLUMNS}>
          {SPACING_TOKENS.map((space) => (
            <TableRow key={space.label}>
              <Cell>
                <span className="font-grotesk text-[16px] leading-none font-semibold tracking-[-0.01em] text-[color:var(--text-strong)]">
                  {space.label}
                </span>
              </Cell>
              <Cell>
                <Copyable value={space.className} />
              </Cell>
              <Cell>
                <span className="font-mono-ui text-[10.5px] tracking-[0.06em] text-[color:var(--text-muted)]">
                  {space.rem}
                </span>
              </Cell>
              <Cell>
                <span className="font-mono-ui text-[10.5px] tracking-[0.06em] text-[color:var(--text-subtle)]">
                  {space.pixels}
                </span>
              </Cell>
              <Cell>
                <span className="block bg-[color:var(--accent)]/65" style={{ width: space.pixels, height: '8px' }} />
              </Cell>
              <Cell>
                <span className="line-clamp-2 text-[11.5px] leading-snug text-[color:var(--text-muted)]">
                  {space.usage}
                </span>
              </Cell>
            </TableRow>
          ))}
        </Table>
      </Section>
    </AtlasFrame>
  );
};
