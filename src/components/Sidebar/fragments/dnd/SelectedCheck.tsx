import { Check } from 'lucide-react';

export const SelectedCheck = () => (
  <span
    aria-hidden="true"
    className="ml-auto flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-[color:var(--accent)] text-[color:var(--on-accent)] shadow-[var(--shadow-pip)]"
  >
    <Check strokeWidth={3.5} className="h-2 w-2" />
  </span>
);
