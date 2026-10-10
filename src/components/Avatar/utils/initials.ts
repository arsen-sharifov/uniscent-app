export const getInitials = (name: string) =>
  (name.trim() || 'U')
    .split(/\s+/)
    .map((word) => [...word][0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();
