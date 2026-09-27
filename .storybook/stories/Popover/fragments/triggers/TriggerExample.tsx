import { ChevronDown } from 'lucide-react';

import type { IPopoverTrigger } from '@interfaces';

export const TriggerExample = (trigger: IPopoverTrigger) => (
  <button
    type="button"
    {...trigger}
    className="inline-flex items-center gap-1.5 rounded-xl border border-[color:var(--border-strong)] bg-[color:var(--surface)] px-3.5 py-2 text-[13px] font-medium text-[color:var(--text)] shadow-[var(--shadow-pip)] transition-colors hover:bg-[color:var(--surface-overlay)]"
  >
    Open menu
    <ChevronDown className="h-3.5 w-3.5 text-[color:var(--text-subtle)]" />
  </button>
);
