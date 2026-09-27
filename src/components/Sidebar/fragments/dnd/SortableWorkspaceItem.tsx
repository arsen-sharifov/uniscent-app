'use client';

import { useSortable } from '@dnd-kit/sortable';
import { clsx } from 'clsx';
import { LayoutGrid, Pencil, Settings, Trash2 } from 'lucide-react';
import type { KeyboardEvent, MouseEvent } from 'react';

import type { IWorkspaceItem, TWorkspaceDropZone } from '@interfaces';

import { SelectionStrip } from '@/components/SelectionStrip';
import { useTranslations } from '@/i18n';

import { DropLineIndicator } from './DropLineIndicator';
import { GripActivator } from './GripActivator';
import { ItemActionButton } from './ItemActionButton';
import { ItemActionsToolbar } from './ItemActionsToolbar';
import { ItemIcon } from './ItemIcon';
import { ItemLabel } from './ItemLabel';
import { ItemRowButton } from './ItemRowButton';
import { SelectedCheck } from './SelectedCheck';
import { getDragTransformStyle } from '../../utils';

interface ISortableWorkspaceItemProps {
  workspace: IWorkspaceItem;
  isActive: boolean;
  isSelected: boolean;
  isEditing: boolean;
  editValue: string;
  setEditValue: (value: string) => void;
  inputRef: (element: HTMLInputElement | null) => void;
  commitRename: () => void;
  handleKeyDown: (event: KeyboardEvent) => void;
  onClick: (id: string, event: MouseEvent) => void;
  onRequestRename: (id: string, name: string) => void;
  onRequestDelete: (id: string, name: string) => void;
  onRequestSettings: (id: string) => void;
  isDragActive: boolean;
  dropIndicator: TWorkspaceDropZone | null;
}

export const SortableWorkspaceItem = ({
  workspace,
  isActive,
  isSelected,
  isEditing,
  editValue,
  setEditValue,
  inputRef,
  commitRename,
  handleKeyDown,
  onClick,
  onRequestRename,
  onRequestDelete,
  onRequestSettings,
  isDragActive,
  dropIndicator,
}: ISortableWorkspaceItemProps) => {
  const translations = useTranslations();
  const isLocked = !workspace.canManageWorkspace;
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: workspace.id,
    disabled: isEditing,
  });

  const handleClick = (event: MouseEvent) => onClick(workspace.id, event);

  return (
    <div
      ref={setNodeRef}
      style={getDragTransformStyle(transform, transition, isDragActive)}
      data-workspace-id={workspace.id}
      data-tour={isActive ? 'sidebarWorkspaceRow' : undefined}
      className="group/item relative"
    >
      {dropIndicator && <DropLineIndicator position={dropIndicator} />}

      {isActive && <SelectionStrip className="z-10" />}

      <div
        className={clsx(
          'relative flex min-h-7 min-w-0 items-stretch overflow-hidden',
          isDragging && 'pointer-events-none rounded-lg opacity-40 shadow-[var(--shadow-card-hover)]',
        )}
      >
        <ItemRowButton
          isActive={isActive}
          isSelected={isSelected}
          onClick={handleClick}
          className="cursor-pointer px-1.5 py-1"
        >
          <ItemIcon icon={LayoutGrid} isHighlighted={isActive} hidesOnHover={!isEditing} />
          <ItemLabel
            name={workspace.name}
            isEditing={isEditing}
            editValue={editValue}
            setEditValue={setEditValue}
            inputRef={inputRef}
            commitRename={commitRename}
            handleKeyDown={handleKeyDown}
          />
          {isSelected && !isEditing && <SelectedCheck />}
        </ItemRowButton>

        {!isEditing && (
          <GripActivator
            setActivatorRef={setActivatorNodeRef}
            attributes={attributes}
            listeners={listeners}
            isActive={isActive}
            ariaLabel={translations.platform.sidebar.dragToReorder}
            onClick={handleClick}
            className="left-1.5"
          />
        )}

        {!isDragging && !isEditing && (
          <ItemActionsToolbar isActive={isActive} isSelected={isSelected}>
            <ItemActionButton
              icon={Settings}
              tone="neutral"
              title={translations.platform.sidebar.workspaceSettings}
              tour={isActive ? 'sidebarWorkspaceRowSettings' : undefined}
              onClick={() => onRequestSettings(workspace.id)}
            />
            <ItemActionButton
              icon={Pencil}
              tone="neutral"
              title={translations.platform.sidebar.rename}
              isLocked={isLocked}
              onClick={() => onRequestRename(workspace.id, workspace.name)}
            />
            <ItemActionButton
              icon={Trash2}
              tone="danger"
              title={translations.platform.sidebar.delete}
              isLocked={isLocked}
              onClick={() => onRequestDelete(workspace.id, workspace.name)}
            />
          </ItemActionsToolbar>
        )}
      </div>
    </div>
  );
};
