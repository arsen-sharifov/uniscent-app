import type { LucideIcon } from 'lucide-react';

import type { TErrorCategory } from '@interfaces';

export type TToastType = 'success' | 'info' | 'warning' | 'error';

interface IToastBase {
  title?: string;
  duration: number;
}

interface IMessageToast extends IToastBase {
  type: TToastType;
  message: string;
}

interface IErrorToast extends IToastBase {
  errorCategory: TErrorCategory;
}

export type TToastDraft = IMessageToast | IErrorToast;

export type TToast = TToastDraft & { id: string };

export interface IToastVisual {
  icon: LucideIcon;
  iconClassName: string;
  spineClassName: string;
}

export interface IToastOptions {
  title?: string;
  duration?: number;
}
