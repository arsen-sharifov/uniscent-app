export const buildReferenceUrl = (workspaceId: string, threadId: string, nodeId?: string): string | null => {
  if (!workspaceId || !threadId) return null;

  const params = new URLSearchParams({ focus: 'ref' });
  if (nodeId) params.set('node', nodeId);

  return `/platform/${encodeURIComponent(workspaceId)}/${encodeURIComponent(threadId)}?${params.toString()}`;
};

export const buildReferenceTargetUrl = ({
  sourceWorkspaceId,
  sourceThreadId,
  sourceNodeId,
}: Record<string, unknown>): string | null => {
  if (typeof sourceWorkspaceId !== 'string' || typeof sourceThreadId !== 'string') return null;
  if (typeof sourceNodeId !== 'string' || !sourceNodeId) return null;

  return buildReferenceUrl(sourceWorkspaceId, sourceThreadId, sourceNodeId);
};
