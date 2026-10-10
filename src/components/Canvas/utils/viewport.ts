import type { Node, Viewport } from '@xyflow/react';

import type { IScreenPoint, ISize } from '@interfaces';

import { OVERLAY_VIEWPORT_MARGIN } from '../consts';

const clampAxis = (start: number, size: number, extent: number): number =>
  Math.min(
    Math.max(start, OVERLAY_VIEWPORT_MARGIN),
    Math.max(OVERLAY_VIEWPORT_MARGIN, extent - size - OVERLAY_VIEWPORT_MARGIN),
  );

export const hasNodeOutsideView = (nodes: Node[], { x, y, zoom }: Viewport, { width, height }: ISize): boolean =>
  nodes.some((node) => {
    const left = node.position.x * zoom + x;
    const top = node.position.y * zoom + y;
    const right = left + (node.measured?.width ?? 0) * zoom;
    const bottom = top + (node.measured?.height ?? 0) * zoom;

    return right < 0 || bottom < 0 || left > width || top > height;
  });

export const clampToViewport = ({ x, y }: IScreenPoint, { width, height }: ISize, viewport: ISize): IScreenPoint => ({
  x: clampAxis(x, width, viewport.width),
  y: clampAxis(y, height, viewport.height),
});
