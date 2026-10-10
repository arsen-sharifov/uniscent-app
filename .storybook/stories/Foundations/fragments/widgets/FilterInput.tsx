'use client';

import { useId } from 'react';

interface IFilterInputProps {
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
}

export const FilterInput = ({ value, onChange, placeholder }: IFilterInputProps) => {
  const id = useId();

  return (
    <label
      htmlFor={id}
      className="inline-flex items-center gap-2 rounded-md border border-[color:var(--border)] bg-[color:var(--surface-elevated)] px-3 py-1.5 text-[12px]"
    >
      <span className="font-mono-ui text-[9.5px] tracking-[0.2em] text-[color:var(--text-subtle)] uppercase">
        Filter
      </span>
      <input
        id={id}
        value={value}
        onChange={(inputEvent) => onChange(inputEvent.target.value)}
        placeholder={placeholder}
        className="w-[200px] bg-transparent text-[12px] text-[color:var(--text)] placeholder:text-[color:var(--text-subtle)] focus:outline-none"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="font-mono-ui text-[9.5px] tracking-[0.2em] text-[color:var(--text-subtle)] uppercase hover:text-[color:var(--text)]"
        >
          Clear
        </button>
      )}
    </label>
  );
};
