'use client';

import {
  CheckCircle,
  Copy,
  ExternalLink,
  Flag,
  Link2,
  MessageSquare,
  Pencil,
  Plus,
  Trash2,
  XCircle,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type ReactNode, useEffect, useRef } from 'react';

import { ECanvasNodeType, type ICanvasNodeData, type TCanvasContextMenu } from '@interfaces';
import { useClickOutside, useEscapeKey, useMenuKeyboardNavigation } from '@hooks';
import { useTranslations } from '@/i18n';
import { hasValidatedParent, isCanvasNodeData } from '@/lib/canvas';
import { useCanvasStore, usePermissionsStore } from '@/lib/stores';
import { canEditNode } from '@/lib/utils';

import { useViewportClamp } from '../hooks';
import { buildReferenceTargetUrl } from '../utils';
import { MenuDivider } from './MenuDivider';
import { MenuItem } from './MenuItem';

interface IContextMenuProps {
  menu: TCanvasContextMenu;
  onClose: () => void;
}

const joinSections = (sections: Record<string, ReactNode[]>): ReactNode[] =>
  Object.entries(sections)
    .filter(([, section]) => section.length > 0)
    .flatMap(([name, section], index) =>
      index === 0 ? section : [<MenuDivider key={`divider-${name}`} />, ...section],
    );

export const ContextMenu = ({ menu, onClose }: IContextMenuProps) => {
  const t = useTranslations();
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  const addNode = useCanvasStore((state) => state.addNode);
  const setReferenceSearchPosition = useCanvasStore((state) => state.setReferenceSearchPosition);
  const setNodeStatus = useCanvasStore((state) => state.setNodeStatus);
  const duplicateNode = useCanvasStore((state) => state.duplicateNode);
  const deleteNode = useCanvasStore((state) => state.deleteNode);
  const deleteEdge = useCanvasStore((state) => state.deleteEdge);
  const setOpenCommentsNodeId = useCanvasStore((state) => state.setOpenCommentsNodeId);
  const setEditingNodeId = useCanvasStore((state) => state.setEditingNodeId);
  const setNodeAnswer = useCanvasStore((state) => state.setNodeAnswer);

  const targetExists = useCanvasStore((state) => {
    if (menu.type === 'node') return state.nodes.some((node) => node.id === menu.nodeId);
    if (menu.type === 'edge') return state.edges.some((edge) => edge.id === menu.edgeId);

    return true;
  });

  useEscapeKey(onClose);
  useClickOutside(containerRef, onClose);

  const close = (action: () => void) => () => {
    action();
    onClose();
  };

  const { focusItem, handleKeyDown } = useMenuKeyboardNavigation(containerRef, { onClose });

  useEffect(() => {
    focusItem(0);
  }, [focusItem]);

  const renderPaneItems = (flowX: number, flowY: number): ReactNode[] => [
    <MenuItem
      key="add-node"
      icon={Plus}
      label={t.platform.canvas.context.addNode}
      shortcut="N"
      onClick={close(() => addNode({ x: flowX, y: flowY }, t.platform.canvas.node.defaultLabel))}
      accent="emerald"
    />,
    <MenuItem
      key="add-reference"
      icon={Link2}
      label={t.platform.canvas.context.addReference}
      shortcut="R"
      onClick={close(() => setReferenceSearchPosition({ x: flowX, y: flowY }))}
      accent="cyan"
    />,
  ];

  const renderEdgeItems = (edgeId: string): ReactNode[] => [
    <MenuItem
      key="delete-edge"
      icon={Trash2}
      label={t.platform.canvas.context.deleteEdge}
      onClick={close(() => deleteEdge(edgeId))}
      accent="red"
    />,
  ];

  const renderReferenceItems = (nodeId: string, targetUrl: string | null, canEdit: boolean): ReactNode[] => {
    const { canEditCanvas } = usePermissionsStore.getState();

    return joinSections({
      navigate: targetUrl
        ? [
            <MenuItem
              key="open-referenced"
              icon={ExternalLink}
              label={t.platform.canvas.context.openReferenced}
              onClick={close(() => router.push(targetUrl))}
              accent="cyan"
            />,
          ]
        : [],
      remove: canEditCanvas
        ? [
            <MenuItem
              key="delete-reference"
              icon={Trash2}
              label={t.platform.canvas.context.deleteReference}
              onClick={close(() => deleteNode(nodeId))}
              accent="red"
              disabled={!canEdit}
              hint={t.platform.canvas.context.deleteNotAllowed}
            />,
          ]
        : [],
    });
  };

  const renderQuestionItems = (nodeId: string, canEdit: boolean): ReactNode[] =>
    canEdit
      ? [
          <MenuItem
            key="edit-question"
            icon={Pencil}
            label={t.platform.canvas.question.editLabel}
            onClick={close(() => setEditingNodeId(nodeId))}
          />,
        ]
      : [];

  const renderVerdictItems = (
    nodeId: string,
    { status, isAnswer }: ICanvasNodeData,
    validatedParent: boolean,
  ): ReactNode[] => [
    <MenuItem
      key="mark-valid"
      icon={CheckCircle}
      label={status === 'valid' ? t.platform.canvas.context.unmarkValid : t.platform.canvas.context.markValid}
      shortcut="Y"
      onClick={close(() => setNodeStatus(nodeId, 'valid'))}
      accent="emerald"
      disabled={status !== 'valid' && !validatedParent}
      hint={t.platform.canvas.context.needsValidParent}
    />,
    <MenuItem
      key="mark-invalid"
      icon={XCircle}
      label={status === 'invalid' ? t.platform.canvas.context.unmarkInvalid : t.platform.canvas.context.markInvalid}
      shortcut="X"
      onClick={close(() => setNodeStatus(nodeId, 'invalid'))}
      accent="red"
    />,
    <MenuItem
      key="mark-answer"
      icon={Flag}
      label={isAnswer ? t.platform.canvas.context.unmarkAnswer : t.platform.canvas.context.markAnswer}
      shortcut="A"
      onClick={close(() => setNodeAnswer(nodeId))}
      disabled={!isAnswer && !validatedParent}
      hint={t.platform.canvas.context.needsValidParent}
    />,
  ];

  const renderCanvasNodeItems = (nodeId: string, data: ICanvasNodeData, canEdit: boolean): ReactNode[] => {
    const { nodes, edges } = useCanvasStore.getState();
    const { canEditCanvas, canComment } = usePermissionsStore.getState();

    return joinSections({
      actions: [
        ...(canEditCanvas ? renderVerdictItems(nodeId, data, hasValidatedParent(nodeId, nodes, edges)) : []),
        ...(canComment
          ? [
              <MenuItem
                key="comment"
                icon={MessageSquare}
                label={t.platform.canvas.context.comment}
                onClick={close(() => setOpenCommentsNodeId(nodeId))}
              />,
            ]
          : []),
      ],
      duplicate: canEditCanvas
        ? [
            <MenuItem
              key="duplicate"
              icon={Copy}
              label={t.platform.canvas.context.duplicate}
              onClick={close(() => duplicateNode(nodeId))}
            />,
          ]
        : [],
      remove: canEditCanvas
        ? [
            <MenuItem
              key="delete"
              icon={Trash2}
              label={t.platform.canvas.context.delete}
              shortcut="⌫"
              onClick={close(() => deleteNode(nodeId))}
              accent="red"
              disabled={!canEdit}
              hint={t.platform.canvas.context.deleteNotAllowed}
            />,
          ]
        : [],
    });
  };

  const renderNodeItems = (nodeId: string): ReactNode[] => {
    const node = useCanvasStore.getState().nodes.find((node) => node.id === nodeId);
    if (!node) return [];

    const canEdit = canEditNode(node.data.createdBy, usePermissionsStore.getState());

    if (node.type === ECanvasNodeType.Reference) {
      return renderReferenceItems(nodeId, buildReferenceTargetUrl(node.data), canEdit);
    }

    if (node.type === ECanvasNodeType.Question) return renderQuestionItems(nodeId, canEdit);
    if (!isCanvasNodeData(node.data)) return [];

    return renderCanvasNodeItems(nodeId, node.data, canEdit);
  };

  const renderItems = (): ReactNode[] => {
    if (menu.type === 'pane') return renderPaneItems(menu.flowX, menu.flowY);
    if (menu.type === 'edge') return renderEdgeItems(menu.edgeId);

    return renderNodeItems(menu.nodeId);
  };

  const items = renderItems();
  const isEmpty = items.length === 0;

  useViewportClamp(containerRef, { x: menu.x, y: menu.y }, !isEmpty);

  useEffect(() => {
    if (!targetExists || isEmpty) onClose();
  }, [targetExists, isEmpty, onClose]);

  if (isEmpty) return null;

  return (
    <div
      ref={containerRef}
      role="menu"
      tabIndex={-1}
      aria-label={t.platform.canvas.context.ariaLabel}
      onKeyDown={handleKeyDown}
      className="fixed z-50 flex w-56 animate-rise-down flex-col rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-1 font-grotesk text-[color:var(--text)] shadow-[var(--shadow-modal)] outline-none select-none motion-reduce:animate-none"
    >
      {items}
    </div>
  );
};
