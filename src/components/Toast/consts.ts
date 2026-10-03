import { CircleAlert, CircleCheck, Info, TriangleAlert } from 'lucide-react';

import type { IToastVisual, TToastType } from '@interfaces';

export const TOAST_VISUAL_BY_TYPE: Record<TToastType, IToastVisual> = {
  success: {
    icon: CircleCheck,
    iconClassName: 'text-[color:var(--status-success)]',
    spineClassName: 'bg-[color:var(--status-success)]',
  },
  info: {
    icon: Info,
    iconClassName: 'text-[color:var(--status-info)]',
    spineClassName: 'bg-[color:var(--status-info)]',
  },
  warning: {
    icon: TriangleAlert,
    iconClassName: 'text-[color:var(--status-warning)]',
    spineClassName: 'bg-[color:var(--status-warning)]',
  },
  error: {
    icon: CircleAlert,
    iconClassName: 'text-[color:var(--status-error)]',
    spineClassName: 'bg-[color:var(--status-error)]',
  },
};
