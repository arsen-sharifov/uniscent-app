import { clsx } from 'clsx';
import { type ComponentProps, useState } from 'react';

import type { TModalTabId } from '@story-interfaces';
import { Modal } from '@/components';

import { MODAL_TABS } from '../consts';

type TTabbedModalWithStateProps = Omit<ComponentProps<typeof Modal>, 'children'>;

export const TabbedModalWithState = (props: TTabbedModalWithStateProps) => {
  const [activeTab, setActiveTab] = useState<TModalTabId>('overview');
  const active = MODAL_TABS.find((tab) => tab.id === activeTab) ?? MODAL_TABS[0]!;

  return (
    <Modal {...props}>
      <div className="px-6 pt-5 pb-2">
        <h2 className="text-base font-bold text-[color:var(--text-strong)]">Workspace settings</h2>
        <p className="mt-1 text-[12px] text-[color:var(--text-muted)]">
          Inspect and tweak each area of the workspace from one panel.
        </p>
      </div>
      <nav role="tablist" className="flex gap-1 border-b border-[color:var(--border)] px-4">
        {MODAL_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={tab.id === activeTab}
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              'rounded-t-md border-b-2 px-3 py-2 text-[12.5px] font-medium',
              tab.id === activeTab
                ? 'border-[color:var(--accent)] text-[color:var(--text-strong)]'
                : 'border-transparent text-[color:var(--text-muted)] hover:text-[color:var(--text-strong)]',
            )}
          >
            {tab.label}
          </button>
        ))}
      </nav>
      <div role="tabpanel" className="px-6 py-5">
        <p className="text-[13px] leading-relaxed text-[color:var(--text)]">{active.body}</p>
      </div>
    </Modal>
  );
};
