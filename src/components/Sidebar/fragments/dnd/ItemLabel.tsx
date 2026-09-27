'use client';

import type { KeyboardEvent } from 'react';

import { SmartTooltip } from '@/components/Tooltip';

import { InlineRenameInput } from './InlineRenameInput';

interface IItemLabelProps {
  name: string;
  isEditing: boolean;
  editValue: string;
  setEditValue: (value: string) => void;
  inputRef: (element: HTMLInputElement | null) => void;
  commitRename: () => void;
  handleKeyDown: (event: KeyboardEvent) => void;
}

export const ItemLabel = ({
  name,
  isEditing,
  editValue,
  setEditValue,
  inputRef,
  commitRename,
  handleKeyDown,
}: IItemLabelProps) =>
  isEditing ? (
    <InlineRenameInput
      value={editValue}
      onChange={setEditValue}
      onCommit={commitRename}
      onKeyDown={handleKeyDown}
      inputRef={inputRef}
    />
  ) : (
    <SmartTooltip content={name} className="truncate" onlyIfTruncated>
      {name}
    </SmartTooltip>
  );
