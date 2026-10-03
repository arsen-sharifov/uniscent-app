'use client';

import { clsx } from 'clsx';
import { ChevronsUpDown, LayoutGrid, Plus } from 'lucide-react';
import { useRef, useState, type MouseEvent } from 'react';

import type { IInlineEdit, IMyInvitation, IWorkspaceItem } from '@interfaces';

import { getInitials } from '@/components/Avatar';
import { Popover } from '@/components/Popover';
import { useTranslations } from '@/i18n';

import { InvitationCard } from './InvitationCard';
import { WorkspaceItems } from './WorkspaceItems';
import { BulkActionsBar } from '../actions/BulkActionsBar';

interface IWorkspaceSwitcherProps {
  workspaces: IWorkspaceItem[];
  activeWorkspaceId?: string;
  selectedIds: Set<string>;
  edit: IInlineEdit;
  onWorkspaceClick: (id: string, event: MouseEvent) => void;
  onCreateWorkspace?: () => void;
  onRequestDelete: (id: string, name: string) => void;
  onRequestSettings: (id: string) => void;
  onMoveWorkspace?: (id: string, position: number) => void;
  onBulkDelete: () => void;
  onClearSelection: () => void;
  invitations?: IMyInvitation[];
  onAcceptInvitation?: (invitation: IMyInvitation) => void;
  onDeclineInvitation?: (invitation: IMyInvitation) => void;
}

export const WorkspaceSwitcher = ({
  workspaces,
  activeWorkspaceId,
  selectedIds,
  edit,
  onWorkspaceClick,
  onCreateWorkspace,
  onRequestDelete,
  onRequestSettings,
  onMoveWorkspace,
  onBulkDelete,
  onClearSelection,
  invitations = [],
  onAcceptInvitation,
  onDeclineInvitation,
}: IWorkspaceSwitcherProps) => {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const active = workspaces.find((workspace) => workspace.id === activeWorkspaceId);
  const canDeleteSelection = workspaces.some(
    (workspace) => workspace.canManageWorkspace && selectedIds.has(workspace.id),
  );

  return (
    <Popover
      open={open || edit.editingId !== null}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          setOpen(true);

          return;
        }
        if (edit.editingId !== null) edit.cancelEditing();
        if (selectedIds.size > 0) onClearSelection();
        setOpen(false);
      }}
      placement="bottom-start"
      offset={6}
      panelClassName="w-60 max-h-[60vh] overflow-y-auto [scrollbar-width:thin]"
      renderTrigger={(trigger) => (
        <button
          type="button"
          {...trigger}
          ref={(element) => {
            trigger.ref(element);
            triggerRef.current = element;
          }}
          data-tour="sidebarWorkspaceSwitcher"
          className={clsx(
            'group flex w-full min-w-0 cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-[color:var(--ring-focus)] focus-visible:outline-none active:bg-[color:var(--accent-soft)] motion-reduce:transition-none',
            open
              ? 'bg-[color:var(--surface-overlay)] ring-1 ring-[color:var(--border)] ring-inset'
              : 'hover:bg-[color:var(--surface-overlay)]',
          )}
        >
          <span
            aria-hidden
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[color:var(--accent-soft)] font-mono-ui text-[11px] font-bold text-[color:var(--accent-text)] uppercase ring-1 ring-[color:var(--border-strong)]"
          >
            {active ? getInitials(active.name) : <LayoutGrid className="h-3.5 w-3.5" strokeWidth={2} />}
          </span>
          <span
            className={clsx(
              'min-w-0 flex-1 truncate font-grotesk text-sm font-semibold',
              active ? 'text-[color:var(--text-strong)]' : 'text-[color:var(--text-muted)]',
            )}
            title={active?.name ?? t.platform.sidebar.noWorkspaceSelected}
          >
            {active?.name ?? t.platform.sidebar.noWorkspaceSelected}
          </span>
          <ChevronsUpDown
            className={clsx(
              'h-3.5 w-3.5 shrink-0 transition-colors duration-150 group-hover:text-[color:var(--text-strong)] motion-reduce:transition-none',
              open ? 'text-[color:var(--accent-text)]' : 'text-[color:var(--text-subtle)]',
            )}
          />
        </button>
      )}
    >
      {invitations.length > 0 && (
        <div className="border-b border-[color:var(--border)] px-2 py-2">
          <span className="mb-1.5 block px-1 font-mono-ui text-[10px] font-bold tracking-[0.14em] text-[color:var(--text-label)] uppercase">
            {t.platform.sidebar.invitations.title}
          </span>
          <div className="space-y-1.5">
            {invitations.map((invitation) => (
              <InvitationCard
                key={invitation.id}
                invitation={invitation}
                onAccept={() => {
                  onAcceptInvitation?.(invitation);
                  setOpen(false);
                }}
                onDecline={() => onDeclineInvitation?.(invitation)}
              />
            ))}
          </div>
        </div>
      )}

      <div
        data-tour="sidebarWorkspacePanel"
        className="flex items-center justify-between gap-2 border-b border-[color:var(--border)] px-3 py-2"
      >
        <span
          className="flex min-w-0 items-center gap-1.5 font-mono-ui text-[10px] font-bold tracking-[0.14em] text-[color:var(--text-label)] uppercase"
          title={t.platform.sidebar.workspaces}
        >
          <span className="truncate">{t.platform.sidebar.workspaces}</span>
          <span className="tabular-nums">{workspaces.length}</span>
        </span>
        <button
          type="button"
          data-tour="sidebarWorkspaceCreate"
          onClick={() => onCreateWorkspace?.()}
          className="flex shrink-0 cursor-pointer items-center gap-1 rounded-lg px-1.5 py-1 font-grotesk text-[11px] font-medium whitespace-nowrap text-[color:var(--accent-text)] transition-colors duration-150 hover:bg-[color:var(--accent-soft)] focus-visible:ring-2 focus-visible:ring-[color:var(--ring-focus)] focus-visible:outline-none active:bg-[color:var(--accent-soft)] motion-reduce:transition-none"
          title={t.platform.sidebar.newWorkspace}
        >
          <Plus className="h-3 w-3" />
          {t.platform.sidebar.newWorkspace}
        </button>
      </div>

      <div className="space-y-0.5 px-2 py-2">
        {workspaces.length === 0 ? (
          <div className="flex flex-col items-center px-3 py-6 text-center">
            <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl border border-[color:var(--border-active)] bg-[color:var(--accent-soft)]">
              <LayoutGrid className="h-4 w-4 text-[color:var(--accent-text)]" />
            </div>
            <p className="mb-3 font-grotesk text-xs text-[color:var(--text-muted)]">
              {t.platform.sidebar.noWorkspaces}
            </p>
            <button
              type="button"
              data-tour="sidebarWorkspaceCreate"
              onClick={() => onCreateWorkspace?.()}
              className="cursor-pointer rounded-lg bg-[color:var(--accent)] px-3 py-1.5 font-grotesk text-xs font-semibold text-[color:var(--on-accent)] shadow-[0_10px_28px_-12px_var(--accent-glow)] transition-colors duration-150 hover:bg-[color:var(--accent-strong)] focus-visible:ring-2 focus-visible:ring-[color:var(--ring-focus)] focus-visible:outline-none active:bg-[color:var(--accent-strong)] motion-reduce:transition-none"
            >
              {t.platform.sidebar.newWorkspace}
            </button>
          </div>
        ) : (
          <WorkspaceItems
            workspaces={workspaces}
            activeWorkspaceId={activeWorkspaceId}
            selectedIds={selectedIds}
            edit={edit}
            onClick={(id, event) => {
              onWorkspaceClick(id, event);
              if (!event.shiftKey && !event.ctrlKey && !event.metaKey) setOpen(false);
            }}
            onRequestDelete={onRequestDelete}
            onRequestSettings={(id) => {
              triggerRef.current?.focus();
              onRequestSettings(id);
              setOpen(false);
            }}
            onMove={(id, position) => onMoveWorkspace?.(id, position)}
          />
        )}
      </div>

      {selectedIds.size > 0 && (
        <div className="border-t border-[color:var(--border)] px-2 py-2">
          <BulkActionsBar
            count={selectedIds.size}
            icon={LayoutGrid}
            label={t('platform.sidebar.workspacesSelected', { count: selectedIds.size })}
            onDelete={canDeleteSelection ? onBulkDelete : undefined}
            onClear={onClearSelection}
          />
        </div>
      )}
    </Popover>
  );
};
