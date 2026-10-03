import { ArrowUpRight, Search } from 'lucide-react';
import { useMemo, useState } from 'react';

import { SEARCHABLE_REFERENCES } from '../../consts';

interface ISearchableReferencesExampleProps {
  onSelect: (label: string) => void;
}

export const SearchableReferencesExample = ({ onSelect }: ISearchableReferencesExampleProps) => {
  const [query, setQuery] = useState('');
  const filtered = useMemo(
    () => SEARCHABLE_REFERENCES.filter((label) => label.toLowerCase().includes(query.toLowerCase().trim())),
    [query],
  );

  return (
    <div className="w-72 p-2">
      <label className="flex items-center gap-2 rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-2 py-1.5">
        <Search className="h-3.5 w-3.5 text-[color:var(--text-subtle)]" strokeWidth={2} />
        <input
          type="text"
          value={query}
          onChange={(inputEvent) => setQuery(inputEvent.target.value)}
          placeholder="Filter references"
          className="w-full bg-transparent text-[12.5px] text-[color:var(--text-strong)] outline-none placeholder:text-[color:var(--text-faint)]"
        />
      </label>
      <ul className="mt-2 max-h-56 space-y-0.5 overflow-y-auto text-[12.5px]">
        {filtered.length === 0 && <li className="px-2.5 py-2 text-[color:var(--text-faint)]">No matches</li>}
        {filtered.map((label) => (
          <li key={label}>
            <button
              type="button"
              onClick={() => onSelect(label)}
              className="flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-[color:var(--text)] transition-colors hover:bg-[color:var(--surface-overlay)] hover:text-[color:var(--text-strong)]"
            >
              <span className="truncate">{label}</span>
              <ArrowUpRight className="h-3 w-3 shrink-0 text-[color:var(--text-faint)]" strokeWidth={2} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};
