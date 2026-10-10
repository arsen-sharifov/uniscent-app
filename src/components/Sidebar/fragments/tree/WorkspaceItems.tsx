'use client';

import {
  DndContext,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useCallback, useState, type MouseEvent } from 'react';

import type { IInlineEdit, IWorkspaceItem, TWorkspaceDropZone } from '@interfaces';

import { KEYBOARD_SENSOR_OPTIONS, POINTER_SENSOR_OPTIONS } from '../../consts';
import { resolveKeyboardDropZone } from '../../utils';
import { SortableWorkspaceItem } from '../dnd/SortableWorkspaceItem';

interface IWorkspaceItemsProps {
  workspaces: IWorkspaceItem[];
  activeWorkspaceId?: string;
  selectedIds: Set<string>;
  edit: IInlineEdit;
  onClick: (id: string, event: MouseEvent) => void;
  onRequestDelete: (id: string, name: string) => void;
  onRequestSettings: (id: string) => void;
  onMove: (id: string, position: number) => void;
}

export const WorkspaceItems = ({
  workspaces,
  activeWorkspaceId,
  selectedIds,
  edit,
  onClick,
  onRequestDelete,
  onRequestSettings,
  onMove,
}: IWorkspaceItemsProps) => {
  const sensors = useSensors(
    useSensor(PointerSensor, POINTER_SENSOR_OPTIONS),
    useSensor(KeyboardSensor, KEYBOARD_SENSOR_OPTIONS),
  );

  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [zone, setZone] = useState<TWorkspaceDropZone>('before');

  const resolveTargetIndex = useCallback(
    (movedId: string, targetId: string, dropZone: TWorkspaceDropZone): number | null => {
      const overIndex = workspaces
        .filter((workspace) => workspace.id !== movedId)
        .findIndex(({ id }) => id === targetId);
      if (overIndex === -1) return null;

      const targetIndex = dropZone === 'before' ? overIndex : overIndex + 1;

      return targetIndex === workspaces.findIndex(({ id }) => id === movedId) ? null : targetIndex;
    },
    [workspaces],
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    setOverId(null);
  }, []);

  const handleDragMove = useCallback(
    (event: DragMoveEvent) => {
      const { active, over, activatorEvent, delta } = event;
      if (!over) {
        setOverId(null);

        return;
      }
      setOverId(over.id as string);
      if (!('clientY' in activatorEvent)) {
        setZone(resolveKeyboardDropZone(workspaces, active.id as string, over.id as string));

        return;
      }
      const pointerY = (activatorEvent as PointerEvent).clientY + delta.y;
      const midY = over.rect.top + over.rect.height / 2;
      setZone(pointerY < midY ? 'before' : 'after');
    },
    [workspaces],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);
      setOverId(null);
      if (!over || active.id === over.id) return;

      const targetIndex = resolveTargetIndex(active.id as string, over.id as string, zone);
      if (targetIndex !== null) onMove(active.id as string, targetIndex);
    },
    [zone, resolveTargetIndex, onMove],
  );

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
    setOverId(null);
  }, []);

  const getDropIndicator = (id: string): TWorkspaceDropZone | null => {
    if (!activeId || !overId || id !== overId || id === activeId) return null;

    return resolveTargetIndex(activeId, overId, zone) === null ? null : zone;
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext items={workspaces.map((workspace) => workspace.id)} strategy={verticalListSortingStrategy}>
        {workspaces.map((workspace) => (
          <SortableWorkspaceItem
            key={workspace.id}
            workspace={workspace}
            isActive={workspace.id === activeWorkspaceId}
            isSelected={selectedIds.has(workspace.id)}
            edit={edit}
            onClick={onClick}
            onRequestDelete={onRequestDelete}
            onRequestSettings={onRequestSettings}
            isDragActive={activeId !== null}
            dropIndicator={getDropIndicator(workspace.id)}
          />
        ))}
      </SortableContext>
    </DndContext>
  );
};
