import { useMemo } from 'react';

export const useFiltered = <T>(items: readonly T[], query: string, picker: (item: T) => string): T[] =>
  useMemo(() => {
    if (!query.trim()) return [...items];

    const normalizedQuery = query.toLowerCase();

    return items.filter((item) => picker(item).toLowerCase().includes(normalizedQuery));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, query]);
