import { useEffect, useRef } from 'react';

import type { IToolbarProps } from '@/components';
import { useCanvasStore } from '@/lib/stores';

import { ToolbarWithState } from './ToolbarWithState';

export const ToolbarWithExportMenu = ({ threadId, threadName }: IToolbarProps) => {
  const ready = useCanvasStore((state) => state.hydrated && state.threadId === threadId && state.nodes.length > 0);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ready) return;

    rootRef.current
      ?.querySelector<HTMLButtonElement>('[aria-haspopup="menu"][aria-expanded="false"]')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
  }, [ready]);

  return (
    <div className="flex h-full justify-end p-3">
      <div ref={rootRef} data-visual-target className="inline-flex">
        <ToolbarWithState threadId={threadId} threadName={threadName} />
      </div>
    </div>
  );
};
