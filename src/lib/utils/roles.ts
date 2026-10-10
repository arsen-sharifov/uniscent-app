import type { Node } from '@xyflow/react';

import { ECanvasNodeType, type INodeEditAccess, type TTranslations, type TWorkspaceRoleKey } from '@interfaces';

export const roleLabel = (key: TWorkspaceRoleKey | null, name: string, t: TTranslations): string =>
  key ? t.platform.workspaceSettings.roleNames[key] : name;

export const canEditNode = (createdBy: unknown, access: INodeEditAccess): boolean =>
  access.canEditCanvas && (access.isOwner || createdBy === access.userId);

export const canDeleteNode = (node: Node, access: INodeEditAccess): boolean =>
  node.type !== ECanvasNodeType.Question && canEditNode(node.data.createdBy, access);
