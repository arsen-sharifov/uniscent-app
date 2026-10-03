import type { TTheme } from '@interfaces';
import type { ILogoSize } from '@story-interfaces';

export const SIZES: readonly ILogoSize[] = [
  { label: 'xs', className: 'text-xs' },
  { label: 'sm', className: 'text-sm' },
  { label: 'base', className: 'text-base' },
  { label: 'xl', className: 'text-xl' },
  { label: '2xl', className: 'text-2xl' },
  { label: '4xl', className: 'text-4xl' },
  { label: '6xl', className: 'text-6xl' },
];

export const THEMES: readonly TTheme[] = [
  'daybreak',
  'eclipse',
  'graphite',
  'solstice',
  'aurora',
  'tide',
  'orchid',
  'bloom',
  'auto',
];
