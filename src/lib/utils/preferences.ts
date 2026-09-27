import type { TDefaultZoom } from '@interfaces';
import { DEFAULT_ZOOM_VALUES } from '@constants';

export const isDefaultZoom = (value: unknown): value is TDefaultZoom =>
  typeof value === 'number' && DEFAULT_ZOOM_VALUES.includes(value as TDefaultZoom);
