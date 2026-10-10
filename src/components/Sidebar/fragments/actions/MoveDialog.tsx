'use client';

import { Folder, FolderOpen, Home } from 'lucide-react';
import { useId, useState, useMemo } from 'react';

import type { TNavItem } from '@interfaces';

import { Modal } from '@/components/Modal';
import { useTranslations } from '@/i18n';

import { MoveTargetOption } from './MoveTargetOption';
import { MAX_DEPTH } from '../../consts';
import { flattenTree, getMaxSubtreeDepth, removeChildrenOf } from '../../utils';

interface IMoveDialogProps {
  open: boolean;
  items: TNavItem[];
  selectedIds: Set<string>;
  onMove: (targetParentId: string | null) => void;
  onCancel: () => void;
}

export const MoveDialog = ({ open, items, selectedIds, onMove, onCancel }: IMoveDialogProps) => {
  const t = useTranslations();
  const titleId = useId();
  const [targetId, setTargetId] = useState<string | null>(null);

  const folders = useMemo(() => {
    const movedDepth = getMaxSubtreeDepth(items, selectedIds);

    return removeChildrenOf(flattenTree(items, new Set()), selectedIds).filter(
      (item) => item.type === 'folder' && !selectedIds.has(item.id) && item.depth + 1 + movedDepth <= MAX_DEPTH,
    );
  }, [items, selectedIds]);

  const handleConfirm = () => {
    onMove(targetId);
    setTargetId(null);
  };

  const handleCancel = () => {
    setTargetId(null);
    onCancel();
  };

  return (
    <Modal open={open} onClose={handleCancel} className="!rounded-xl" labelledBy={titleId}>
      <div className="p-6">
        <h2 id={titleId} className="mb-4 font-grotesk text-lg font-semibold text-[color:var(--text-strong)]">
          {t.platform.sidebar.moveToFolder}
        </h2>

        <div className="mb-4 max-h-60 space-y-0.5 overflow-y-auto rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-1.5">
          <MoveTargetOption
            icon={Home}
            label={t.platform.sidebar.rootLevel}
            depth={0}
            selected={targetId === null}
            onSelect={() => setTargetId(null)}
          />

          {folders.map((folder) => (
            <MoveTargetOption
              key={folder.id}
              icon={targetId === folder.id ? FolderOpen : Folder}
              label={folder.name}
              depth={folder.depth}
              selected={targetId === folder.id}
              onSelect={() => setTargetId(folder.id)}
            />
          ))}
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={handleCancel}
            className="cursor-pointer rounded-lg border border-[color:var(--border-strong)] px-4 py-2 font-grotesk text-sm font-medium text-[color:var(--text-muted)] transition-colors duration-150 hover:bg-[color:var(--surface-overlay)] hover:text-[color:var(--text-strong)] focus-visible:ring-2 focus-visible:ring-[color:var(--ring-focus)] focus-visible:outline-none active:bg-[color:var(--surface-overlay)] active:text-[color:var(--text-strong)] motion-reduce:transition-none"
          >
            {t.platform.sidebar.cancel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="cursor-pointer rounded-lg bg-[color:var(--accent)] px-4 py-2 font-grotesk text-sm font-medium text-[color:var(--on-accent)] shadow-[0_10px_28px_-12px_var(--accent-glow)] transition-colors duration-150 hover:bg-[color:var(--accent-strong)] focus-visible:ring-2 focus-visible:ring-[color:var(--ring-focus)] focus-visible:outline-none active:bg-[color:var(--accent-strong)] motion-reduce:transition-none"
          >
            {t.platform.sidebar.move}
          </button>
        </div>
      </div>
    </Modal>
  );
};
