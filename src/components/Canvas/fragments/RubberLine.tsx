'use client';

import { useEffect, useState } from 'react';

import type { IScreenPoint } from '@interfaces';

import { ECanvasTool } from '@/components/tools';
import { useCanvasStore } from '@/lib/stores';

import {
  RUBBER_LINE_DASH_ARRAY,
  RUBBER_LINE_DOT_RADIUS,
  RUBBER_LINE_DOT_STROKE_WIDTH,
  RUBBER_LINE_STROKE_WIDTH,
} from '../consts';

export const RubberLine = () => {
  const activeTool = useCanvasStore((state) => state.activeTool);
  const pendingConnection = useCanvasStore((state) => state.pendingConnection);

  const [cursorScreen, setCursorScreen] = useState<IScreenPoint | null>(null);
  const [sourceScreen, setSourceScreen] = useState<IScreenPoint | null>(null);

  useEffect(() => {
    if (!pendingConnection) return;

    const onMove = (event: MouseEvent) => {
      setCursorScreen({ x: event.clientX, y: event.clientY });

      const element = document.querySelector(`.react-flow__node[data-id="${pendingConnection}"]`);
      if (!element) return;

      const rect = element.getBoundingClientRect();
      setSourceScreen({
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      });
    };

    window.addEventListener('mousemove', onMove);

    return () => {
      window.removeEventListener('mousemove', onMove);
      setCursorScreen(null);
      setSourceScreen(null);
    };
  }, [pendingConnection]);

  if (activeTool !== ECanvasTool.Connect || pendingConnection === null || !cursorScreen || !sourceScreen) return null;

  return (
    <svg aria-hidden className="pointer-events-none fixed inset-0 z-40" width="100%" height="100%">
      <line
        x1={sourceScreen.x}
        y1={sourceScreen.y}
        x2={cursorScreen.x}
        y2={cursorScreen.y}
        stroke="var(--accent)"
        strokeWidth={RUBBER_LINE_STROKE_WIDTH}
        strokeDasharray={RUBBER_LINE_DASH_ARRAY}
        strokeLinecap="round"
      />
      <circle
        cx={cursorScreen.x}
        cy={cursorScreen.y}
        r={RUBBER_LINE_DOT_RADIUS}
        fill="var(--accent)"
        className="stroke-[color:var(--surface)]"
        strokeWidth={RUBBER_LINE_DOT_STROKE_WIDTH}
      />
    </svg>
  );
};
