import type { TGuideId } from '@interfaces';
import { GUIDE_IDS } from '@constants';

export const isGuideId = (value: unknown): value is TGuideId =>
  typeof value === 'string' && GUIDE_IDS.includes(value as TGuideId);
