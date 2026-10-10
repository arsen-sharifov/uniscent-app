'use client';

import { CheckCircle2 } from 'lucide-react';
import { useMemo } from 'react';

import { useTranslations } from '@/i18n';
import { isThreadResolved } from '@/lib/canvas';
import { useCanvasStore } from '@/lib/stores';

export const ResolutionBar = () => {
  const t = useTranslations();
  const nodes = useCanvasStore((state) => state.nodes);
  const edges = useCanvasStore((state) => state.edges);

  const resolved = useMemo(() => isThreadResolved(nodes, edges), [nodes, edges]);

  if (!resolved) return null;

  return (
    <div className="pointer-events-none absolute top-3 left-1/2 z-30 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-[color:var(--decision-border)] bg-[color:var(--decision-soft)] px-3.5 py-1 whitespace-nowrap shadow-[var(--shadow-card-hover)] backdrop-blur-xl select-none">
      <span className="flex items-center gap-1.5 font-mono-ui text-[10px] font-bold tracking-[0.16em] text-[color:var(--decision-text)] uppercase">
        <CheckCircle2 className="h-3 w-3 text-[color:var(--decision)]" strokeWidth={2.5} />
        {t.platform.canvas.resolution.resolved}
      </span>
    </div>
  );
};
