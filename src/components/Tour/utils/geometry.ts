'use client';

import type { ISize, ITourGeometry } from '@interfaces';

import { sameRect, sameRects } from '@/lib/onboarding';

export const readViewport = (): ISize => ({ width: window.innerWidth, height: window.innerHeight });

export const isInside = (inner: DOMRect, outer: DOMRect): boolean =>
  inner.top >= outer.top && inner.bottom <= outer.bottom && inner.left >= outer.left && inner.right <= outer.right;

export const sameGeometry = (first: ITourGeometry, second: ITourGeometry): boolean =>
  first.anchor === second.anchor &&
  sameRect(first.rect, second.rect) &&
  sameRect(first.blocked, second.blocked) &&
  sameRects(first.lit, second.lit) &&
  sameRects(first.open, second.open);
