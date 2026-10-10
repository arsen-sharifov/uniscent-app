import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi, type Mock } from 'vitest';

import type { IFolder, IThread, IWorkspaceItem, TNavItem } from '@interfaces';
import {
  acceptWorkspaceInvitation,
  createFolder,
  createThread,
  createWorkspace,
  declineWorkspaceInvitation,
  deleteFolder,
  deleteFolders,
  deleteThread,
  deleteThreads,
  deleteWorkspace,
  deleteWorkspaces,
  getFolders,
  getMyInvitations,
  getMyWorkspacePermissions,
  getMyWorkspaces,
  getThreads,
  getUser,
  moveFolder,
  moveThread,
  moveWorkspace,
  updateFolderName,
  updateThreadName,
  updateWorkspaceName,
} from '@api/client';
import { awardBadge } from '@mocks/badges';
import { canvasEdge, canvasNode } from '@mocks/canvas';
import { TRANSLATIONS } from '@mocks/i18n';
import { routeParams, router } from '@mocks/navigation';
import { EDIT_ACCESS, FULL_ACCESS } from '@mocks/roles';
import { folderInput, folderItem, myInvitation, threadInput, threadItem, workspaceItem } from '@mocks/sidebar';
import { primeSupabase } from '@mocks/supabase';
import { useWorkspaceManager } from '@/app/platform/hooks';
import { event } from '@/lib/events';
import { useCanvasStore, usePermissionsStore } from '@/lib/stores';

vi.mock('next/navigation', () => import('@mocks/navigation'));
vi.mock('@api/client', async () => ({
  ...(await import('@mocks/canvasApi')),
  ...(await import('@mocks/userApi')),
  ...(await import('@mocks/workspaceApi')),
}));
vi.mock('@/i18n', () => import('@mocks/i18n'));
vi.mock('@/lib/badges', () => import('@mocks/badges'));
vi.mock('@/lib/events', () => import('@mocks/events'));
vi.mock('@/lib/supabase', () => import('@mocks/supabase'));

const USER_RESPONSE = { data: { user: { id: 'user-1' } }, error: null } as never;

const workspaceList = (): IWorkspaceItem[] => [
  workspaceItem('ws-1'),
  workspaceItem('ws-2'),
  workspaceItem('ws-3', false),
];

const folderList = () => [folderInput('f1', 1)];

const threadList = () => [threadInput('t1', 0), threadInput('t2', 0, 'f1')];

const INITIAL_TREE: TNavItem[] = [threadItem('t1'), folderItem('f1', [threadItem('t2')])];

const primeApi = (route: { workspaceId?: string; threadId?: string } = {}) => {
  primeSupabase([]);
  vi.mocked(getMyWorkspaces).mockResolvedValue(workspaceList());
  vi.mocked(getUser).mockResolvedValue(USER_RESPONSE);
  vi.mocked(getMyWorkspacePermissions).mockResolvedValue(FULL_ACCESS);
  vi.mocked(getFolders).mockResolvedValue(folderList());
  vi.mocked(getThreads).mockResolvedValue(threadList());
  vi.mocked(getMyInvitations).mockResolvedValue([]);
  Object.assign(routeParams, route);
};

let manager: { current: ReturnType<typeof useWorkspaceManager> };
let rerenderManager: () => void;
let unmountManager: () => void;

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(async () => {
  cleanup();
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
  useCanvasStore.getState().clearCanvas();
  usePermissionsStore.getState().clearAccess();
  delete routeParams.workspaceId;
  delete routeParams.threadId;
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('useWorkspaceManager', () => {
  describe('GIVEN workspaces with a nested tree and a pending invitation behind the api', () => {
    beforeEach(() => {
      primeApi();
      vi.mocked(getMyInvitations).mockResolvedValue([myInvitation('inv-1', 'ws-9')]);

      const view = renderHook(() => useWorkspaceManager());

      manager = view.result;
      rerenderManager = view.rerender;
    });

    describe('WHEN the initial load is still in flight', () => {
      test('THEN the manager reports loading with empty state', () => {
        expect(manager.current.loading).toBe(true);
        expect(manager.current.workspaces).toEqual([]);
        expect(manager.current.navItems).toEqual([]);
        expect(manager.current.invitations).toEqual([]);
      });
    });

    describe('WHEN the initial load settles', () => {
      beforeEach(async () => {
        await act(async () => {
          await vi.advanceTimersByTimeAsync(0);
        });
      });

      test('THEN the first workspace becomes active with its nav tree', () => {
        expect(manager.current.workspaces).toEqual(workspaceList());
        expect(manager.current.activeWorkspaceId).toBe('ws-1');
        expect(manager.current.navItems).toEqual(INITIAL_TREE);
      });

      test('THEN the content api is scoped to the active workspace', () => {
        expect(getFolders).toHaveBeenCalledExactlyOnceWith('ws-1');
        expect(getThreads).toHaveBeenCalledExactlyOnceWith('ws-1');
      });

      test('THEN the router is redirected to the first thread', () => {
        expect(router.replace).toHaveBeenCalledExactlyOnceWith('/platform/ws-1/t1');
      });

      test('THEN it keeps loading until that thread opens, so the empty state never flashes', () => {
        expect(manager.current.loading).toBe(true);
      });

      test('THEN the pending invitations are exposed', () => {
        expect(manager.current.invitations).toEqual([myInvitation('inv-1', 'ws-9')]);
      });

      test('THEN the permissions store carries the fetched access', () => {
        expect(getMyWorkspacePermissions).toHaveBeenCalledExactlyOnceWith('ws-1');
        expect(usePermissionsStore.getState()).toMatchObject({
          workspaceId: 'ws-1',
          userId: 'user-1',
          canManageStructure: true,
        });
      });
    });

    describe('WHEN the redirect to the first thread lands', () => {
      beforeEach(async () => {
        await act(async () => {
          await vi.advanceTimersByTimeAsync(0);
        });
        Object.assign(routeParams, { workspaceId: 'ws-1', threadId: 't1' });
        act(() => rerenderManager());
      });

      test('THEN loading ends with the thread open', () => {
        expect(manager.current.loading).toBe(false);
        expect(manager.current.activeThreadId).toBe('t1');
      });
    });
  });

  describe('GIVEN a route that already points at a workspace and a thread', () => {
    beforeEach(async () => {
      primeApi({ workspaceId: 'ws-2', threadId: 't1' });

      manager = renderHook(() => useWorkspaceManager()).result;
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
    });

    describe('WHEN the initial load settles', () => {
      test('THEN the routed workspace becomes active', () => {
        expect(manager.current.activeWorkspaceId).toBe('ws-2');
        expect(manager.current.activeThreadId).toBe('t1');
        expect(getFolders).toHaveBeenCalledExactlyOnceWith('ws-2');
      });

      test('THEN no redirect happens', () => {
        expect(router.replace).not.toHaveBeenCalled();
        expect(router.push).not.toHaveBeenCalled();
      });
    });
  });

  describe('GIVEN another workspace picked after the routed one, with its route landed', () => {
    beforeEach(async () => {
      primeApi({ workspaceId: 'ws-1', threadId: 't1' });

      const view = renderHook(() => useWorkspaceManager());

      manager = view.result;
      rerenderManager = view.rerender;
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
      await act(async () => {
        await manager.current.onWorkspaceSelect('ws-2');
        await vi.advanceTimersByTimeAsync(0);
      });
      Object.assign(routeParams, { workspaceId: 'ws-2', threadId: 't1' });
      act(() => rerenderManager());
    });

    describe('WHEN the browser goes back to the route of the first workspace', () => {
      beforeEach(async () => {
        Object.assign(routeParams, { workspaceId: 'ws-1', threadId: 't1' });
        act(() => rerenderManager());
        await act(async () => {
          await vi.advanceTimersByTimeAsync(0);
        });
      });

      test('THEN the routed workspace becomes active again with its own tree and access', () => {
        expect(manager.current.activeWorkspaceId).toBe('ws-1');
        expect(manager.current.loading).toBe(false);
        expect(getFolders).toHaveBeenLastCalledWith('ws-1');
        expect(usePermissionsStore.getState()).toMatchObject({ workspaceId: 'ws-1', resolved: true });
      });

      test('THEN the route is left as it is', () => {
        expect(router.push).toHaveBeenCalledExactlyOnceWith('/platform/ws-2/t1');
        expect(router.replace).not.toHaveBeenCalled();
      });
    });

    describe('WHEN the browser goes back to the first workspace while its tree is still loading', () => {
      beforeEach(async () => {
        vi.mocked(getFolders).mockReturnValueOnce(Promise.withResolvers<IFolder[]>().promise);
        Object.assign(routeParams, { workspaceId: 'ws-1', threadId: 't1' });
        act(() => rerenderManager());
        await act(async () => {
          await vi.advanceTimersByTimeAsync(0);
        });
      });

      test('THEN the routed workspace and its access take over before the tree arrives', () => {
        expect(manager.current.activeWorkspaceId).toBe('ws-1');
        expect(manager.current.loading).toBe(true);
        expect(usePermissionsStore.getState()).toMatchObject({ workspaceId: 'ws-1', resolved: true });
      });
    });

    describe('WHEN the browser goes back to the first workspace while its tree fails to load', () => {
      beforeEach(async () => {
        vi.mocked(getFolders).mockRejectedValueOnce(new Error('db down'));
        Object.assign(routeParams, { workspaceId: 'ws-1', threadId: 't1' });
        act(() => rerenderManager());
        await act(async () => {
          await vi.advanceTimersByTimeAsync(0);
        });
      });

      test('THEN the routed workspace stays active without the tree of the other workspace', () => {
        expect(manager.current.activeWorkspaceId).toBe('ws-1');
        expect(manager.current.navItems).toEqual([]);
        expect(manager.current.loading).toBe(false);
        expect(event.error).toHaveBeenCalledExactlyOnceWith(expect.any(Error), {
          title: TRANSLATIONS.common.errorTitles.loadFailed,
          context: 'sidebar.followRoute',
        });
      });
    });

    describe('WHEN the route moves to a workspace outside the member list', () => {
      beforeEach(async () => {
        Object.assign(routeParams, { workspaceId: 'ws-9', threadId: 't9' });
        act(() => rerenderManager());
        await act(async () => {
          await vi.advanceTimersByTimeAsync(0);
        });
      });

      test('THEN nothing of that workspace is loaded', () => {
        expect(manager.current.activeWorkspaceId).toBe('ws-2');
        expect(getFolders).not.toHaveBeenCalledWith('ws-9');
      });
    });
  });

  describe('GIVEN a routed workspace whose member list is still loading', () => {
    let resolveWorkspaces: (list: IWorkspaceItem[]) => void;

    beforeEach(() => {
      const workspacesLoad = Promise.withResolvers<IWorkspaceItem[]>();

      resolveWorkspaces = workspacesLoad.resolve;
      primeApi({ workspaceId: 'ws-1', threadId: 't1' });
      vi.mocked(getMyWorkspaces).mockReturnValue(workspacesLoad.promise);

      const view = renderHook(() => useWorkspaceManager());

      manager = view.result;
      rerenderManager = view.rerender;
    });

    describe('WHEN the browser moves to the second workspace before the list arrives', () => {
      beforeEach(async () => {
        Object.assign(routeParams, { workspaceId: 'ws-2', threadId: 't5' });
        act(() => rerenderManager());
        await act(async () => {
          resolveWorkspaces(workspaceList());
          await vi.advanceTimersByTimeAsync(0);
        });
      });

      test('THEN the manager follows the route once the list holds that workspace', () => {
        expect(manager.current.activeWorkspaceId).toBe('ws-2');
        expect(manager.current.loading).toBe(false);
        expect(getFolders).toHaveBeenLastCalledWith('ws-2');
        expect(usePermissionsStore.getState()).toMatchObject({ workspaceId: 'ws-2', resolved: true });
      });
    });
  });

  describe('GIVEN workspace permissions that fail to load', () => {
    beforeEach(() => {
      primeApi({ workspaceId: 'ws-1', threadId: 't1' });
      vi.mocked(getMyWorkspacePermissions).mockRejectedValue(new Error('permissions unavailable'));
      manager = renderHook(() => useWorkspaceManager()).result;
    });

    describe('WHEN the permission request fails', () => {
      beforeEach(async () => {
        await act(async () => {
          await vi.advanceTimersByTimeAsync(0);
        });
      });

      test('THEN access resolves without any grant', () => {
        expect(usePermissionsStore.getState()).toMatchObject({
          workspaceId: 'ws-1',
          resolved: true,
          isOwner: false,
          canEditCanvas: false,
          canComment: false,
        });
      });

      test('THEN the load failure reaches the feedback boundary', () => {
        expect(event.error).toHaveBeenCalledExactlyOnceWith(expect.any(Error), {
          title: TRANSLATIONS.common.errorTitles.loadFailed,
          context: 'sidebar.loadPermissions',
        });
      });
    });
  });

  describe('GIVEN a workspace list that fails to load', () => {
    beforeEach(async () => {
      primeApi();
      vi.mocked(getMyWorkspaces).mockRejectedValue(new Error('db down'));

      manager = renderHook(() => useWorkspaceManager()).result;
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
    });

    describe('WHEN the initial load settles', () => {
      test('THEN the failure surfaces and loading ends', () => {
        expect(manager.current.loading).toBe(false);
        expect(manager.current.workspaces).toEqual([]);
        expect(getFolders).not.toHaveBeenCalled();
        expect(event.error).toHaveBeenCalledExactlyOnceWith(expect.any(Error), { context: 'sidebar.loadWorkspaces' });
      });
    });
  });

  describe('GIVEN three loaded workspaces where the member manages the first two', () => {
    beforeEach(async () => {
      primeApi({ workspaceId: 'ws-1', threadId: 't1' });
      vi.mocked(createWorkspace).mockResolvedValue({
        id: 'ws-new',
        name: 'New Workspace',
        ownerId: 'user-1',
        createdAt: '2026-01-01T00:00:00Z',
      });

      manager = renderHook(() => useWorkspaceManager()).result;
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
    });

    describe('WHEN they create a workspace', () => {
      beforeEach(async () => {
        await act(async () => {
          await manager.current.onCreateWorkspace();
          await vi.advanceTimersByTimeAsync(0);
        });
      });

      test('THEN the workspace is appended, activated and put into edit mode', () => {
        expect(manager.current.workspaces).toEqual([
          ...workspaceList(),
          { id: 'ws-new', name: 'New Workspace', canManageWorkspace: true },
        ]);
        expect(manager.current.activeWorkspaceId).toBe('ws-new');
        expect(manager.current.editingWorkspaceId).toBe('ws-new');
        expect(manager.current.navItems).toEqual([]);
      });

      test('THEN the creation reaches the api, the router and the toaster', () => {
        expect(createWorkspace).toHaveBeenCalledExactlyOnceWith(TRANSLATIONS.platform.sidebar.defaultNames.workspace);
        expect(router.push).toHaveBeenCalledExactlyOnceWith('/platform');
        expect(event.success).toHaveBeenCalledExactlyOnceWith(TRANSLATIONS.platform.sidebar.workspaceCreated);
      });

      test('THEN the Builder badge is awarded', () => {
        expect(awardBadge).toHaveBeenCalledExactlyOnceWith('workspaceBuilder');
      });
    });

    describe('WHEN they leave the created workspace unnamed and rename it later', () => {
      beforeEach(async () => {
        await act(async () => {
          await manager.current.onCreateWorkspace();
          await vi.advanceTimersByTimeAsync(0);
        });
        act(() => manager.current.clearEditingWorkspaceId());
        await act(async () => {
          await manager.current.onRenameWorkspace('ws-new', 'Research');
          await vi.advanceTimersByTimeAsync(0);
        });
      });

      test('THEN the edit mode ends and the later rename gets its own toast', () => {
        expect(manager.current.editingWorkspaceId).toBeNull();
        expect(vi.mocked(event.success).mock.calls).toEqual([
          [TRANSLATIONS.platform.sidebar.workspaceCreated],
          [TRANSLATIONS.platform.sidebar.workspaceRenamed],
        ]);
      });
    });

    describe('WHEN they rename a manageable workspace', () => {
      beforeEach(async () => {
        await act(async () => {
          await manager.current.onRenameWorkspace('ws-2', 'Research');
          await vi.advanceTimersByTimeAsync(0);
        });
      });

      test('THEN the new name shows optimistically and persists', () => {
        expect(manager.current.workspaces).toEqual([
          workspaceItem('ws-1'),
          { id: 'ws-2', name: 'Research', canManageWorkspace: true },
          workspaceItem('ws-3', false),
        ]);
        expect(updateWorkspaceName).toHaveBeenCalledExactlyOnceWith('ws-2', 'Research');
        expect(event.success).toHaveBeenCalledExactlyOnceWith(TRANSLATIONS.platform.sidebar.workspaceRenamed);
      });
    });

    describe('WHEN they rename a workspace they cannot manage', () => {
      beforeEach(async () => {
        await act(async () => {
          await manager.current.onRenameWorkspace('ws-3', 'Hijacked');
          await vi.advanceTimersByTimeAsync(0);
        });
      });

      test('THEN the workspace stays untouched', () => {
        expect(manager.current.workspaces).toEqual(workspaceList());
        expect(updateWorkspaceName).not.toHaveBeenCalled();
        expect(event.success).not.toHaveBeenCalled();
      });
    });

    describe('WHEN they delete the active workspace', () => {
      beforeEach(async () => {
        await act(async () => {
          await manager.current.onDeleteWorkspace('ws-1');
          await vi.advanceTimersByTimeAsync(0);
        });
      });

      test('THEN the next workspace takes over with a fresh tree', () => {
        expect(manager.current.workspaces).toEqual([workspaceItem('ws-2'), workspaceItem('ws-3', false)]);
        expect(manager.current.activeWorkspaceId).toBe('ws-2');
        expect(deleteWorkspace).toHaveBeenCalledExactlyOnceWith('ws-1');
        expect(getFolders).toHaveBeenLastCalledWith('ws-2');
      });

      test('THEN the user is routed home and notified', () => {
        expect(router.push).toHaveBeenCalledWith('/platform');
        expect(event.success).toHaveBeenCalledExactlyOnceWith(TRANSLATIONS.platform.sidebar.workspaceDeleted);
      });
    });

    describe('WHEN they delete a workspace that is not active', () => {
      beforeEach(async () => {
        await act(async () => {
          await manager.current.onDeleteWorkspace('ws-2');
          await vi.advanceTimersByTimeAsync(0);
        });
      });

      test('THEN the open thread and its workspace stay put', () => {
        expect(manager.current.workspaces).toEqual([workspaceItem('ws-1'), workspaceItem('ws-3', false)]);
        expect(manager.current.activeWorkspaceId).toBe('ws-1');
        expect(manager.current.navItems).toEqual(INITIAL_TREE);
        expect(router.push).not.toHaveBeenCalled();
        expect(event.success).toHaveBeenCalledExactlyOnceWith(TRANSLATIONS.platform.sidebar.workspaceDeleted);
      });
    });

    describe('WHEN they drag the first workspace to the end', () => {
      beforeEach(async () => {
        await act(async () => {
          await manager.current.onMoveWorkspace('ws-1', 2);
          await vi.advanceTimersByTimeAsync(0);
        });
      });

      test('THEN the order updates optimistically', () => {
        expect(manager.current.workspaces.map((workspace) => workspace.id)).toEqual(['ws-2', 'ws-3', 'ws-1']);
      });

      test('THEN every shifted workspace is persisted', () => {
        expect(vi.mocked(moveWorkspace).mock.calls).toEqual([
          ['ws-2', 0],
          ['ws-3', 1],
          ['ws-1', 2],
        ]);
      });
    });

    describe('WHEN they drag the last workspace one place up', () => {
      beforeEach(async () => {
        await act(async () => {
          await manager.current.onMoveWorkspace('ws-3', 1);
          await vi.advanceTimersByTimeAsync(0);
        });
      });

      test('THEN every workspace is persisted at its index, since stored positions may have gaps', () => {
        expect(vi.mocked(moveWorkspace).mock.calls).toEqual([
          ['ws-1', 0],
          ['ws-3', 1],
          ['ws-2', 2],
        ]);
      });
    });

    describe('WHEN they bulk delete a manageable and an unmanageable workspace', () => {
      beforeEach(async () => {
        await act(async () => {
          await manager.current.onBulkDeleteWorkspaces(new Set(['ws-2', 'ws-3']));
          await vi.advanceTimersByTimeAsync(0);
        });
      });

      test('THEN only the manageable workspace is deleted with a skip warning', () => {
        expect(manager.current.workspaces).toEqual([workspaceItem('ws-1'), workspaceItem('ws-3', false)]);
        expect(manager.current.activeWorkspaceId).toBe('ws-1');
        expect(deleteWorkspaces).toHaveBeenCalledExactlyOnceWith(['ws-2']);
        expect(event.warning).toHaveBeenCalledExactlyOnceWith(TRANSLATIONS.platform.sidebar.workspacesDeleteSkipped);
        expect(event.success).not.toHaveBeenCalled();
        expect(router.push).not.toHaveBeenCalled();
      });
    });

    describe('WHEN they bulk delete the active workspace', () => {
      beforeEach(async () => {
        await act(async () => {
          await manager.current.onBulkDeleteWorkspaces(new Set(['ws-1']));
          await vi.advanceTimersByTimeAsync(0);
        });
      });

      test('THEN the next workspace takes over', () => {
        expect(manager.current.workspaces).toEqual([workspaceItem('ws-2'), workspaceItem('ws-3', false)]);
        expect(manager.current.activeWorkspaceId).toBe('ws-2');
        expect(deleteWorkspaces).toHaveBeenCalledExactlyOnceWith(['ws-1']);
        expect(getFolders).toHaveBeenLastCalledWith('ws-2');
        expect(router.push).toHaveBeenCalledWith('/platform');
        expect(event.success).toHaveBeenCalledExactlyOnceWith(TRANSLATIONS.platform.sidebar.workspacesDeleted);
      });
    });

    describe('WHEN they select another workspace', () => {
      beforeEach(async () => {
        await act(async () => {
          await manager.current.onWorkspaceSelect('ws-2');
          await vi.advanceTimersByTimeAsync(0);
        });
      });

      test('THEN the workspace activates and routes to its first thread', () => {
        expect(manager.current.activeWorkspaceId).toBe('ws-2');
        expect(manager.current.loading).toBe(false);
        expect(getFolders).toHaveBeenLastCalledWith('ws-2');
        expect(router.push).toHaveBeenCalledExactlyOnceWith('/platform/ws-2/t1');
      });
    });

    describe('WHEN they select the workspace that is already active', () => {
      beforeEach(async () => {
        await act(async () => {
          await manager.current.onWorkspaceSelect('ws-1');
          await vi.advanceTimersByTimeAsync(0);
        });
      });

      test('THEN the open thread stays put while the tree reloads', () => {
        expect(manager.current.activeWorkspaceId).toBe('ws-1');
        expect(manager.current.navItems).toEqual(INITIAL_TREE);
        expect(getFolders).toHaveBeenCalledTimes(2);
        expect(getFolders).toHaveBeenLastCalledWith('ws-1');
        expect(router.push).not.toHaveBeenCalled();
      });
    });
  });

  describe('GIVEN an active workspace whose tree failed to load', () => {
    beforeEach(async () => {
      primeApi({ workspaceId: 'ws-1', threadId: 't1' });
      vi.mocked(getFolders).mockRejectedValueOnce(new Error('db down'));

      manager = renderHook(() => useWorkspaceManager()).result;
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
    });

    describe('WHEN they select the active workspace again', () => {
      beforeEach(async () => {
        await act(async () => {
          await manager.current.onWorkspaceSelect('ws-1');
          await vi.advanceTimersByTimeAsync(0);
        });
      });

      test('THEN the tree loads without leaving the open thread', () => {
        expect(manager.current.activeWorkspaceId).toBe('ws-1');
        expect(manager.current.navItems).toEqual(INITIAL_TREE);
        expect(router.push).not.toHaveBeenCalled();
      });
    });
  });

  describe('GIVEN loaded workspaces whose next tree loads slowly', () => {
    beforeEach(async () => {
      primeApi({ workspaceId: 'ws-1', threadId: 't1' });

      manager = renderHook(() => useWorkspaceManager()).result;
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
      vi.mocked(getFolders).mockReturnValue(Promise.withResolvers<IFolder[]>().promise);
    });

    describe('WHEN they delete the active workspace', () => {
      beforeEach(async () => {
        await act(async () => {
          await manager.current.onDeleteWorkspace('ws-1');
          await vi.advanceTimersByTimeAsync(0);
        });
      });

      test('THEN the tree of the deleted workspace clears before the next tree arrives', () => {
        expect(manager.current.activeWorkspaceId).toBe('ws-2');
        expect(manager.current.navItems).toEqual([]);
      });
    });

    describe('WHEN they bulk delete the active workspace', () => {
      beforeEach(async () => {
        await act(async () => {
          await manager.current.onBulkDeleteWorkspaces(new Set(['ws-1']));
          await vi.advanceTimersByTimeAsync(0);
        });
      });

      test('THEN the tree of the deleted workspace clears before the next tree arrives', () => {
        expect(manager.current.activeWorkspaceId).toBe('ws-2');
        expect(manager.current.navItems).toEqual([]);
      });
    });
  });

  describe('GIVEN a single loaded workspace', () => {
    beforeEach(async () => {
      primeApi({ workspaceId: 'ws-1', threadId: 't1' });
      vi.mocked(getMyWorkspaces).mockResolvedValue([workspaceItem('ws-1')]);

      manager = renderHook(() => useWorkspaceManager()).result;
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
    });

    describe('WHEN they delete it', () => {
      beforeEach(async () => {
        await act(async () => {
          await manager.current.onDeleteWorkspace('ws-1');
          await vi.advanceTimersByTimeAsync(0);
        });
      });

      test('THEN no workspace stays active and the tree empties', () => {
        expect(manager.current.workspaces).toEqual([]);
        expect(manager.current.activeWorkspaceId).toBeNull();
        expect(manager.current.navItems).toEqual([]);
        expect(getFolders).toHaveBeenCalledTimes(1);
        expect(router.push).toHaveBeenCalledExactlyOnceWith('/platform');
      });
    });

    describe('WHEN they bulk delete it', () => {
      beforeEach(async () => {
        await act(async () => {
          await manager.current.onBulkDeleteWorkspaces(new Set(['ws-1']));
          await vi.advanceTimersByTimeAsync(0);
        });
      });

      test('THEN no workspace stays active and the tree empties', () => {
        expect(manager.current.workspaces).toEqual([]);
        expect(manager.current.activeWorkspaceId).toBeNull();
        expect(manager.current.navItems).toEqual([]);
        expect(router.push).toHaveBeenCalledExactlyOnceWith('/platform');
        expect(event.success).toHaveBeenCalledExactlyOnceWith(TRANSLATIONS.platform.sidebar.workspacesDeleted);
      });
    });
  });

  describe('GIVEN a workspace rename that fails on the api', () => {
    beforeEach(async () => {
      primeApi({ workspaceId: 'ws-1', threadId: 't1' });
      vi.mocked(updateWorkspaceName).mockRejectedValue(new Error('db down'));

      manager = renderHook(() => useWorkspaceManager()).result;
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
    });

    describe('WHEN they rename a manageable workspace', () => {
      beforeEach(async () => {
        await act(async () => {
          await manager.current.onRenameWorkspace('ws-2', 'Research');
          await vi.advanceTimersByTimeAsync(0);
        });
      });

      test('THEN the name rolls back from the refetched list', () => {
        expect(manager.current.workspaces).toEqual(workspaceList());
        expect(getMyWorkspaces).toHaveBeenCalledTimes(2);
        expect(event.error).toHaveBeenCalledExactlyOnceWith(expect.any(Error), {
          title: TRANSLATIONS.common.errorTitles.renameFailed,
          context: 'sidebar.renameWorkspace',
        });
        expect(event.success).not.toHaveBeenCalled();
      });
    });
  });

  describe('GIVEN a workspace delete that fails on the api', () => {
    beforeEach(async () => {
      primeApi({ workspaceId: 'ws-1', threadId: 't1' });
      vi.mocked(deleteWorkspace).mockRejectedValue(new Error('db down'));

      manager = renderHook(() => useWorkspaceManager()).result;
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
    });

    describe('WHEN they delete the active workspace', () => {
      beforeEach(async () => {
        await act(async () => {
          await manager.current.onDeleteWorkspace('ws-1');
          await vi.advanceTimersByTimeAsync(0);
        });
      });

      test('THEN the workspace stays and the failure surfaces', () => {
        expect(manager.current.workspaces).toEqual(workspaceList());
        expect(manager.current.activeWorkspaceId).toBe('ws-1');
        expect(router.push).not.toHaveBeenCalled();
        expect(event.success).not.toHaveBeenCalled();
        expect(event.error).toHaveBeenCalledExactlyOnceWith(expect.any(Error), {
          title: TRANSLATIONS.common.errorTitles.deleteFailed,
          context: 'sidebar.deleteWorkspace',
        });
      });
    });
  });

  describe('GIVEN a workspace drag whose first write fails while another write is still running', () => {
    let resolveLastWrite: () => void;

    beforeEach(async () => {
      const lastWrite = Promise.withResolvers<void>();

      resolveLastWrite = lastWrite.resolve;
      primeApi({ workspaceId: 'ws-1', threadId: 't1' });
      vi.mocked(moveWorkspace).mockImplementation(async (id: string) => {
        if (id === 'ws-2') throw new Error('db down');
        if (id === 'ws-1') await lastWrite.promise;
      });

      manager = renderHook(() => useWorkspaceManager()).result;
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
    });

    describe('WHEN they drag the first workspace to the end', () => {
      beforeEach(async () => {
        await act(async () => {
          manager.current.onMoveWorkspace('ws-1', 2);
          await vi.advanceTimersByTimeAsync(0);
        });
      });

      test('THEN nothing reloads and nothing is reported while a write is still running', () => {
        expect(getMyWorkspaces).toHaveBeenCalledOnce();
        expect(event.error).not.toHaveBeenCalled();
      });
    });

    describe('WHEN they drag the first workspace to the end and the last write settles', () => {
      beforeEach(async () => {
        await act(async () => {
          manager.current.onMoveWorkspace('ws-1', 2);
          await vi.advanceTimersByTimeAsync(0);
        });
        await act(async () => {
          resolveLastWrite();
          await vi.advanceTimersByTimeAsync(0);
        });
      });

      test('THEN the list reloads once and the failure surfaces', () => {
        expect(getMyWorkspaces).toHaveBeenCalledTimes(2);
        expect(event.error).toHaveBeenCalledExactlyOnceWith(expect.any(Error), {
          title: TRANSLATIONS.common.errorTitles.moveFailed,
          context: 'sidebar.moveWorkspace',
        });
      });
    });
  });

  describe('GIVEN a workspace whose content fails to load on selection', () => {
    beforeEach(async () => {
      primeApi({ workspaceId: 'ws-1', threadId: 't1' });
      vi.mocked(getFolders).mockRejectedValue(new Error('db down'));
      vi.mocked(getFolders).mockResolvedValueOnce(folderList());

      manager = renderHook(() => useWorkspaceManager()).result;
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
    });

    describe('WHEN they select another workspace', () => {
      beforeEach(async () => {
        await act(async () => {
          await manager.current.onWorkspaceSelect('ws-2');
          await vi.advanceTimersByTimeAsync(0);
        });
      });

      test('THEN the previous workspace is restored', () => {
        expect(manager.current.activeWorkspaceId).toBe('ws-1');
        expect(manager.current.loading).toBe(false);
        expect(router.push).not.toHaveBeenCalled();
        expect(event.error).toHaveBeenCalledExactlyOnceWith(expect.any(Error), {
          title: TRANSLATIONS.common.errorTitles.loadFailed,
          context: 'sidebar.selectWorkspace',
        });
      });
    });

    describe('WHEN they select the active workspace again', () => {
      beforeEach(async () => {
        await act(async () => {
          await manager.current.onWorkspaceSelect('ws-1');
          await vi.advanceTimersByTimeAsync(0);
        });
      });

      test('THEN the failed reload is reported and the tree stays', () => {
        expect(manager.current.activeWorkspaceId).toBe('ws-1');
        expect(manager.current.navItems).toEqual(INITIAL_TREE);
        expect(router.push).not.toHaveBeenCalled();
        expect(event.error).toHaveBeenCalledExactlyOnceWith(expect.any(Error), {
          title: TRANSLATIONS.common.errorTitles.loadFailed,
          context: 'sidebar.selectWorkspace',
        });
      });
    });
  });

  describe('GIVEN a workspace pick still loading when another workspace is picked', () => {
    let resolveStaleLoad: (folders: IFolder[]) => void;
    let rejectStaleLoad: (reason: Error) => void;

    beforeEach(async () => {
      const staleLoad = Promise.withResolvers<IFolder[]>();

      resolveStaleLoad = staleLoad.resolve;
      rejectStaleLoad = staleLoad.reject;
      primeApi({ workspaceId: 'ws-1', threadId: 't1' });

      manager = renderHook(() => useWorkspaceManager()).result;
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
      vi.mocked(getFolders).mockReturnValueOnce(staleLoad.promise);
      await act(async () => {
        manager.current.onWorkspaceSelect('ws-2');
        await vi.advanceTimersByTimeAsync(0);
      });
      await act(async () => {
        await manager.current.onWorkspaceSelect('ws-3');
        await vi.advanceTimersByTimeAsync(0);
      });
    });

    describe('WHEN the stale load fails afterwards', () => {
      beforeEach(async () => {
        await act(async () => {
          rejectStaleLoad(new Error('db down'));
          await vi.advanceTimersByTimeAsync(0);
        });
      });

      test('THEN the newer pick stays active with its tree and route', () => {
        expect(manager.current.activeWorkspaceId).toBe('ws-3');
        expect(manager.current.navItems).toEqual(INITIAL_TREE);
        expect(manager.current.loading).toBe(false);
        expect(router.push).toHaveBeenCalledExactlyOnceWith('/platform/ws-3/t1');
      });
    });

    describe('WHEN the stale load resolves afterwards', () => {
      beforeEach(async () => {
        await act(async () => {
          resolveStaleLoad([]);
          await vi.advanceTimersByTimeAsync(0);
        });
      });

      test('THEN the stale tree and route are dropped', () => {
        expect(manager.current.activeWorkspaceId).toBe('ws-3');
        expect(manager.current.navItems).toEqual(INITIAL_TREE);
        expect(router.push).toHaveBeenCalledExactlyOnceWith('/platform/ws-3/t1');
      });
    });
  });

  describe('GIVEN a move that is still saving when another workspace is picked', () => {
    let rejectMove: (reason: Error) => void;

    beforeEach(async () => {
      const pendingMove = Promise.withResolvers<void>();

      rejectMove = pendingMove.reject;
      primeApi({ workspaceId: 'ws-1', threadId: 't1' });
      vi.mocked(moveThread).mockReturnValue(pendingMove.promise);

      manager = renderHook(() => useWorkspaceManager()).result;
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
      await act(async () => {
        manager.current.onMoveItem('t1', 'f1', 0);
        await vi.advanceTimersByTimeAsync(0);
      });
      vi.mocked(getFolders).mockImplementation(async (workspaceId: string) =>
        workspaceId === 'ws-2' ? [] : folderList(),
      );
      vi.mocked(getThreads).mockImplementation(async (workspaceId: string) =>
        workspaceId === 'ws-2' ? [threadInput('t9', 0)] : threadList(),
      );
      await act(async () => {
        await manager.current.onWorkspaceSelect('ws-2');
        await vi.advanceTimersByTimeAsync(0);
      });
    });

    describe('WHEN the move fails and reloads the workspace it started in', () => {
      beforeEach(async () => {
        await act(async () => {
          rejectMove(new Error('db down'));
          await vi.advanceTimersByTimeAsync(0);
        });
      });

      test('THEN the picked workspace keeps its own tree', () => {
        expect(manager.current.activeWorkspaceId).toBe('ws-2');
        expect(manager.current.navItems).toEqual([threadItem('t9')]);
      });

      test('THEN the failed move is still reported', () => {
        expect(event.error).toHaveBeenCalledExactlyOnceWith(expect.any(Error), {
          title: TRANSLATIONS.common.errorTitles.moveFailed,
          context: 'sidebar.moveItem',
        });
      });
    });
  });

  describe('GIVEN a thread and a folder still being created when another workspace is picked', () => {
    let resolveThread: (thread: IThread) => void;
    let resolveFolder: (folder: IFolder) => void;
    let pendingThreadId: Promise<string | null>;

    beforeEach(async () => {
      const threadCreate = Promise.withResolvers<IThread | null>();
      const folderCreate = Promise.withResolvers<IFolder | null>();

      resolveThread = threadCreate.resolve;
      resolveFolder = folderCreate.resolve;
      primeApi({ workspaceId: 'ws-1', threadId: 't1' });
      vi.mocked(createThread).mockReturnValue(threadCreate.promise);
      vi.mocked(createFolder).mockReturnValue(folderCreate.promise);

      const view = renderHook(() => useWorkspaceManager());

      manager = view.result;
      rerenderManager = view.rerender;
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
      await act(async () => {
        pendingThreadId = manager.current.onCreateThread();
        manager.current.onCreateFolder();
        await vi.advanceTimersByTimeAsync(0);
      });
      vi.mocked(getFolders).mockImplementation(async (workspaceId: string) =>
        workspaceId === 'ws-2' ? [] : folderList(),
      );
      vi.mocked(getThreads).mockImplementation(async (workspaceId: string) =>
        workspaceId === 'ws-2' ? [threadInput('t9', 0)] : threadList(),
      );
      await act(async () => {
        await manager.current.onWorkspaceSelect('ws-2');
        await vi.advanceTimersByTimeAsync(0);
      });
      Object.assign(routeParams, { workspaceId: 'ws-2', threadId: 't9' });
      act(() => rerenderManager());
    });

    describe('WHEN the thread create settles afterwards', () => {
      let createdId: string | null;

      beforeEach(async () => {
        await act(async () => {
          resolveThread(threadInput('t-new', 2));
          createdId = await pendingThreadId;
        });
      });

      test('THEN the picked workspace keeps its own tree, route and rename state', () => {
        expect(manager.current.activeWorkspaceId).toBe('ws-2');
        expect(manager.current.navItems).toEqual([threadItem('t9')]);
        expect(manager.current.editingItemId).toBeNull();
        expect(router.push).toHaveBeenLastCalledWith('/platform/ws-2/t9');
      });

      test('THEN the creation is still confirmed but no thread comes back to open', () => {
        expect(event.success).toHaveBeenCalledExactlyOnceWith(TRANSLATIONS.platform.sidebar.threadCreated);
        expect(createdId).toBeNull();
      });
    });

    describe('WHEN the folder create settles afterwards', () => {
      beforeEach(async () => {
        await act(async () => {
          resolveFolder(folderInput('f-new', 2));
          await vi.advanceTimersByTimeAsync(0);
        });
      });

      test('THEN the picked workspace keeps its own tree and rename state', () => {
        expect(manager.current.navItems).toEqual([threadItem('t9')]);
        expect(manager.current.editingItemId).toBeNull();
        expect(event.success).toHaveBeenCalledExactlyOnceWith(TRANSLATIONS.platform.sidebar.folderCreated);
      });
    });
  });

  describe('GIVEN the open thread still being deleted when another workspace is picked', () => {
    let resolveDelete: () => void;
    let resolveBulkDelete: () => void;

    beforeEach(async () => {
      const singleDelete = Promise.withResolvers<void>();
      const bulkDelete = Promise.withResolvers<void>();

      resolveDelete = singleDelete.resolve;
      resolveBulkDelete = bulkDelete.resolve;
      primeApi({ workspaceId: 'ws-1', threadId: 't1' });
      vi.mocked(deleteThread).mockReturnValue(singleDelete.promise);
      vi.mocked(deleteThreads).mockReturnValue(bulkDelete.promise);

      const view = renderHook(() => useWorkspaceManager());

      manager = view.result;
      rerenderManager = view.rerender;
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
      await act(async () => {
        manager.current.onDeleteItem('t1');
        manager.current.onBulkDelete(new Set(['t1']));
        await vi.advanceTimersByTimeAsync(0);
      });
      vi.mocked(getFolders).mockImplementation(async (workspaceId: string) =>
        workspaceId === 'ws-2' ? [] : folderList(),
      );
      vi.mocked(getThreads).mockImplementation(async (workspaceId: string) =>
        workspaceId === 'ws-2' ? [threadInput('t9', 0)] : threadList(),
      );
      await act(async () => {
        await manager.current.onWorkspaceSelect('ws-2');
        await vi.advanceTimersByTimeAsync(0);
      });
      Object.assign(routeParams, { workspaceId: 'ws-2', threadId: 't9' });
      act(() => rerenderManager());
    });

    describe('WHEN the single delete settles afterwards', () => {
      beforeEach(async () => {
        await act(async () => {
          resolveDelete();
          await vi.advanceTimersByTimeAsync(0);
        });
      });

      test('THEN the thread opened in the picked workspace stays open', () => {
        expect(router.push).toHaveBeenLastCalledWith('/platform/ws-2/t9');
        expect(event.success).toHaveBeenCalledExactlyOnceWith(TRANSLATIONS.platform.sidebar.threadDeleted);
      });
    });

    describe('WHEN the bulk delete settles afterwards', () => {
      beforeEach(async () => {
        await act(async () => {
          resolveBulkDelete();
          await vi.advanceTimersByTimeAsync(0);
        });
      });

      test('THEN the thread opened in the picked workspace stays open', () => {
        expect(router.push).toHaveBeenLastCalledWith('/platform/ws-2/t9');
        expect(event.success).toHaveBeenCalledExactlyOnceWith(TRANSLATIONS.platform.sidebar.itemsDeleted);
      });
    });
  });

  describe('GIVEN the active workspace being deleted', () => {
    let resolveDelete: () => void;

    beforeEach(async () => {
      const pendingDelete = Promise.withResolvers<void>();

      resolveDelete = pendingDelete.resolve;
      primeApi({ workspaceId: 'ws-1', threadId: 't1' });
      vi.mocked(deleteWorkspace).mockReturnValue(pendingDelete.promise);
      vi.mocked(createWorkspace).mockResolvedValue({
        id: 'ws-new',
        name: 'New Workspace',
        ownerId: 'user-1',
        createdAt: '2026-01-01T00:00:00Z',
      });

      manager = renderHook(() => useWorkspaceManager()).result;
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
      await act(async () => {
        manager.current.onDeleteWorkspace('ws-1');
        await vi.advanceTimersByTimeAsync(0);
      });
      await act(async () => {
        await manager.current.onCreateWorkspace();
        await vi.advanceTimersByTimeAsync(0);
      });
    });

    describe('WHEN the delete settles after a workspace was created meanwhile', () => {
      beforeEach(async () => {
        await act(async () => {
          resolveDelete();
          await vi.advanceTimersByTimeAsync(0);
        });
      });

      test('THEN the new workspace survives and stays active', () => {
        expect(manager.current.workspaces.map((workspace) => workspace.id)).toEqual(['ws-2', 'ws-3', 'ws-new']);
        expect(manager.current.activeWorkspaceId).toBe('ws-new');
        expect(manager.current.navItems).toEqual([]);
      });
    });
  });

  describe('GIVEN a manageable content tree on the active workspace', () => {
    beforeEach(async () => {
      primeApi({ workspaceId: 'ws-1', threadId: 't1' });
      vi.mocked(createThread).mockResolvedValue(threadInput('t-new', 2));
      vi.mocked(createFolder).mockResolvedValue(folderInput('f-new', 2));

      manager = renderHook(() => useWorkspaceManager()).result;
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
    });

    describe('WHEN they create a thread at the root', () => {
      beforeEach(async () => {
        await act(async () => {
          await manager.current.onCreateThread();
          await vi.advanceTimersByTimeAsync(0);
        });
      });

      test('THEN the thread appends to the root in edit mode', () => {
        expect(manager.current.navItems).toEqual([
          ...INITIAL_TREE,
          { type: 'thread', id: 't-new', name: 'Thread t-new' },
        ]);
        expect(manager.current.editingItemId).toBe('t-new');
      });

      test('THEN the creation reaches the api and opens the thread', () => {
        expect(createThread).toHaveBeenCalledExactlyOnceWith(
          'ws-1',
          undefined,
          TRANSLATIONS.platform.sidebar.defaultNames.thread,
        );
        expect(router.push).toHaveBeenCalledExactlyOnceWith('/platform/ws-1/t-new');
        expect(event.success).toHaveBeenCalledExactlyOnceWith(TRANSLATIONS.platform.sidebar.threadCreated);
      });

      test('THEN the First Steps badge is awarded', () => {
        expect(awardBadge).toHaveBeenCalledExactlyOnceWith('firstSteps');
      });
    });

    describe('WHEN they create a thread inside the folder', () => {
      beforeEach(async () => {
        await act(async () => {
          await manager.current.onCreateThread('f1');
          await vi.advanceTimersByTimeAsync(0);
        });
      });

      test('THEN the thread lands at the end of the folder', () => {
        expect(manager.current.navItems).toEqual([
          threadItem('t1'),
          folderItem('f1', [threadItem('t2'), { type: 'thread', id: 't-new', name: 'Thread t-new' }]),
        ]);
        expect(createThread).toHaveBeenCalledExactlyOnceWith(
          'ws-1',
          'f1',
          TRANSLATIONS.platform.sidebar.defaultNames.thread,
        );
      });
    });

    describe('WHEN a thread is created with its name already chosen', () => {
      let created: string | null;

      beforeEach(async () => {
        await act(async () => {
          created = await manager.current.onCreateThread(undefined, 'Example');
          await vi.advanceTimersByTimeAsync(0);
        });
      });

      test('THEN the name reaches the api and the new id comes back', () => {
        expect(createThread).toHaveBeenCalledExactlyOnceWith('ws-1', undefined, 'Example');
        expect(created).toBe('t-new');
      });

      test('THEN the thread opens without dropping into rename mode', () => {
        expect(manager.current.editingItemId).toBeNull();
        expect(router.push).toHaveBeenCalledExactlyOnceWith('/platform/ws-1/t-new');
      });

      test('THEN no badge is awarded for the prepared thread', () => {
        expect(awardBadge).not.toHaveBeenCalled();
      });
    });

    describe('WHEN they create a folder', () => {
      beforeEach(async () => {
        await act(async () => {
          await manager.current.onCreateFolder();
          await vi.advanceTimersByTimeAsync(0);
        });
      });

      test('THEN the folder appends to the root in edit mode', () => {
        expect(manager.current.navItems).toEqual([...INITIAL_TREE, folderItem('f-new')]);
        expect(manager.current.editingItemId).toBe('f-new');
        expect(createFolder).toHaveBeenCalledExactlyOnceWith(
          'ws-1',
          undefined,
          TRANSLATIONS.platform.sidebar.defaultNames.folder,
        );
        expect(event.success).toHaveBeenCalledExactlyOnceWith(TRANSLATIONS.platform.sidebar.folderCreated);
      });
    });

    describe('WHEN they name the freshly created thread', () => {
      beforeEach(async () => {
        await act(async () => {
          await manager.current.onCreateThread();
          await vi.advanceTimersByTimeAsync(0);
        });
        await act(async () => {
          await manager.current.onRenameItem('t-new', 'Named question');
          await vi.advanceTimersByTimeAsync(0);
        });
      });

      test('THEN the rename persists without a rename toast', () => {
        expect(updateThreadName).toHaveBeenCalledExactlyOnceWith('t-new', 'Named question');
        expect(event.success).toHaveBeenCalledExactlyOnceWith(TRANSLATIONS.platform.sidebar.threadCreated);
      });
    });

    describe('WHEN they leave the freshly created thread unnamed and rename it later', () => {
      beforeEach(async () => {
        await act(async () => {
          await manager.current.onCreateThread();
          await vi.advanceTimersByTimeAsync(0);
        });
        act(() => manager.current.clearEditingItemId());
        await act(async () => {
          await manager.current.onRenameItem('t-new', 'Named question');
          await vi.advanceTimersByTimeAsync(0);
        });
      });

      test('THEN the edit mode ends and the later rename gets its own toast', () => {
        expect(manager.current.editingItemId).toBeNull();
        expect(vi.mocked(event.success).mock.calls).toEqual([
          [TRANSLATIONS.platform.sidebar.threadCreated],
          [TRANSLATIONS.platform.sidebar.threadRenamed],
        ]);
      });
    });

    describe('WHEN they rename the root thread', () => {
      beforeEach(async () => {
        await act(async () => {
          await manager.current.onRenameItem('t1', 'Sharper question');
          await vi.advanceTimersByTimeAsync(0);
        });
      });

      test('THEN the rename shows optimistically and persists', () => {
        expect(manager.current.navItems[0]).toEqual({
          type: 'thread',
          id: 't1',
          name: 'Sharper question',
          resolved: false,
        });
        expect(updateThreadName).toHaveBeenCalledExactlyOnceWith('t1', 'Sharper question');
        expect(event.success).toHaveBeenCalledExactlyOnceWith(TRANSLATIONS.platform.sidebar.threadRenamed);
        expect(getFolders).toHaveBeenCalledTimes(1);
      });
    });

    describe('WHEN they rename the folder', () => {
      beforeEach(async () => {
        await act(async () => {
          await manager.current.onRenameItem('f1', 'Sorted');
          await vi.advanceTimersByTimeAsync(0);
        });
      });

      test('THEN the rename shows optimistically and persists', () => {
        expect(manager.current.navItems[1]).toMatchObject({ id: 'f1', name: 'Sorted' });
        expect(updateFolderName).toHaveBeenCalledExactlyOnceWith('f1', 'Sorted');
        expect(event.success).toHaveBeenCalledExactlyOnceWith(TRANSLATIONS.platform.sidebar.folderRenamed);
      });
    });

    describe('WHEN they delete the open thread', () => {
      beforeEach(async () => {
        await act(async () => {
          await manager.current.onDeleteItem('t1');
          await vi.advanceTimersByTimeAsync(0);
        });
      });

      test('THEN the thread leaves the tree', () => {
        expect(manager.current.navItems).toEqual([folderItem('f1', [threadItem('t2')])]);
        expect(deleteThread).toHaveBeenCalledExactlyOnceWith('t1');
        expect(deleteFolder).not.toHaveBeenCalled();
        expect(event.success).toHaveBeenCalledExactlyOnceWith(TRANSLATIONS.platform.sidebar.threadDeleted);
      });

      test('THEN the user is routed away from the deleted thread', () => {
        expect(router.push).toHaveBeenCalledExactlyOnceWith('/platform');
      });
    });

    describe('WHEN they delete the folder that does not hold the open thread', () => {
      beforeEach(async () => {
        await act(async () => {
          await manager.current.onDeleteItem('f1');
          await vi.advanceTimersByTimeAsync(0);
        });
      });

      test('THEN the folder leaves the tree without navigation', () => {
        expect(manager.current.navItems).toEqual([threadItem('t1')]);
        expect(deleteFolder).toHaveBeenCalledExactlyOnceWith('f1');
        expect(event.success).toHaveBeenCalledExactlyOnceWith(TRANSLATIONS.platform.sidebar.folderDeleted);
        expect(router.push).not.toHaveBeenCalled();
      });
    });

    describe('WHEN they drag the root thread into the folder', () => {
      beforeEach(async () => {
        await act(async () => {
          await manager.current.onMoveItem('t1', 'f1', 0);
          await vi.advanceTimersByTimeAsync(0);
        });
      });

      test('THEN the tree reflects the move optimistically', () => {
        expect(manager.current.navItems).toEqual([folderItem('f1', [threadItem('t1'), threadItem('t2')])]);
      });

      test('THEN the dragged thread and every shifted sibling persist', () => {
        expect(vi.mocked(moveThread).mock.calls).toEqual([
          ['t1', 'f1', 0],
          ['t2', 'f1', 1],
        ]);
        expect(moveFolder).toHaveBeenCalledExactlyOnceWith('f1', null, 0);
      });
    });

    describe('WHEN they drag the root thread to the end of the folder', () => {
      beforeEach(async () => {
        await act(async () => {
          await manager.current.onMoveItem('t1', 'f1', 1);
          await vi.advanceTimersByTimeAsync(0);
        });
      });

      test('THEN both lists it touched are persisted in full, since stored positions may have gaps', () => {
        expect(manager.current.navItems).toEqual([folderItem('f1', [threadItem('t2'), threadItem('t1')])]);
        expect(vi.mocked(moveThread).mock.calls).toEqual([
          ['t2', 'f1', 0],
          ['t1', 'f1', 1],
        ]);
        expect(moveFolder).toHaveBeenCalledExactlyOnceWith('f1', null, 0);
      });
    });

    describe('WHEN they drop the root thread where it already was', () => {
      beforeEach(async () => {
        await act(async () => {
          await manager.current.onMoveItem('t1', null, 0);
          await vi.advanceTimersByTimeAsync(0);
        });
      });

      test('THEN the tree stays and nothing is written', () => {
        expect(manager.current.navItems).toEqual(INITIAL_TREE);
        expect(moveThread).not.toHaveBeenCalled();
        expect(moveFolder).not.toHaveBeenCalled();
      });
    });

    describe('WHEN they bulk move the root thread to the end of the folder', () => {
      beforeEach(async () => {
        await act(async () => {
          await manager.current.onBulkMove(new Set(['t1']), 'f1', 1);
          await vi.advanceTimersByTimeAsync(0);
        });
      });

      test('THEN the thread lands after the existing children', () => {
        expect(manager.current.navItems).toEqual([folderItem('f1', [threadItem('t2'), threadItem('t1')])]);
      });

      test('THEN both lists it touched are persisted in full', () => {
        expect(vi.mocked(moveThread).mock.calls).toEqual([
          ['t2', 'f1', 0],
          ['t1', 'f1', 1],
        ]);
        expect(moveFolder).toHaveBeenCalledExactlyOnceWith('f1', null, 0);
      });
    });

    describe('WHEN they bulk move the root thread to the top of the folder', () => {
      beforeEach(async () => {
        await act(async () => {
          await manager.current.onBulkMove(new Set(['t1']), 'f1', 0);
          await vi.advanceTimersByTimeAsync(0);
        });
      });

      test('THEN the thread lands at the drop slot and the shifted child is persisted', () => {
        expect(manager.current.navItems).toEqual([folderItem('f1', [threadItem('t1'), threadItem('t2')])]);
        expect(vi.mocked(moveThread).mock.calls).toEqual([
          ['t1', 'f1', 0],
          ['t2', 'f1', 1],
        ]);
      });
    });

    describe('WHEN they bulk delete the open thread and the folder', () => {
      beforeEach(async () => {
        await act(async () => {
          await manager.current.onBulkDelete(new Set(['t1', 'f1']));
          await vi.advanceTimersByTimeAsync(0);
        });
      });

      test('THEN the tree empties through the api', () => {
        expect(manager.current.navItems).toEqual([]);
        expect(deleteThreads).toHaveBeenCalledExactlyOnceWith(['t1']);
        expect(deleteFolders).toHaveBeenCalledExactlyOnceWith(['f1']);
        expect(event.success).toHaveBeenCalledExactlyOnceWith(TRANSLATIONS.platform.sidebar.itemsDeleted);
      });

      test('THEN the user is routed home', () => {
        expect(router.push).toHaveBeenCalledExactlyOnceWith('/platform');
      });
    });

    describe('WHEN they click a thread inside the folder', () => {
      beforeEach(() => {
        act(() => manager.current.onItemClick('t2'));
      });

      test('THEN the router opens the thread', () => {
        expect(router.push).toHaveBeenCalledExactlyOnceWith('/platform/ws-1/t2');
      });
    });

    describe('WHEN they click the folder', () => {
      beforeEach(() => {
        act(() => manager.current.onItemClick('f1'));
      });

      test('THEN no navigation happens', () => {
        expect(router.push).not.toHaveBeenCalled();
      });
    });
  });

  describe('GIVEN a thread create that fails on the api', () => {
    beforeEach(async () => {
      primeApi({ workspaceId: 'ws-1', threadId: 't1' });
      vi.mocked(createThread).mockRejectedValue(new Error('db down'));

      manager = renderHook(() => useWorkspaceManager()).result;
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
    });

    describe('WHEN they create a thread at the root', () => {
      let created: string | null;

      beforeEach(async () => {
        await act(async () => {
          created = await manager.current.onCreateThread();
          await vi.advanceTimersByTimeAsync(0);
        });
      });

      test('THEN the tree stays and the failure surfaces', () => {
        expect(manager.current.navItems).toEqual(INITIAL_TREE);
        expect(router.push).not.toHaveBeenCalled();
        expect(event.success).not.toHaveBeenCalled();
        expect(awardBadge).not.toHaveBeenCalled();
        expect(event.error).toHaveBeenCalledExactlyOnceWith(expect.any(Error), {
          title: TRANSLATIONS.common.errorTitles.createFailed,
          context: 'sidebar.createThread',
        });
      });

      test('THEN no thread id comes back', () => {
        expect(created).toBeNull();
      });
    });
  });

  describe('GIVEN a thread rename that fails on the api', () => {
    beforeEach(async () => {
      primeApi({ workspaceId: 'ws-1', threadId: 't1' });
      vi.mocked(updateThreadName).mockRejectedValue(new Error('db down'));

      manager = renderHook(() => useWorkspaceManager()).result;
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
    });

    describe('WHEN they rename the root thread', () => {
      beforeEach(async () => {
        await act(async () => {
          await manager.current.onRenameItem('t1', 'Sharper question');
          await vi.advanceTimersByTimeAsync(0);
        });
      });

      test('THEN the tree rolls back to the server state', () => {
        expect(manager.current.navItems).toEqual(INITIAL_TREE);
        expect(getFolders).toHaveBeenCalledTimes(2);
        expect(event.success).not.toHaveBeenCalled();
        expect(event.error).toHaveBeenCalledExactlyOnceWith(expect.any(Error), {
          title: TRANSLATIONS.common.errorTitles.renameFailed,
          context: 'sidebar.renameItem',
        });
      });
    });
  });

  describe('GIVEN a move that fails on the api', () => {
    beforeEach(async () => {
      primeApi({ workspaceId: 'ws-1', threadId: 't1' });
      vi.mocked(moveThread).mockRejectedValue(new Error('db down'));

      manager = renderHook(() => useWorkspaceManager()).result;
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
    });

    describe('WHEN they drag the root thread into the folder', () => {
      beforeEach(async () => {
        await act(async () => {
          await manager.current.onMoveItem('t1', 'f1', 0);
          await vi.advanceTimersByTimeAsync(0);
        });
      });

      test('THEN the tree rolls back to the server state', () => {
        expect(manager.current.navItems).toEqual(INITIAL_TREE);
        expect(getFolders).toHaveBeenCalledTimes(2);
        expect(event.error).toHaveBeenCalledExactlyOnceWith(expect.any(Error), {
          title: TRANSLATIONS.common.errorTitles.moveFailed,
          context: 'sidebar.moveItem',
        });
      });
    });
  });

  describe('GIVEN a tree move whose thread writes fail while the folder write is still running', () => {
    let resolveFolderWrite: () => void;

    beforeEach(async () => {
      const folderWrite = Promise.withResolvers<void>();

      resolveFolderWrite = folderWrite.resolve;
      primeApi({ workspaceId: 'ws-1', threadId: 't1' });
      vi.mocked(moveThread).mockRejectedValue(new Error('db down'));
      vi.mocked(moveFolder).mockReturnValue(folderWrite.promise);

      manager = renderHook(() => useWorkspaceManager()).result;
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
    });

    describe('WHEN they drag the root thread into the folder', () => {
      beforeEach(async () => {
        await act(async () => {
          manager.current.onMoveItem('t1', 'f1', 0);
          await vi.advanceTimersByTimeAsync(0);
        });
      });

      test('THEN nothing reloads and nothing is reported while the folder write is still running', () => {
        expect(getFolders).toHaveBeenCalledOnce();
        expect(event.error).not.toHaveBeenCalled();
      });
    });

    describe('WHEN they drag the root thread into the folder and the folder write settles', () => {
      beforeEach(async () => {
        await act(async () => {
          manager.current.onMoveItem('t1', 'f1', 0);
          await vi.advanceTimersByTimeAsync(0);
        });
        await act(async () => {
          resolveFolderWrite();
          await vi.advanceTimersByTimeAsync(0);
        });
      });

      test('THEN the tree reloads once and the failure surfaces once', () => {
        expect(manager.current.navItems).toEqual(INITIAL_TREE);
        expect(getFolders).toHaveBeenCalledTimes(2);
        expect(event.error).toHaveBeenCalledExactlyOnceWith(expect.any(Error), {
          title: TRANSLATIONS.common.errorTitles.moveFailed,
          context: 'sidebar.moveItem',
        });
      });
    });
  });

  describe('GIVEN a bulk delete whose folder delete commits and whose thread delete fails, with a thread of that folder open', () => {
    beforeEach(async () => {
      primeApi({ workspaceId: 'ws-1', threadId: 't2' });
      vi.mocked(deleteThreads).mockRejectedValue(new Error('db down'));

      manager = renderHook(() => useWorkspaceManager()).result;
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
      vi.mocked(getFolders).mockResolvedValue([]);
      vi.mocked(getThreads).mockResolvedValue([threadInput('t1', 0)]);
    });

    describe('WHEN they bulk delete the folder and the root thread', () => {
      beforeEach(async () => {
        await act(async () => {
          await manager.current.onBulkDelete(new Set(['f1', 't1']));
          await vi.advanceTimersByTimeAsync(0);
        });
      });

      test('THEN the tree reloads the server state and the failure surfaces', () => {
        expect(manager.current.navItems).toEqual([threadItem('t1')]);
        expect(event.success).not.toHaveBeenCalled();
        expect(event.error).toHaveBeenCalledExactlyOnceWith(expect.any(Error), {
          title: TRANSLATIONS.common.errorTitles.deleteFailed,
          context: 'sidebar.bulkDelete',
        });
      });

      test('THEN the user is routed away from the deleted thread', () => {
        expect(router.push).toHaveBeenCalledExactlyOnceWith('/platform');
      });
    });
  });

  describe('GIVEN a bulk delete that fails on the api before anything commits', () => {
    beforeEach(async () => {
      primeApi({ workspaceId: 'ws-1', threadId: 't1' });
      vi.mocked(deleteThreads).mockRejectedValue(new Error('db down'));

      manager = renderHook(() => useWorkspaceManager()).result;
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
    });

    describe('WHEN they bulk delete the open thread', () => {
      beforeEach(async () => {
        await act(async () => {
          await manager.current.onBulkDelete(new Set(['t1']));
          await vi.advanceTimersByTimeAsync(0);
        });
      });

      test('THEN the tree rolls back to the server state and the thread stays open', () => {
        expect(manager.current.navItems).toEqual(INITIAL_TREE);
        expect(router.push).not.toHaveBeenCalled();
      });
    });
  });

  describe('GIVEN a folder delete that is still running in a bulk delete whose thread delete fails', () => {
    beforeEach(async () => {
      primeApi({ workspaceId: 'ws-1', threadId: 't1' });
      vi.mocked(deleteFolders).mockReturnValue(Promise.withResolvers<void>().promise);
      vi.mocked(deleteThreads).mockRejectedValue(new Error('db down'));

      manager = renderHook(() => useWorkspaceManager()).result;
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
    });

    describe('WHEN they bulk delete the folder and the root thread', () => {
      beforeEach(async () => {
        await act(async () => {
          manager.current.onBulkDelete(new Set(['f1', 't1']));
          await vi.advanceTimersByTimeAsync(0);
        });
      });

      test('THEN the thread delete waits for the folder delete and nothing reloads meanwhile', () => {
        expect(deleteFolders).toHaveBeenCalledExactlyOnceWith(['f1']);
        expect(deleteThreads).not.toHaveBeenCalled();
        expect(getFolders).toHaveBeenCalledOnce();
      });
    });
  });

  describe('GIVEN a second folder beside the folder that holds a thread', () => {
    beforeEach(async () => {
      primeApi({ workspaceId: 'ws-1', threadId: 't1' });
      vi.mocked(getFolders).mockResolvedValue([folderInput('f1', 1), folderInput('f2', 2)]);

      manager = renderHook(() => useWorkspaceManager()).result;
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
    });

    describe('WHEN they bulk move the folder together with its own thread into the second folder', () => {
      beforeEach(async () => {
        await act(async () => {
          await manager.current.onBulkMove(new Set(['f1', 't2']), 'f2', 0);
          await vi.advanceTimersByTimeAsync(0);
        });
      });

      test('THEN the thread travels inside its folder instead of being pulled out of it', () => {
        expect(manager.current.navItems).toEqual([
          threadItem('t1'),
          folderItem('f2', [folderItem('f1', [threadItem('t2')])]),
        ]);
        expect(moveThread).not.toHaveBeenCalledWith('t2', expect.anything(), expect.anything());
      });

      test('THEN the moved folder and the root items left behind persist at their new indexes', () => {
        expect(vi.mocked(moveFolder).mock.calls).toEqual([
          ['f1', 'f2', 0],
          ['f2', null, 1],
        ]);
        expect(moveThread).toHaveBeenCalledExactlyOnceWith('t1', null, 0);
      });
    });
  });

  describe('GIVEN a member who cannot manage the structure', () => {
    beforeEach(async () => {
      primeApi({ workspaceId: 'ws-1', threadId: 't1' });
      vi.mocked(getMyWorkspacePermissions).mockResolvedValue(EDIT_ACCESS);

      manager = renderHook(() => useWorkspaceManager()).result;
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
    });

    describe('WHEN they try to create and delete items', () => {
      beforeEach(async () => {
        await act(async () => {
          await manager.current.onCreateThread();
          await manager.current.onDeleteItem('t1');
          await vi.advanceTimersByTimeAsync(0);
        });
      });

      test('THEN the tree and the api stay untouched', () => {
        expect(manager.current.navItems).toEqual(INITIAL_TREE);
        expect(createThread).not.toHaveBeenCalled();
        expect(deleteThread).not.toHaveBeenCalled();
      });
    });
  });

  describe('GIVEN pending invitations for the member', () => {
    beforeEach(async () => {
      primeApi({ workspaceId: 'ws-1', threadId: 't1' });
      vi.mocked(getMyWorkspaces).mockResolvedValue([workspaceItem('ws-1'), workspaceItem('ws-9')]);
      vi.mocked(getMyWorkspaces).mockResolvedValueOnce([workspaceItem('ws-1')]);
      vi.mocked(getMyInvitations).mockResolvedValue([myInvitation('inv-1', 'ws-9'), myInvitation('inv-2', 'ws-8')]);

      manager = renderHook(() => useWorkspaceManager()).result;
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
    });

    describe('WHEN they accept the first invitation', () => {
      beforeEach(async () => {
        await act(async () => {
          await manager.current.onAcceptInvitation(myInvitation('inv-1', 'ws-9'));
          await vi.advanceTimersByTimeAsync(0);
        });
      });

      test('THEN the invitation clears and the workspace list refreshes', () => {
        expect(manager.current.invitations).toEqual([myInvitation('inv-2', 'ws-8')]);
        expect(acceptWorkspaceInvitation).toHaveBeenCalledExactlyOnceWith('inv-1');
        expect(manager.current.workspaces).toEqual([workspaceItem('ws-1'), workspaceItem('ws-9')]);
        expect(event.success).toHaveBeenCalledExactlyOnceWith(TRANSLATIONS.platform.sidebar.invitations.accepted);
        expect(awardBadge).toHaveBeenCalledExactlyOnceWith('collaborator');
      });

      test('THEN the joined workspace opens', () => {
        expect(manager.current.activeWorkspaceId).toBe('ws-9');
        expect(getFolders).toHaveBeenLastCalledWith('ws-9');
        expect(router.push).toHaveBeenCalledExactlyOnceWith('/platform/ws-9/t1');
      });
    });

    describe('WHEN they decline the second invitation', () => {
      beforeEach(async () => {
        await act(async () => {
          await manager.current.onDeclineInvitation(myInvitation('inv-2', 'ws-8'));
          await vi.advanceTimersByTimeAsync(0);
        });
      });

      test('THEN the invitation clears without a workspace refresh', () => {
        expect(manager.current.invitations).toEqual([myInvitation('inv-1', 'ws-9')]);
        expect(declineWorkspaceInvitation).toHaveBeenCalledExactlyOnceWith('inv-2');
        expect(getMyWorkspaces).toHaveBeenCalledTimes(1);
        expect(event.success).toHaveBeenCalledExactlyOnceWith(TRANSLATIONS.platform.sidebar.invitations.declined);
      });
    });
  });

  describe('GIVEN an invitation accept that fails on the api', () => {
    beforeEach(async () => {
      primeApi({ workspaceId: 'ws-1', threadId: 't1' });
      vi.mocked(getMyWorkspaces).mockResolvedValue([workspaceItem('ws-1')]);
      vi.mocked(getMyInvitations).mockResolvedValue([myInvitation('inv-1', 'ws-9'), myInvitation('inv-2', 'ws-8')]);
      vi.mocked(acceptWorkspaceInvitation).mockRejectedValue(new Error('db down'));

      manager = renderHook(() => useWorkspaceManager()).result;
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
    });

    describe('WHEN they accept the first invitation', () => {
      beforeEach(async () => {
        await act(async () => {
          await manager.current.onAcceptInvitation(myInvitation('inv-1', 'ws-9'));
          await vi.advanceTimersByTimeAsync(0);
        });
      });

      test('THEN the invitation stays and the failure surfaces', () => {
        expect(manager.current.invitations).toEqual([myInvitation('inv-1', 'ws-9'), myInvitation('inv-2', 'ws-8')]);
        expect(getMyWorkspaces).toHaveBeenCalledTimes(1);
        expect(event.success).not.toHaveBeenCalled();
        expect(awardBadge).not.toHaveBeenCalled();
        expect(event.error).toHaveBeenCalledExactlyOnceWith(expect.any(Error), {
          title: TRANSLATIONS.platform.sidebar.invitations.acceptFailed,
          context: 'sidebar.acceptInvitation',
        });
      });
    });
  });

  describe('GIVEN a manager subscribed to the canvas store', () => {
    let unsubscribeCanvas: Mock<() => void>;

    beforeEach(async () => {
      const canvasSubscribe = useCanvasStore.subscribe;
      vi.spyOn(useCanvasStore, 'subscribe').mockImplementation((listener) => {
        unsubscribeCanvas = vi.fn(canvasSubscribe(listener));

        return unsubscribeCanvas;
      });
      primeApi({ workspaceId: 'ws-1', threadId: 't1' });

      const view = renderHook(() => useWorkspaceManager());

      manager = view.result;
      unmountManager = view.unmount;
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
    });

    describe('WHEN the active thread gains an answer node on the canvas', () => {
      beforeEach(() => {
        act(() => useCanvasStore.setState({ threadId: 't1', nodes: [canvasNode('n1', { isAnswer: true })] }));
      });

      test('THEN the thread shows as resolved in the nav tree', () => {
        expect(manager.current.navItems[0]).toEqual(threadItem('t1', true));
      });
    });

    describe('WHEN the answer node is removed again', () => {
      beforeEach(() => {
        act(() => useCanvasStore.setState({ threadId: 't1', nodes: [canvasNode('n1', { isAnswer: true })] }));
        act(() => useCanvasStore.setState({ nodes: [canvasNode('n1')] }));
      });

      test('THEN the resolved mark clears', () => {
        expect(manager.current.navItems[0]).toEqual(threadItem('t1'));
      });
    });

    describe('WHEN the answer node is reached from a refuted node', () => {
      beforeEach(() => {
        act(() =>
          useCanvasStore.setState({
            threadId: 't1',
            nodes: [canvasNode('n0', { status: 'invalid' }), canvasNode('n1', { isAnswer: true })],
            edges: [canvasEdge('e1', 'n0', 'n1')],
          }),
        );
      });

      test('THEN the tainted answer leaves the thread unresolved', () => {
        expect(manager.current.navItems[0]).toEqual(threadItem('t1'));
      });
    });

    describe('WHEN the edge from the refuted node is removed afterwards', () => {
      beforeEach(() => {
        act(() =>
          useCanvasStore.setState({
            threadId: 't1',
            nodes: [canvasNode('n0', { status: 'invalid' }), canvasNode('n1', { isAnswer: true })],
            edges: [canvasEdge('e1', 'n0', 'n1')],
          }),
        );
        act(() => useCanvasStore.setState({ edges: [] }));
      });

      test('THEN the edge change alone resolves the thread', () => {
        expect(manager.current.navItems[0]).toEqual(threadItem('t1', true));
      });
    });

    describe('WHEN the canvas opens another resolved thread', () => {
      beforeEach(() => {
        act(() => useCanvasStore.setState({ threadId: 't1', nodes: [canvasNode('n1', { isAnswer: true })] }));
        act(() => useCanvasStore.setState({ threadId: 't2', nodes: [canvasNode('n2', { isAnswer: true })] }));
      });

      test('THEN both threads carry the resolved mark', () => {
        expect(manager.current.navItems).toEqual([threadItem('t1', true), folderItem('f1', [threadItem('t2', true)])]);
      });
    });

    describe('WHEN the canvas changes without flipping the resolution', () => {
      let navItemsBefore: TNavItem[];

      beforeEach(() => {
        act(() => useCanvasStore.setState({ threadId: 't1', nodes: [canvasNode('n1')] }));
        navItemsBefore = manager.current.navItems;
        act(() => useCanvasStore.setState({ nodes: [canvasNode('n2')] }));
      });

      test('THEN the nav tree is not recomputed', () => {
        expect(manager.current.navItems).toBe(navItemsBefore);
      });
    });

    describe('WHEN only canvas state outside the graph changes', () => {
      let navItemsBefore: TNavItem[];

      beforeEach(() => {
        act(() => useCanvasStore.setState({ threadId: 't1', nodes: [canvasNode('n1', { isAnswer: true })] }));
        navItemsBefore = manager.current.navItems;
        act(() => useCanvasStore.setState({ hydrated: true }));
      });

      test('THEN the nav tree is not recomputed', () => {
        expect(manager.current.navItems).toBe(navItemsBefore);
        expect(manager.current.navItems[0]).toEqual(threadItem('t1', true));
      });
    });

    describe('WHEN the canvas holds nodes without a loaded thread', () => {
      let navItemsBefore: TNavItem[];

      beforeEach(() => {
        navItemsBefore = manager.current.navItems;
        act(() => useCanvasStore.setState({ threadId: null, nodes: [canvasNode('n1', { isAnswer: true })] }));
      });

      test('THEN no thread is marked', () => {
        expect(manager.current.navItems).toBe(navItemsBefore);
      });
    });

    describe('WHEN the manager unmounts', () => {
      beforeEach(() => {
        unmountManager();
      });

      test('THEN the canvas subscription is released', () => {
        expect(unsubscribeCanvas).toHaveBeenCalledTimes(1);
      });
    });
  });
});
