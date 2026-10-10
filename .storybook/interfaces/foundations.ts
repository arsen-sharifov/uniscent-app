import type { TTheme } from '@interfaces';

export type TStatusTone = 'success' | 'warning' | 'error';

export interface IColorGroup {
  id: string;
  title: string;
  description: string;
  tokens: IColorToken[];
}

export interface IColorToken {
  variable: string;
  label: string;
  role: string;
}

export interface IRadiusToken {
  label: string;
  className: string;
  pixels: string;
  usage: string;
}

export interface IShadowToken {
  variable: string;
  label: string;
  usage: string;
}

export interface ISpacingToken {
  label: string;
  className: string;
  rem: string;
  pixels: string;
  usage: string;
}

export interface IThemeMeta {
  id: TTheme;
  name: string;
  caption: string;
  mode: 'light' | 'dark' | 'adaptive';
}

export interface ITypeRow {
  token: string;
  sample: string;
  family: 'grotesk' | 'mono' | 'base';
  classes: string;
  size: string;
  leading: string;
  tracking: string;
  weight: string;
  usage: string;
  uppercase?: boolean;
}
