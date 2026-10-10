'use client';

import { create } from 'zustand';

import type { TToast, TToastDraft } from '@interfaces';

import { MAX_VISIBLE_TOASTS } from '../consts';

interface IToastStore {
  toasts: TToast[];
  add: (toast: TToastDraft) => string;
  dismiss: (id: string) => void;
  clear: () => void;
}

export const useToastStore = create<IToastStore>((set) => ({
  toasts: [],
  add: (toast) => {
    const id = crypto.randomUUID();

    set((state) => ({ toasts: [...state.toasts, { ...toast, id }].slice(-MAX_VISIBLE_TOASTS) }));

    return id;
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
  clear: () => set({ toasts: [] }),
}));
