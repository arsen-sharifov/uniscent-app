import type { Node } from '@xyflow/react';

import type { IAlignmentGuide, ISpan } from '@interfaces';

import { ALIGN_GUIDE_THRESHOLD_PX } from '../consts';

const sampleLines = (origin: number, size: number): readonly number[] => [origin, origin + size / 2, origin + size];

const mergeSpan = (existing: ISpan | undefined, start: number, end: number): ISpan => ({
  start: existing ? Math.min(existing.start, start) : start,
  end: existing ? Math.max(existing.end, end) : end,
});

const matchLines = (
  guides: Map<number, ISpan>,
  draggedLines: readonly number[],
  nodeLines: readonly number[],
  span: ISpan,
  threshold: number,
): void =>
  draggedLines.forEach((draggedLine) =>
    nodeLines.forEach((nodeLine) => {
      if (Math.abs(draggedLine - nodeLine) < threshold) {
        guides.set(nodeLine, mergeSpan(guides.get(nodeLine), span.start, span.end));
      }
    }),
  );

const collectGuides = (positions: Map<number, ISpan>, direction: IAlignmentGuide['direction']): IAlignmentGuide[] =>
  Array.from(positions.entries()).map(([position, span]) => ({
    direction,
    position,
    start: span.start,
    end: span.end,
  }));

export const computeAlignmentGuides = (
  dragged: Node,
  nodes: readonly Node[],
  threshold: number = ALIGN_GUIDE_THRESHOLD_PX,
): IAlignmentGuide[] => {
  const draggedWidth = dragged.measured?.width ?? 0;
  const draggedHeight = dragged.measured?.height ?? 0;
  if (!draggedWidth || !draggedHeight) return [];

  const draggedX = dragged.position.x;
  const draggedY = dragged.position.y;

  const verticals = new Map<number, ISpan>();
  const horizontals = new Map<number, ISpan>();

  const draggedVerticalLines = sampleLines(draggedX, draggedWidth);
  const draggedHorizontalLines = sampleLines(draggedY, draggedHeight);

  nodes.forEach((node) => {
    if (node.id === dragged.id) return;

    const width = node.measured?.width ?? 0;
    const height = node.measured?.height ?? 0;
    if (!width || !height) return;

    matchLines(
      verticals,
      draggedVerticalLines,
      sampleLines(node.position.x, width),
      { start: Math.min(draggedY, node.position.y), end: Math.max(draggedY + draggedHeight, node.position.y + height) },
      threshold,
    );
    matchLines(
      horizontals,
      draggedHorizontalLines,
      sampleLines(node.position.y, height),
      { start: Math.min(draggedX, node.position.x), end: Math.max(draggedX + draggedWidth, node.position.x + width) },
      threshold,
    );
  });

  return [...collectGuides(verticals, 'vertical'), ...collectGuides(horizontals, 'horizontal')];
};
