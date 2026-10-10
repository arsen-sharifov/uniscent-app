'use client';

import { create } from 'zustand';

import type { IWorkspaceAccess } from '@interfaces';

interface IPermissionsState {
  userId: string | null;
  workspaceId: string | null;
  resolved: boolean;
  isOwner: boolean;
  canEditCanvas: boolean;
  canComment: boolean;
  canManageStructure: boolean;
  canManageMembers: boolean;
  canManageRoles: boolean;
  canManageWorkspace: boolean;
}

interface IPermissionsStore extends IPermissionsState {
  setAccess: (workspaceId: string, userId: string | null, access: IWorkspaceAccess | null) => void;
  clearAccess: (pendingWorkspaceId?: string | null) => void;
}

const NO_ACCESS = {
  isOwner: false,
  canEditCanvas: false,
  canComment: false,
  canManageStructure: false,
  canManageMembers: false,
  canManageRoles: false,
  canManageWorkspace: false,
} as const;

const INITIAL_STATE: IPermissionsState = {
  userId: null,
  workspaceId: null,
  resolved: false,
  ...NO_ACCESS,
};

export const usePermissionsStore = create<IPermissionsStore>((set) => ({
  ...INITIAL_STATE,

  setAccess: (workspaceId, userId, access) => set({ workspaceId, userId, resolved: true, ...(access ?? NO_ACCESS) }),
  clearAccess: (pendingWorkspaceId = null) => set({ ...INITIAL_STATE, workspaceId: pendingWorkspaceId }),
}));
