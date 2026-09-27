'use client';

import { clsx } from 'clsx';
import { Check, ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';

import type { IWorkspaceRole } from '@interfaces';

import { SelectionStrip } from '@/components';
import { useTranslations } from '@/i18n';
import { roleLabel } from '@/lib/utils';

import { RoleIcon } from './RoleIcon';

interface IRoleSelectProps {
  value: string;
  roles: IWorkspaceRole[];
  onChange: (roleId: string) => void;
  ariaLabel: string;
  className?: string;
}

export const RoleSelect = ({ value, roles, onChange, ariaLabel, className }: IRoleSelectProps) => {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const selected = roles.find((role) => role.id === value) ?? roles[0];
  const selectedLabel = selected ? roleLabel(selected.key, selected.name, t) : '';

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    window.addEventListener('keydown', onKeyDown, true);

    const options = menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]');
    const selectedIndex = roles.findIndex((role) => role.id === value);
    options?.[Math.max(selectedIndex, 0)]?.focus();

    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown, true);
    };
  }, [open, roles, value]);

  const select = (roleId: string) => {
    onChange(roleId);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const handleMenuKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const options = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]') ?? []);

    if (options.length === 0) return;

    const currentIndex = options.indexOf(document.activeElement as HTMLButtonElement);

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      options[(currentIndex + 1) % options.length]?.focus();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      options[(currentIndex - 1 + options.length) % options.length]?.focus();
    } else if (event.key === 'Tab') {
      setOpen(false);
    }
  };

  return (
    <div ref={wrapperRef} className={clsx('relative', className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={selectedLabel ? `${ariaLabel}: ${selectedLabel}` : ariaLabel}
        className={clsx(
          'flex w-full cursor-pointer items-center gap-1.5 rounded-lg border bg-[color:var(--surface-soft)] px-2.5 py-1.5 font-grotesk text-xs font-medium transition-[border-color,background-color] duration-150 focus-visible:ring-2 focus-visible:ring-[color:var(--ring-focus)] focus-visible:outline-none motion-reduce:transition-none',
          open
            ? 'border-[color:var(--accent)]'
            : 'border-[color:var(--border-strong)] hover:border-[color:var(--text-subtle)] active:border-[color:var(--accent)]',
        )}
      >
        {selected && <RoleIcon role={selected} className="h-3.5 w-3.5 shrink-0 text-[color:var(--accent-text)]" />}
        <span className="min-w-0 flex-1 truncate text-left text-[color:var(--text-strong)]">{selectedLabel}</span>
        <ChevronDown
          className={clsx(
            'h-3.5 w-3.5 shrink-0 text-[color:var(--text-subtle)] transition-transform duration-200 motion-reduce:transition-none',
            open && 'rotate-180',
          )}
          aria-hidden
        />
      </button>

      {open && (
        <div
          ref={menuRef}
          role="listbox"
          tabIndex={-1}
          aria-label={ariaLabel}
          onKeyDown={handleMenuKeyDown}
          className="absolute top-full left-0 z-20 mt-1 max-h-56 min-w-full overflow-y-auto rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-1 shadow-[var(--shadow-modal)] outline-none"
        >
          {roles.map((role) => {
            const isSelected = role.id === value;

            return (
              <button
                key={role.id}
                type="button"
                role="option"
                aria-selected={isSelected}
                tabIndex={-1}
                onClick={() => select(role.id)}
                className={clsx(
                  'relative flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-grotesk text-xs font-medium transition-colors duration-150 focus:ring-2 focus:ring-[color:var(--ring-focus)] focus:outline-none motion-reduce:transition-none',
                  isSelected
                    ? 'bg-[color:var(--accent-soft)] pl-3.5 text-[color:var(--accent-text)]'
                    : 'text-[color:var(--text)] hover:bg-[color:var(--surface-overlay)] focus:bg-[color:var(--surface-overlay)]',
                )}
              >
                {isSelected && <SelectionStrip />}
                <RoleIcon
                  role={role}
                  className={clsx(
                    'h-3.5 w-3.5 shrink-0',
                    isSelected ? 'text-[color:var(--accent-text)]' : 'text-[color:var(--text-muted)]',
                  )}
                />
                <span className="min-w-0 flex-1 truncate">{roleLabel(role.key, role.name, t)}</span>
                {isSelected && <Check className="h-3.5 w-3.5 shrink-0" aria-hidden />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
