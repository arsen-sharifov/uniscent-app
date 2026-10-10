import type { IMockPermissionsState } from '@story-interfaces';
import { usePermissionsStore } from '@/lib/stores';

import { STORYBOOK_AUTHOR_ID } from '../consts';

const FULL_ACCESS: Required<IMockPermissionsState> = {
  userId: STORYBOOK_AUTHOR_ID,
  workspaceId: 'sb-workspace',
  resolved: true,
  isOwner: true,
  canEditCanvas: true,
  canComment: true,
  canManageStructure: true,
  canManageMembers: true,
  canManageRoles: true,
  canManageWorkspace: true,
};

export const mockPermissionsStore = (overrides: IMockPermissionsState = {}): void => {
  usePermissionsStore.setState({ ...FULL_ACCESS, ...overrides });
};
