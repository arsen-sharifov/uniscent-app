'use client';

import { useCallback, useState, type KeyboardEvent } from 'react';

import type { IInlineEdit, IUseInlineEditOptions } from '@interfaces';

export const useInlineEdit = ({
  items,
  autoEditId,
  onAutoEditHandled,
  onRename,
  findItem,
}: IUseInlineEditOptions): IInlineEdit => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [originalName, setOriginalName] = useState('');
  const [previousAutoEditId, setPreviousAutoEditId] = useState<string | null>(null);

  const nextAutoEditId = autoEditId ?? null;
  if (nextAutoEditId !== previousAutoEditId) {
    setPreviousAutoEditId(nextAutoEditId);
    const match =
      nextAutoEditId && (findItem ? findItem(nextAutoEditId) : items.find(({ id }) => id === nextAutoEditId));
    if (match) {
      setEditingId(match.id);
      setEditValue(match.name);
      setOriginalName(match.name);
    }
  }

  const inputRef = useCallback((element: HTMLInputElement | null) => {
    if (element) {
      element.focus();
      element.select();
    }
  }, []);

  const startEditing = useCallback((id: string, name: string) => {
    setEditingId(id);
    setEditValue(name);
    setOriginalName(name);
  }, []);

  const commitRename = useCallback(() => {
    const name = editValue.trim();
    if (editingId && name && name !== originalName) {
      onRename?.(editingId, name);
    }
    setEditingId(null);
    onAutoEditHandled?.();
  }, [editingId, editValue, originalName, onRename, onAutoEditHandled]);

  const cancelEditing = useCallback(() => {
    setEditingId(null);
    onAutoEditHandled?.();
  }, [onAutoEditHandled]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Enter') commitRename();
      if (event.key === 'Escape') cancelEditing();
    },
    [commitRename, cancelEditing],
  );

  return {
    editingId,
    editValue,
    setEditValue,
    inputRef,
    startEditing,
    commitRename,
    cancelEditing,
    handleKeyDown,
  };
};
