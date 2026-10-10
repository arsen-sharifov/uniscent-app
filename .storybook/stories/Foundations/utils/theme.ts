import type { TTheme } from '@interfaces';
import type { IThemeMeta } from '@story-interfaces';

import { THEME_LIST } from '../consts';

export const findThemeAncestor = (node: HTMLElement | null): HTMLElement | null =>
  node?.closest<HTMLElement>('[data-theme]') ?? null;

export const findActiveTheme = (themeId: TTheme): IThemeMeta =>
  THEME_LIST.find((theme) => theme.id === themeId) ?? THEME_LIST[0]!;

export const orderedSpecimens = (active: TTheme): { hero: IThemeMeta; rest: IThemeMeta[] } => ({
  hero: findActiveTheme(active),
  rest: THEME_LIST.filter((theme) => theme.id !== active),
});
