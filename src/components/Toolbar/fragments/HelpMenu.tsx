'use client';

import { HelpCircle } from 'lucide-react';
import { useEffect } from 'react';

import type { THelpMenuAction } from '@interfaces';

import { useTranslations } from '@/i18n';
import { useOnboardingStore } from '@/lib/onboarding';

import { HELP_MENU_ITEMS, ICON_STROKE } from '../consts';
import { useToolbarMenu } from '../hooks';

interface IHelpMenuProps {
  onShortcuts: () => void;
}

export const HelpMenu = ({ onShortcuts }: IHelpMenuProps) => {
  const t = useTranslations();
  const openPicker = useOnboardingStore((state) => state.openPicker);
  const { open, menuId, rootRef, buttonRef, menuRef, toggle, handleKeyDown, close } = useToolbarMenu();

  const actions: Record<THelpMenuAction, () => void> = { shortcuts: onShortcuts, guides: openPicker };

  useEffect(() => {
    if (open) useOnboardingStore.getState().dismissHint();
  }, [open]);

  return (
    <div ref={rootRef} className="relative flex justify-center">
      <button
        ref={buttonRef}
        type="button"
        data-tour="toolbarHelp"
        aria-label={t.platform.onboarding.menuLabel}
        title={t.platform.onboarding.menuLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={toggle}
        onKeyDown={handleKeyDown}
        className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-[color:var(--text-muted)] transition-[background-color,color,transform] duration-200 ease-out outline-none hover:bg-[color:var(--surface-overlay)] hover:text-[color:var(--text)] focus-visible:ring-2 focus-visible:ring-[color:var(--ring-focus)] focus-visible:ring-offset-1 focus-visible:ring-offset-[color:var(--surface)] active:scale-[0.94] motion-reduce:transition-none"
      >
        <HelpCircle className="h-[17px] w-[17px]" strokeWidth={ICON_STROKE} />
      </button>

      {open && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          tabIndex={-1}
          aria-label={t.platform.onboarding.menuLabel}
          onKeyDown={handleKeyDown}
          className="absolute right-full bottom-0 z-50 mr-3 w-56 max-w-[calc(100vw-6rem)] rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-2 text-[color:var(--text)] shadow-[var(--shadow-modal)] outline-none"
        >
          {HELP_MENU_ITEMS.map(({ id, icon: Icon, labelKey, tour }) => (
            <button
              key={id}
              type="button"
              role="menuitem"
              data-tour={tour}
              onClick={() => {
                buttonRef.current?.focus();
                actions[id]();
                close(false);
              }}
              className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2 py-2 text-left font-grotesk text-[13px] transition-colors duration-150 hover:bg-[color:var(--surface-overlay)] focus-visible:bg-[color:var(--surface-overlay)] focus-visible:ring-2 focus-visible:ring-[color:var(--ring-focus)] focus-visible:outline-none motion-reduce:transition-none"
            >
              <Icon className="h-4 w-4 shrink-0 text-[color:var(--text-subtle)]" strokeWidth={ICON_STROKE} />
              {t.platform.onboarding[labelKey]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
