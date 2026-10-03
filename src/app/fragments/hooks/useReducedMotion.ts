'use client';

import { REDUCED_MOTION_QUERY } from '@constants';

import { useMediaQuery } from './useMediaQuery';

export const useReducedMotion = (): boolean => useMediaQuery(REDUCED_MOTION_QUERY);
