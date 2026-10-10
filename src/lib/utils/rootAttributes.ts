'use client';

export const createRootAttributeSubscription = (attributes: string[]) => {
  const subscribers = new Set<() => void>();
  let observer: MutationObserver | null = null;

  return (notify: () => void) => {
    subscribers.add(notify);

    if (!observer && typeof document !== 'undefined') {
      observer = new MutationObserver(() => subscribers.forEach((callback) => callback()));
      observer.observe(document.documentElement, { attributes: true, attributeFilter: attributes });
    }

    return () => {
      subscribers.delete(notify);
      if (subscribers.size > 0) return;

      observer?.disconnect();
      observer = null;
    };
  };
};
