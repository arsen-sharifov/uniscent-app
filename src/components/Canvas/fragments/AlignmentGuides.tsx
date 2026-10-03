'use client';

import { useReactFlow } from '@xyflow/react';
import { useMemo } from 'react';

import type { IAlignmentGuide } from '@interfaces';

import { ALIGN_GUIDE_DASH_ARRAY, ALIGN_GUIDE_STROKE_WIDTH } from '../consts';

interface IAlignmentGuidesProps {
  guides: readonly IAlignmentGuide[];
}

export const AlignmentGuides = ({ guides }: IAlignmentGuidesProps) => {
  const { flowToScreenPosition } = useReactFlow();

  const segments = useMemo(
    () =>
      guides.map(({ direction, position, start, end }) => {
        const vertical = direction === 'vertical';
        const head = flowToScreenPosition(vertical ? { x: position, y: start } : { x: start, y: position });
        const tail = flowToScreenPosition(vertical ? { x: position, y: end } : { x: end, y: position });

        return { id: `${direction}-${position}`, x1: head.x, y1: head.y, x2: tail.x, y2: tail.y };
      }),
    [guides, flowToScreenPosition],
  );

  if (segments.length === 0) {
    return null;
  }

  return (
    <svg aria-hidden className="pointer-events-none fixed inset-0 z-30" width="100%" height="100%">
      {segments.map(({ id, x1, y1, x2, y2 }) => (
        <line
          key={id}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke="var(--accent)"
          strokeWidth={ALIGN_GUIDE_STROKE_WIDTH}
          strokeDasharray={ALIGN_GUIDE_DASH_ARRAY}
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
};
