'use client';

import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { IMyInvitation, IWorkspaceItem, TNavItem, TNavItemType } from '@interfaces';
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
  getMyWorkspaces,
  getThreads,
  moveFolder,
  moveThread,
  moveWorkspace,
  updateFolderName,
  updateThreadName,
  updateWorkspaceName,
} from '@api/client';
import {
  buildNavTree,
  containsThread,
  findFirstThread,
  findInTree,
  findOutermostItems,
  findParentId,
  getSiblings,
  insertIntoTree,
  removeFromTree,
  updateNavItemName,
} from '@/components/Sidebar';
import { useTranslations } from '@/i18n';
import { awardBadge } from '@/lib/badges';
import { event } from '@/lib/events';
import { usePermissionsStore } from '@/lib/stores';
import { createClient } from '@/lib/supabase';

import { useThreadResolutionSync } from './useThreadResolutionSync';
import { useWorkspaceAccess } from './useWorkspaceAccess';

const canManageWorkspace = (workspaces: IWorkspaceItem[], id: string): boolean =>
  workspaces.some((workspace) => workspace.id === id && workspace.canManageWorkspace);

const moveNavItem = (type: TNavItemType, id: string, parentId: string | null, position: number) =>
  type === 'folder' ? moveFolder(id, parentId, position) : moveThread(id, parentId, position);

const findFailedWrite = async (writes: Promise<unknown>[]) =>
  (await Promise.allSettled(writes)).find((result) => result.status === 'rejected');

export const useWorkspaceManager = () => {
  const router = useRouter();
  const params = useParams();
  const workspaceIdParam = params.workspaceId as string | undefined;
  const threadIdParam = params.threadId as string | undefined;
  const t = useTranslations();

  const [workspaces, setWorkspaces] = useState<IWorkspaceItem[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [navItems, setNavItems] = useState<TNavItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [redirecting, setRedirecting] = useState(false);

  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingWorkspaceId, setEditingWorkspaceId] = useState<string | null>(null);
  const [invitations, setInvitations] = useState<IMyInvitation[]>([]);

  const initializedRef = useRef(false);
  const justCreatedIdsRef = useRef<Set<string>>(new Set());
  const activeWorkspaceRef = useRef<string | null>(null);
  const routeWorkspaceRef = useRef(workspaceIdParam);

  if (redirecting && threadIdParam) setRedirecting(false);

  const activateWorkspace = useCallback((id: string | null) => {
    activeWorkspaceRef.current = id;
    setActiveWorkspaceId(id);
  }, []);

  const loadWorkspaceContent = useCallback(async (workspaceId: string): Promise<TNavItem[] | null> => {
    const [folders, threads] = await Promise.all([getFolders(workspaceId), getThreads(workspaceId)]);
    if (activeWorkspaceRef.current !== workspaceId) return null;

    const tree = buildNavTree(folders, threads);
    setNavItems(tree);

    return tree;
  }, []);

  const reloadWorkspaceContent = useCallback(
    (workspaceId: string) =>
      loadWorkspaceContent(workspaceId).catch((error: unknown) => {
        event.error(error, { toast: false, context: 'sidebar.reloadContent' });
      }),
    [loadWorkspaceContent],
  );

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const init = async () => {
      const [, workspaceList] = await Promise.all([createClient().auth.getSession(), getMyWorkspaces()]);
      setWorkspaces(workspaceList);

      const targetWorkspaceId = workspaceIdParam
        ? workspaceList.find((workspace) => workspace.id === workspaceIdParam)?.id
        : workspaceList[0]?.id;

      if (targetWorkspaceId) {
        activateWorkspace(targetWorkspaceId);
        const tree = await loadWorkspaceContent(targetWorkspaceId);

        if (tree && !threadIdParam) {
          const firstThreadId = findFirstThread(tree);
          if (firstThreadId) {
            setRedirecting(true);
            router.replace(`/platform/${targetWorkspaceId}/${firstThreadId}`);
          }
        }
      }

      setLoading(false);
    };

    init().catch((error) => {
      event.error(error, { context: 'sidebar.loadWorkspaces' });
      setLoading(false);
    });
  }, [workspaceIdParam, threadIdParam, activateWorkspace, loadWorkspaceContent, router]);

  useThreadResolutionSync(setNavItems);
  useWorkspaceAccess(activeWorkspaceId);

  useEffect(() => {
    if (workspaceIdParam && !workspaces.some((workspace) => workspace.id === workspaceIdParam)) return;

    const previousRouteWorkspaceId = routeWorkspaceRef.current;
    routeWorkspaceRef.current = workspaceIdParam;
    if (!workspaceIdParam || workspaceIdParam === previousRouteWorkspaceId) return;
    if (workspaceIdParam === activeWorkspaceRef.current) return;

    const followRoute = async () => {
      activateWorkspace(workspaceIdParam);
      setEditingItemId(null);
      setEditingWorkspaceId(null);
      setLoading(true);
      const tree = await loadWorkspaceContent(workspaceIdParam).catch((error: unknown) => {
        event.error(error, { title: t.common.errorTitles.loadFailed, context: 'sidebar.followRoute' });

        return null;
      });
      if (activeWorkspaceRef.current !== workspaceIdParam) return;

      setLoading(false);
      if (!tree) setNavItems([]);
    };

    followRoute();
  }, [workspaceIdParam, workspaces, activateWorkspace, loadWorkspaceContent, t]);

  const handleWorkspaceSelect = useCallback(
    async (id: string) => {
      if (id === activeWorkspaceId) {
        await loadWorkspaceContent(id).catch((error: unknown) => {
          event.error(error, { title: t.common.errorTitles.loadFailed, context: 'sidebar.selectWorkspace' });
        });

        return;
      }

      const previousWorkspaceId = activeWorkspaceId;
      activateWorkspace(id);
      setEditingItemId(null);
      setEditingWorkspaceId(null);
      setLoading(true);
      const tree = await loadWorkspaceContent(id).catch((error: unknown) => {
        event.error(error, { title: t.common.errorTitles.loadFailed, context: 'sidebar.selectWorkspace' });
        if (activeWorkspaceRef.current === id) activateWorkspace(previousWorkspaceId);

        return null;
      });
      setLoading(false);
      if (!tree) return;

      const firstThreadId = findFirstThread(tree);
      router.push(firstThreadId ? `/platform/${id}/${firstThreadId}` : '/platform');
    },
    [activeWorkspaceId, router, activateWorkspace, loadWorkspaceContent, t],
  );

  const activateFirstWorkspace = useCallback(
    (remaining: IWorkspaceItem[]) => {
      const next = remaining[0];
      activateWorkspace(next?.id ?? null);
      setNavItems([]);
      if (next) reloadWorkspaceContent(next.id);
    },
    [activateWorkspace, reloadWorkspaceContent],
  );

  const handleCreateWorkspace = useCallback(async () => {
    const created = await createWorkspace(t.platform.sidebar.defaultNames.workspace).catch((error: unknown) => {
      event.error(error, { title: t.common.errorTitles.createFailed, context: 'sidebar.createWorkspace' });

      return null;
    });
    if (!created) return;

    const newWorkspace: IWorkspaceItem = {
      id: created.id,
      name: created.name,
      canManageWorkspace: true,
    };
    setWorkspaces((previous) => [...previous, newWorkspace]);
    activateWorkspace(created.id);
    setEditingWorkspaceId(created.id);
    justCreatedIdsRef.current.add(created.id);
    setNavItems([]);
    router.push('/platform');
    event.success(t.platform.sidebar.workspaceCreated);
    awardBadge('workspaceBuilder');
  }, [activateWorkspace, router, t]);

  const reloadWorkspaces = useCallback(async () => {
    const workspaceList = await getMyWorkspaces().catch((error: unknown) => {
      event.error(error, { toast: false, context: 'sidebar.reloadWorkspaces' });

      return null;
    });
    if (!workspaceList) return;

    setWorkspaces(workspaceList);
  }, []);

  useEffect(() => {
    let cancelled = false;
    getMyInvitations()
      .then((list) => {
        if (!cancelled) setInvitations(list);
      })
      .catch((error) => event.error(error, { toast: false, context: 'sidebar.loadInvitations' }));

    return () => {
      cancelled = true;
    };
  }, []);

  const handleAcceptInvitation = useCallback(
    async (invitation: IMyInvitation) => {
      try {
        await acceptWorkspaceInvitation(invitation.id);
      } catch (error) {
        event.error(error, {
          title: t.platform.sidebar.invitations.acceptFailed,
          context: 'sidebar.acceptInvitation',
        });

        return;
      }

      setInvitations((previous) => previous.filter((item) => item.id !== invitation.id));
      await reloadWorkspaces();
      event.success(t.platform.sidebar.invitations.accepted);
      awardBadge('collaborator');
      handleWorkspaceSelect(invitation.workspaceId);
    },
    [reloadWorkspaces, handleWorkspaceSelect, t],
  );

  const handleDeclineInvitation = useCallback(
    async (invitation: IMyInvitation) => {
      try {
        await declineWorkspaceInvitation(invitation.id);
      } catch (error) {
        event.error(error, {
          title: t.platform.sidebar.invitations.declineFailed,
          context: 'sidebar.declineInvitation',
        });

        return;
      }

      setInvitations((previous) => previous.filter((item) => item.id !== invitation.id));
      event.success(t.platform.sidebar.invitations.declined);
    },
    [t],
  );

  const handleRenameWorkspace = useCallback(
    async (id: string, name: string) => {
      if (!canManageWorkspace(workspaces, id)) return;

      const wasJustCreated = justCreatedIdsRef.current.delete(id);
      setWorkspaces((previous) =>
        previous.map((workspace) => (workspace.id === id ? { ...workspace, name } : workspace)),
      );
      try {
        await updateWorkspaceName(id, name);
        if (!wasJustCreated) event.success(t.platform.sidebar.workspaceRenamed);
      } catch (error) {
        event.error(error, { title: t.common.errorTitles.renameFailed, context: 'sidebar.renameWorkspace' });
        await reloadWorkspaces();
      }
    },
    [workspaces, reloadWorkspaces, t],
  );

  const handleDeleteWorkspace = useCallback(
    async (id: string) => {
      if (!canManageWorkspace(workspaces, id)) return;

      try {
        await deleteWorkspace(id);
      } catch (error) {
        event.error(error, { title: t.common.errorTitles.deleteFailed, context: 'sidebar.deleteWorkspace' });

        return;
      }

      setWorkspaces((previous) => previous.filter((workspace) => workspace.id !== id));
      if (activeWorkspaceRef.current === id) {
        activateFirstWorkspace(workspaces.filter((workspace) => workspace.id !== id));
        router.push('/platform');
      }

      event.success(t.platform.sidebar.workspaceDeleted);
    },
    [workspaces, router, activateFirstWorkspace, t],
  );

  const handleCreateThread = useCallback(
    async (folderId?: string, name?: string): Promise<string | null> => {
      if (!activeWorkspaceId) return null;
      if (!usePermissionsStore.getState().canManageStructure) return null;

      const thread = await createThread(
        activeWorkspaceId,
        folderId,
        name ?? t.platform.sidebar.defaultNames.thread,
      ).catch((error: unknown) => {
        event.error(error, { title: t.common.errorTitles.createFailed, context: 'sidebar.createThread' });

        return null;
      });
      if (!thread) return null;

      event.success(t.platform.sidebar.threadCreated);
      if (!name) awardBadge('firstSteps');
      if (activeWorkspaceRef.current !== activeWorkspaceId) return null;

      const newItem: TNavItem = {
        type: 'thread',
        id: thread.id,
        name: thread.name,
      };
      setNavItems((previous) =>
        folderId ? insertIntoTree(previous, newItem, folderId, Infinity) : [...previous, newItem],
      );
      if (!name) {
        setEditingItemId(thread.id);
        justCreatedIdsRef.current.add(thread.id);
      }
      router.push(`/platform/${activeWorkspaceId}/${thread.id}`);

      return thread.id;
    },
    [activeWorkspaceId, router, t],
  );

  const handleCreateFolder = useCallback(async () => {
    if (!activeWorkspaceId) return;
    if (!usePermissionsStore.getState().canManageStructure) return;

    const folder = await createFolder(activeWorkspaceId, undefined, t.platform.sidebar.defaultNames.folder).catch(
      (error: unknown) => {
        event.error(error, { title: t.common.errorTitles.createFailed, context: 'sidebar.createFolder' });

        return null;
      },
    );
    if (!folder) return;

    event.success(t.platform.sidebar.folderCreated);
    if (activeWorkspaceRef.current !== activeWorkspaceId) return;

    setNavItems((previous) => [...previous, { type: 'folder', id: folder.id, name: folder.name, items: [] }]);
    setEditingItemId(folder.id);
    justCreatedIdsRef.current.add(folder.id);
  }, [activeWorkspaceId, t]);

  const handleDeleteItem = useCallback(
    async (id: string) => {
      if (!activeWorkspaceId) return;
      if (!usePermissionsStore.getState().canManageStructure) return;

      const item = findInTree(navItems, id);
      if (!item) return;

      try {
        if (item.type === 'folder') {
          await deleteFolder(id);
        } else {
          await deleteThread(id);
        }
      } catch (error) {
        event.error(error, { title: t.common.errorTitles.deleteFailed, context: 'sidebar.deleteItem' });

        return;
      }

      event.success(item.type === 'folder' ? t.platform.sidebar.folderDeleted : t.platform.sidebar.threadDeleted);
      if (activeWorkspaceRef.current !== activeWorkspaceId) return;

      setNavItems((previous) => removeFromTree(previous, id));

      const shouldNavigate =
        item.type === 'thread' ? threadIdParam === id : threadIdParam && containsThread(item, threadIdParam);
      if (shouldNavigate) {
        router.push('/platform');
      }
    },
    [activeWorkspaceId, navItems, threadIdParam, router, t],
  );

  const handleRenameItem = useCallback(
    async (id: string, name: string) => {
      if (!usePermissionsStore.getState().canManageStructure) return;

      const item = findInTree(navItems, id);
      if (!item) return;

      const wasJustCreated = justCreatedIdsRef.current.delete(id);
      setNavItems((previous) => updateNavItemName(previous, id, name));

      try {
        if (item.type === 'folder') {
          await updateFolderName(id, name);
        } else {
          await updateThreadName(id, name);
        }
        if (!wasJustCreated) {
          event.success(item.type === 'folder' ? t.platform.sidebar.folderRenamed : t.platform.sidebar.threadRenamed);
        }
      } catch (error) {
        event.error(error, { title: t.common.errorTitles.renameFailed, context: 'sidebar.renameItem' });
        if (activeWorkspaceId) await reloadWorkspaceContent(activeWorkspaceId);
      }
    },
    [navItems, activeWorkspaceId, reloadWorkspaceContent, t],
  );

  const moveItems = useCallback(
    async (ids: ReadonlySet<string>, targetParentId: string | null, position: number, context: string) => {
      if (!activeWorkspaceId) return;
      if (!usePermissionsStore.getState().canManageStructure) return;

      const itemsToMove = findOutermostItems(navItems, ids);
      const siblings = getSiblings(navItems, targetParentId);
      const stayingSiblings = siblings.filter((sibling) => !ids.has(sibling.id));
      const insertAt = Math.min(position, stayingSiblings.length);
      const targetItems = [...stayingSiblings.slice(0, insertAt), ...itemsToMove, ...stayingSiblings.slice(insertAt)];
      const sourceParentIds = new Set(itemsToMove.map((item) => findParentId(navItems, item.id) ?? null));
      sourceParentIds.delete(targetParentId);
      if (sourceParentIds.size === 0 && targetItems.every((item, index) => item.id === siblings[index]?.id)) return;

      setNavItems((previous) => {
        const removed = itemsToMove.reduce((accumulator, item) => removeFromTree(accumulator, item.id), previous);

        return itemsToMove.reduce(
          (accumulator, item, index) => insertIntoTree(accumulator, item, targetParentId, insertAt + index),
          removed,
        );
      });

      const reorderedLists = [
        { parentId: targetParentId, items: targetItems },
        ...[...sourceParentIds].map((parentId) => ({
          parentId,
          items: getSiblings(navItems, parentId).filter((sibling) => !ids.has(sibling.id)),
        })),
      ];

      const failedWrite = await findFailedWrite(
        reorderedLists.flatMap(({ parentId, items }) =>
          items.map((item, index) => moveNavItem(item.type, item.id, parentId, index)),
        ),
      );
      if (!failedWrite) return;

      event.error(failedWrite.reason, { title: t.common.errorTitles.moveFailed, context });
      await reloadWorkspaceContent(activeWorkspaceId);
    },
    [activeWorkspaceId, navItems, reloadWorkspaceContent, t],
  );

  const handleMoveItem = useCallback(
    (id: string, parentId: string | null, position: number) =>
      moveItems(new Set([id]), parentId, position, 'sidebar.moveItem'),
    [moveItems],
  );

  const handleBulkMove = useCallback(
    (ids: Set<string>, targetParentId: string | null, position: number) =>
      moveItems(ids, targetParentId, position, 'sidebar.bulkMove'),
    [moveItems],
  );

  const handleBulkDelete = useCallback(
    async (ids: Set<string>) => {
      if (!activeWorkspaceId) return;
      if (!usePermissionsStore.getState().canManageStructure) return;

      const resolved = [...ids].map((id) => findInTree(navItems, id)).filter((item): item is TNavItem => item !== null);
      const folderIds = resolved.filter((item) => item.type === 'folder').map((item) => item.id);
      const threadIds = resolved.filter((item) => item.type === 'thread').map((item) => item.id);

      setNavItems((previous) => [...ids].reduce((accumulator, id) => removeFromTree(accumulator, id), previous));

      try {
        if (folderIds.length > 0) await deleteFolders(folderIds);
        if (threadIds.length > 0) await deleteThreads(threadIds);
      } catch (error) {
        event.error(error, { title: t.common.errorTitles.deleteFailed, context: 'sidebar.bulkDelete' });
        const tree = await reloadWorkspaceContent(activeWorkspaceId);
        if (tree && threadIdParam && !findInTree(tree, threadIdParam)) router.push('/platform');

        return;
      }

      event.success(t.platform.sidebar.itemsDeleted);
      if (activeWorkspaceRef.current !== activeWorkspaceId) return;

      const shouldNavigate =
        !!threadIdParam &&
        (ids.has(threadIdParam) ||
          resolved.some((item) => item.type === 'folder' && containsThread(item, threadIdParam)));
      if (shouldNavigate) {
        router.push('/platform');
      }
    },
    [activeWorkspaceId, navItems, threadIdParam, router, reloadWorkspaceContent, t],
  );

  const handleBulkDeleteWorkspaces = useCallback(
    async (ids: Set<string>) => {
      const manageableIds = new Set([...ids].filter((id) => canManageWorkspace(workspaces, id)));
      const skippedCount = ids.size - manageableIds.size;
      if (manageableIds.size === 0) {
        if (skippedCount > 0) event.warning(t.platform.sidebar.workspacesDeleteSkipped);

        return;
      }

      const remaining = workspaces.filter((workspace) => !manageableIds.has(workspace.id));
      setWorkspaces(remaining);
      if (activeWorkspaceId && manageableIds.has(activeWorkspaceId)) {
        activateFirstWorkspace(remaining);
        router.push('/platform');
      }

      try {
        await deleteWorkspaces([...manageableIds]);
        if (skippedCount > 0) {
          event.warning(t.platform.sidebar.workspacesDeleteSkipped);
        } else {
          event.success(t.platform.sidebar.workspacesDeleted);
        }
      } catch (error) {
        event.error(error, { title: t.common.errorTitles.deleteFailed, context: 'sidebar.bulkDeleteWorkspaces' });
        await reloadWorkspaces();
      }
    },
    [workspaces, activeWorkspaceId, router, activateFirstWorkspace, reloadWorkspaces, t],
  );

  const handleMoveWorkspace = useCallback(
    async (id: string, position: number) => {
      const moved = workspaces.find((workspace) => workspace.id === id);
      if (!moved || workspaces.indexOf(moved) === position) return;

      const staying = workspaces.filter((workspace) => workspace.id !== id);
      const reordered = [...staying.slice(0, position), moved, ...staying.slice(position)];
      setWorkspaces(reordered);

      const failedWrite = await findFailedWrite(
        reordered.map((workspace, index) => moveWorkspace(workspace.id, index)),
      );
      if (!failedWrite) return;

      event.error(failedWrite.reason, { title: t.common.errorTitles.moveFailed, context: 'sidebar.moveWorkspace' });
      await reloadWorkspaces();
    },
    [workspaces, reloadWorkspaces, t],
  );

  const handleItemClick = useCallback(
    (id: string) => {
      const item = findInTree(navItems, id);
      if (item?.type === 'thread' && activeWorkspaceId) {
        router.push(`/platform/${activeWorkspaceId}/${id}`);
      }
    },
    [navItems, activeWorkspaceId, router],
  );

  const activeThread = threadIdParam ? findInTree(navItems, threadIdParam) : null;

  const clearEditingItemId = useCallback(() => {
    justCreatedIdsRef.current.clear();
    setEditingItemId(null);
  }, []);

  const clearEditingWorkspaceId = useCallback(() => {
    justCreatedIdsRef.current.clear();
    setEditingWorkspaceId(null);
  }, []);

  return {
    workspaces,
    activeWorkspaceId,
    navItems,
    activeThreadId: threadIdParam,
    activeThreadName: activeThread?.name ?? null,
    editingItemId,
    clearEditingItemId,
    editingWorkspaceId,
    clearEditingWorkspaceId,
    loading: loading || redirecting,
    onWorkspaceSelect: handleWorkspaceSelect,
    onCreateWorkspace: handleCreateWorkspace,
    onRenameWorkspace: handleRenameWorkspace,
    onDeleteWorkspace: handleDeleteWorkspace,
    onMoveWorkspace: handleMoveWorkspace,
    onCreateThread: handleCreateThread,
    onCreateFolder: handleCreateFolder,
    onDeleteItem: handleDeleteItem,
    onRenameItem: handleRenameItem,
    onItemClick: handleItemClick,
    onMoveItem: handleMoveItem,
    onBulkDelete: handleBulkDelete,
    onBulkMove: handleBulkMove,
    onBulkDeleteWorkspaces: handleBulkDeleteWorkspaces,
    invitations,
    onAcceptInvitation: handleAcceptInvitation,
    onDeclineInvitation: handleDeclineInvitation,
    reloadWorkspaces,
  };
};
