'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export const useExpandableLabel = (enabled = true) => {
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);

  const observerRef = useRef<ResizeObserver | null>(null);

  useEffect(
    () => () => {
      observerRef.current?.disconnect();
      observerRef.current = null;
    },
    [],
  );

  const labelRefCallback = useCallback(
    (node: HTMLParagraphElement | null) => {
      observerRef.current?.disconnect();
      observerRef.current = null;
      if (!node || !enabled) return;

      const measure = () => setOverflows(node.scrollHeight - node.clientHeight > 1);
      measure();

      const observer = new ResizeObserver(measure);
      observer.observe(node);
      observerRef.current = observer;
    },
    [enabled],
  );

  return {
    labelRefCallback,
    expanded,
    expandable: enabled && (overflows || expanded),
    toggleExpanded: () => setExpanded((previous) => !previous),
  };
};
