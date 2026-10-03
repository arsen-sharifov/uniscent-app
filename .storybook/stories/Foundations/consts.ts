import type { TCanvasPattern } from '@interfaces';
import type { IColorGroup, IRadiusToken, IShadowToken, ISpacingToken, IThemeMeta, ITypeRow } from '@story-interfaces';

export const THEME_LIST: readonly IThemeMeta[] = [
  { id: 'daybreak', name: 'Daybreak', caption: 'Mist ground, white surfaces, lime action', mode: 'light' },
  { id: 'eclipse', name: 'Eclipse', caption: 'Ink ground, lime action, pale verdicts', mode: 'dark' },
  { id: 'graphite', name: 'Paper', caption: 'True neutral white, ink action', mode: 'light' },
  { id: 'solstice', name: 'Carbon', caption: 'True black, white action', mode: 'dark' },
  { id: 'aurora', name: 'Ember', caption: 'Warm coal, teal action', mode: 'dark' },
  { id: 'tide', name: 'Tide', caption: 'Cool blue-grey, sky action', mode: 'light' },
  { id: 'orchid', name: 'Orchid', caption: 'Deep plum, chartreuse action', mode: 'dark' },
  { id: 'bloom', name: 'Bloom', caption: 'Warm porcelain, magenta action', mode: 'light' },
  { id: 'auto', name: 'Auto', caption: 'Daybreak on light, Eclipse on dark', mode: 'adaptive' },
];

export const COLOR_GROUPS: readonly IColorGroup[] = [
  {
    id: 'surface',
    title: 'Surface',
    description: 'The matter of the workspace — backdrops, cards, overlays.',
    tokens: [
      { variable: '--app-bg', label: 'App background', role: 'Root canvas tone' },
      { variable: '--app-bg-tint', label: 'App tint', role: 'Side panels, sidebar wash' },
      { variable: '--app-bg-grid', label: 'Grid stroke', role: 'Canvas pattern color' },
      { variable: '--surface', label: 'Surface', role: 'Modals, dialogs' },
      { variable: '--surface-soft', label: 'Surface soft', role: 'Quiet sections' },
      { variable: '--surface-elevated', label: 'Surface elevated', role: 'Cards, popovers' },
      { variable: '--surface-overlay', label: 'Surface overlay', role: 'Hover, pressed states' },
      { variable: '--surface-glass', label: 'Surface glass', role: 'Translucent fill for blurred panels and rails' },
    ],
  },
  {
    id: 'text',
    title: 'Text',
    description: 'A descending scale from titling weight to whisper.',
    tokens: [
      { variable: '--text-strong', label: 'Strong', role: 'Headings, primary metrics' },
      { variable: '--text', label: 'Body', role: 'Paragraphs, default copy' },
      { variable: '--text-muted', label: 'Muted', role: 'Secondary, captions' },
      { variable: '--text-subtle', label: 'Subtle', role: 'Section labels, eyebrows' },
      { variable: '--text-faint', label: 'Faint', role: 'Decorative, dividers' },
      { variable: '--text-label', label: 'Label', role: 'Mono micro-labels at the contrast floor' },
    ],
  },
  {
    id: 'border',
    title: 'Borders & Rings',
    description: 'Edges that breathe — thin contours that scale with theme.',
    tokens: [
      { variable: '--border', label: 'Border', role: 'Default panel edge' },
      { variable: '--border-strong', label: 'Border strong', role: 'Hover, focused' },
      { variable: '--border-active', label: 'Border active', role: 'Selected card frame' },
      { variable: '--ring-focus', label: 'Ring focus', role: 'Keyboard focus ring' },
    ],
  },
  {
    id: 'accent',
    title: 'Accent',
    description: 'The single action color, theme-bound.',
    tokens: [
      { variable: '--accent', label: 'Accent', role: 'The only action fill — buttons, selection strips' },
      { variable: '--accent-strong', label: 'Accent strong', role: 'Hover, depth' },
      { variable: '--accent-text', label: 'Accent text', role: 'Accent-colored text on soft fields' },
      { variable: '--accent-soft', label: 'Accent soft', role: 'Tinted backgrounds, selected rows' },
      { variable: '--accent-glow', label: 'Accent glow', role: 'Halos, focus shadows' },
      { variable: '--accent-2', label: 'Accent 2', role: 'Companion tone for theme swatches, not an action color' },
      { variable: '--on-accent', label: 'On accent', role: 'Foreground on accent fill' },
    ],
  },
  {
    id: 'status',
    title: 'Status',
    description: 'Feedback semantics — success, warning, error.',
    tokens: [
      { variable: '--status-success', label: 'Success', role: 'Positive emphasis' },
      { variable: '--status-success-bg', label: 'Success bg', role: 'Toast / pill background' },
      { variable: '--status-success-border', label: 'Success border', role: 'Edge of success surface' },
      { variable: '--status-success-soft', label: 'Success soft', role: 'Hover/active' },
      { variable: '--status-warning', label: 'Warning', role: 'Cautionary copy' },
      { variable: '--status-warning-bg', label: 'Warning bg', role: 'Toast background' },
      { variable: '--status-warning-border', label: 'Warning border', role: 'Edge' },
      { variable: '--status-warning-soft', label: 'Warning soft', role: 'Hover/active' },
      { variable: '--status-error', label: 'Error', role: 'Destructive copy' },
      { variable: '--status-error-bg', label: 'Error bg', role: 'Toast background' },
      { variable: '--status-error-border', label: 'Error border', role: 'Edge' },
      { variable: '--status-error-soft', label: 'Error soft', role: 'Hover/active' },
    ],
  },
  {
    id: 'reference',
    title: 'Reference',
    description: 'Cross-canvas reference link semantics.',
    tokens: [
      { variable: '--ref', label: 'Reference', role: 'Link color, ref node body' },
      { variable: '--ref-bg', label: 'Reference bg', role: 'Pill background' },
      { variable: '--ref-border', label: 'Reference border', role: 'Edge' },
      { variable: '--ref-soft', label: 'Reference soft', role: 'Hover/active' },
    ],
  },
];

export const TYPE_SCALE: readonly ITypeRow[] = [
  {
    token: 'display/grotesk',
    sample: 'Structured reasoning',
    family: 'grotesk',
    classes: 'font-grotesk text-[24px] leading-none font-semibold tracking-tight',
    size: '24px',
    leading: '1',
    tracking: '-0.025em',
    weight: '600',
    usage: 'Largest in-app display step — the plan price in Settings.',
  },
  {
    token: 'h1/grotesk',
    sample: 'Workspace settings',
    family: 'grotesk',
    classes: 'font-grotesk text-lg font-semibold',
    size: '18px',
    leading: '1.55',
    tracking: '0',
    weight: '600',
    usage: 'Settings pane titles, ConfirmDialog heading.',
  },
  {
    token: 'h2/grotesk',
    sample: 'Appearance',
    family: 'grotesk',
    classes: 'font-grotesk text-[16px] leading-none font-semibold tracking-tight',
    size: '16px',
    leading: '1',
    tracking: '-0.025em',
    weight: '600',
    usage: 'Card titles — plan, behaviour, security, theme picker.',
  },
  {
    token: 'node/grotesk',
    sample: 'Every claim needs a source',
    family: 'grotesk',
    classes: 'font-grotesk text-[13.5px] leading-snug font-medium tracking-tight',
    size: '13.5px',
    leading: '1.375',
    tracking: '-0.025em',
    weight: '500',
    usage: 'Canvas node labels, in view and while editing.',
  },
  {
    token: 'body/grotesk',
    sample: 'Open a canvas. Draw a question. Connect arguments. Mark valid paths.',
    family: 'grotesk',
    classes: 'font-grotesk text-[13px] leading-5',
    size: '13px',
    leading: '20px',
    tracking: '0',
    weight: '400',
    usage: 'Human copy — toast bodies, comment text.',
  },
  {
    token: 'blurb/base',
    sample: 'Pick the surface your ideas live on. From quiet paper to a charted grid.',
    family: 'base',
    classes: 'text-[12.5px] leading-relaxed',
    size: '12.5px',
    leading: '1.625',
    tracking: '0',
    weight: '400',
    usage: 'Section blurbs — sized only, family inherited from the page.',
  },
  {
    token: 'label/mono',
    sample: 'Appearance',
    family: 'mono',
    classes: 'font-mono-ui text-[10px] font-bold tracking-[0.14em] uppercase',
    size: '10px',
    leading: 'inherit',
    tracking: '0.14em',
    weight: '700',
    usage: 'Settings section labels — pairs with --text-label.',
    uppercase: true,
  },
  {
    token: 'status/mono',
    sample: 'VALID',
    family: 'mono',
    classes: 'font-mono-ui text-[9px] font-bold tracking-[0.16em] uppercase',
    size: '9px',
    leading: 'inherit',
    tracking: '0.16em',
    weight: '700',
    usage: 'Node band status words beside the 3px tone strip.',
    uppercase: true,
  },
  {
    token: 'meta/mono',
    sample: 'workspace / thread',
    family: 'mono',
    classes: 'font-mono-ui text-[10.5px] tracking-[0.04em]',
    size: '10.5px',
    leading: 'inherit',
    tracking: '0.04em',
    weight: '400',
    usage: 'Reference breadcrumbs, save status, thread header meta.',
  },
  {
    token: 'shortcut/mono',
    sample: 'Esc',
    family: 'mono',
    classes: 'font-mono-ui text-[9px] tracking-[0.08em]',
    size: '9px',
    leading: 'inherit',
    tracking: '0.08em',
    weight: '400',
    usage: 'Context-menu shortcut hints, kbd chips.',
  },
  {
    token: 'badge/mono',
    sample: '12',
    family: 'mono',
    classes: 'font-mono-ui text-[10px] font-bold',
    size: '10px',
    leading: 'inherit',
    tracking: '0',
    weight: '700',
    usage: 'Count pills on accent fill, comment counters.',
  },
  {
    token: 'micro/mono',
    sample: 'DEFAULT',
    family: 'mono',
    classes: 'font-mono-ui text-[8.5px] leading-none font-semibold tracking-[0.22em] uppercase',
    size: '8.5px',
    leading: '1',
    tracking: '0.22em',
    weight: '600',
    usage: 'Smallest system mark — the "default" flag on theme cards.',
    uppercase: true,
  },
];

export const RADIUS_SCALE: readonly IRadiusToken[] = [
  { label: 'sm', className: 'rounded-md', pixels: '6px', usage: 'Pills, inline chips' },
  { label: 'base', className: 'rounded-lg', pixels: '8px', usage: 'Buttons, code blocks' },
  { label: 'lg', className: 'rounded-xl', pixels: '12px', usage: 'Cards' },
  { label: 'xl', className: 'rounded-2xl', pixels: '16px', usage: 'Modals, theme cards' },
  { label: 'full', className: 'rounded-full', pixels: '∞', usage: 'Avatars, pip badges' },
];

export const SHADOW_TOKENS: readonly IShadowToken[] = [
  { variable: '--shadow-modal', label: 'Modal', usage: 'Floating dialogs, settings modal' },
  { variable: '--shadow-card-hover', label: 'Card hover', usage: 'Theme/pattern card lift on hover' },
  { variable: '--shadow-pip', label: 'Pip', usage: 'Tiny floating chips, language code' },
];

export const SPACING_TOKENS: readonly ISpacingToken[] = [
  { label: '0.5', className: 'p-0.5', rem: '0.125rem', pixels: '2px', usage: 'Hairline insets' },
  { label: '1', className: 'p-1', rem: '0.25rem', pixels: '4px', usage: 'Tight icon padding' },
  { label: '2', className: 'p-2', rem: '0.5rem', pixels: '8px', usage: 'Compact controls' },
  { label: '3', className: 'p-3', rem: '0.75rem', pixels: '12px', usage: 'Buttons, list rows' },
  { label: '4', className: 'p-4', rem: '1rem', pixels: '16px', usage: 'Cards' },
  { label: '6', className: 'p-6', rem: '1.5rem', pixels: '24px', usage: 'Card panels' },
  { label: '8', className: 'p-8', rem: '2rem', pixels: '32px', usage: 'Section padding' },
  { label: '10', className: 'p-10', rem: '2.5rem', pixels: '40px', usage: 'Modal body padding' },
];

export const PATTERN_CAPTIONS: Record<TCanvasPattern, { label: string; description: string }> = {
  dots: { label: 'Dots', description: 'Soft pips, quiet horizon — the workspace default.' },
  lines: { label: 'Lines', description: 'Engineer’s graph paper — precise, gridded thinking.' },
  cross: { label: 'Cross', description: 'Surveyor’s crosshatch — feels like a map.' },
  none: { label: 'Void', description: 'Pure surface, unburdened by texture.' },
};

export const CONTRAST_PAIRS: { label: string; caption: string; bgVar: string; fgVar: string }[] = [
  { label: 'Atlas', caption: 'accent-text · app-bg', bgVar: '--app-bg', fgVar: '--accent-text' },
  { label: 'Headline', caption: 'strong · app-bg', bgVar: '--app-bg', fgVar: '--text-strong' },
  { label: 'Caption', caption: 'muted · surface', bgVar: '--surface-elevated', fgVar: '--text-muted' },
  { label: 'Alert', caption: 'error · error-bg', bgVar: '--status-error-bg', fgVar: '--status-error' },
  { label: 'CTA', caption: 'on-accent · accent', bgVar: '--accent', fgVar: '--on-accent' },
];

export const FAMILY_BADGE: Record<'grotesk' | 'mono' | 'base', string> = {
  grotesk: 'bg-[color:var(--accent-soft)] text-[color:var(--accent-text)] ring-[color:var(--accent)]/30',
  mono: 'bg-[color:var(--ref-bg)] text-[color:var(--ref)] ring-[color:var(--ref-border)]',
  base: 'bg-[color:var(--surface-overlay)] text-[color:var(--text-muted)] ring-[color:var(--border-strong)]',
};

export const THEMES_SECTIONS = [
  { id: 'specimen', label: 'Specimen' },
  { id: 'tokens', label: 'Tokens' },
  { id: 'contrast', label: 'Contrast' },
  { id: 'application', label: 'Application' },
];

export const PATTERNS_SECTIONS = [
  { id: 'stage', label: 'Stage' },
  { id: 'variants', label: 'Variants' },
  { id: 'across', label: 'Across themes' },
  { id: 'radius', label: 'Radius' },
  { id: 'shadow', label: 'Shadow' },
  { id: 'spacing', label: 'Spacing' },
];

export const TYPOGRAPHY_SECTIONS = [
  { id: 'voices', label: 'Voices' },
  { id: 'scale', label: 'Scale' },
  { id: 'composition', label: 'Composition' },
  { id: 'decoration', label: 'Decoration' },
];

export const TYPOGRAPHY_TABLE_COLUMNS = [
  { id: 'token', label: 'Token', width: '180px' },
  { id: 'sample', label: 'Sample', width: 'minmax(0, 1.4fr)' },
  { id: 'specs', label: 'Specs', width: '170px' },
  { id: 'classes', label: 'Classes', width: 'minmax(0, 1fr)' },
  { id: 'usage', label: 'Usage', width: 'minmax(0, 1.3fr)' },
];

export const RADIUS_TABLE_COLUMNS = [
  { id: 'preview', label: 'Preview', width: '110px' },
  { id: 'token', label: 'Token', width: '110px' },
  { id: 'class', label: 'Class', width: '170px' },
  { id: 'value', label: 'Value', width: '90px' },
  { id: 'usage', label: 'Usage', width: 'minmax(0, 1fr)' },
];

export const SHADOW_TABLE_COLUMNS = [
  { id: 'preview', label: 'Preview', width: '110px' },
  { id: 'label', label: 'Label', width: '140px' },
  { id: 'var', label: 'Variable', width: '220px' },
  { id: 'usage', label: 'Usage', width: 'minmax(0, 1fr)' },
];

export const SPACING_TABLE_COLUMNS = [
  { id: 'step', label: 'Step', width: '70px' },
  { id: 'class', label: 'Class', width: '120px' },
  { id: 'rem', label: 'rem', width: '80px' },
  { id: 'px', label: 'px', width: '60px' },
  { id: 'bar', label: 'Bar', width: '140px' },
  { id: 'usage', label: 'Usage', width: 'minmax(0, 1fr)' },
];
