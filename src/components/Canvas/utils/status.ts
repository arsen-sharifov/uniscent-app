import type { CSSProperties } from 'react';

import type { TNodeBandTone } from '@interfaces';

import { NODE_ALARM_WASHES } from '../consts';

export const resolveNodeWashStyle = (
  tone: TNodeBandTone | undefined,
  isEditing: boolean,
): CSSProperties | undefined => {
  const wash = tone && !isEditing ? NODE_ALARM_WASHES[tone] : undefined;

  return wash ? { backgroundImage: `linear-gradient(${wash}, ${wash})` } : undefined;
};
