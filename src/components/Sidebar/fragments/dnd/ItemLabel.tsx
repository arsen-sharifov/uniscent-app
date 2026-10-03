'use client';

import type { IInlineEdit } from '@interfaces';

import { SmartTooltip } from '@/components/Tooltip';

import { InlineRenameInput } from './InlineRenameInput';

interface IItemLabelProps {
  name: string;
  isEditing: boolean;
  edit: IInlineEdit;
}

export const ItemLabel = ({ name, isEditing, edit }: IItemLabelProps) =>
  isEditing ? (
    <InlineRenameInput
      value={edit.editValue}
      onChange={edit.setEditValue}
      onCommit={edit.commitRename}
      onKeyDown={edit.handleKeyDown}
      inputRef={edit.inputRef}
    />
  ) : (
    <SmartTooltip content={name} className="truncate" onlyIfTruncated>
      {name}
    </SmartTooltip>
  );
