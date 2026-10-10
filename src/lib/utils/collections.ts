export const groupBy = <T>(items: readonly T[], keyOf: (item: T) => string): Map<string, T[]> =>
  items.reduce((groups, item) => {
    const key = keyOf(item);
    const group = groups.get(key) ?? [];
    group.push(item);

    return groups.set(key, group);
  }, new Map<string, T[]>());
