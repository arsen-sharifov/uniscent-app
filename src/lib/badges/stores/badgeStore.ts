'use client';

import { create } from 'zustand';

import type { IBadgeAward, TBadgeId } from '@interfaces';

interface IBadgeState {
  earned: readonly TBadgeId[] | null;
  lastAward: IBadgeAward | null;
}

interface IBadgeStore extends IBadgeState {
  hydrate: (earned: readonly TBadgeId[]) => void;
  earn: (award: IBadgeAward) => void;
  forget: () => void;
}

export const useBadgeStore = create<IBadgeStore>((set) => ({
  earned: null,
  lastAward: null,
  hydrate: (earned) => set({ earned }),
  earn: (award) => set((state) => ({ earned: [...(state.earned ?? []), award.id], lastAward: award })),
  forget: () => set({ earned: null, lastAward: null }),
}));
