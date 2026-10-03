import type { IRect } from '@interfaces';

export const EXPORT_RECTS: IRect[] = [
  { x: -500, y: -200, width: 260, height: 80 },
  { x: 1800, y: 900, width: 380, height: 400 },
  { x: -560, y: -230, width: 1400, height: 1000 },
];

export const UNICODE_THREAD_NAME = '  Рішення: café / équipe?  ';
export const LONG_THREAD_NAME = 'Д'.repeat(200);
export const BIDI_THREAD_NAME = `Report${String.fromCodePoint(0x20_2e)}gvs.fdp${String.fromCodePoint(0x06_1c, 0x20_0e, 0x20_0f, 0x20_2a, 0x20_66, 0x20_69)}`;
export const BIDI_SAFE_FILENAME = 'Reportgvs.fdp.svg';

export const NESTED_CSS_LIST = 'color-mix(in srgb, rgb(220, 38, 38) 12%, transparent), rgba(0, 0, 0, 0.5) , 4px';

export const LAYERED_BOX_SHADOW =
  'rgba(13, 19, 16, 0.06) 0px 1px 2px 0px, rgba(13, 19, 16, 0.1) 0px 8px 24px -6px, rgba(0, 0, 0, 0.1) 0px 0px 0px 1px inset';

export const ALARM_WASH_GRADIENT =
  'linear-gradient(color-mix(in srgb, rgb(220, 38, 38) 12%, transparent), color-mix(in srgb, rgb(220, 38, 38) 12%, transparent))';

export const TWO_TONE_GRADIENT = 'linear-gradient(rgb(255, 255, 255), rgb(0, 0, 0))';

export const SRGB_WASH_COLOR = 'color(srgb 0.862745 0.14902 0.14902 / 0.07)';

export const OKLCH_COLOR = 'oklch(0.6 0.2 30)';

export const LATIN_UNICODE_RANGE = 'U+0000-00FF, U+0131, U+2000-206F, U+4??';
