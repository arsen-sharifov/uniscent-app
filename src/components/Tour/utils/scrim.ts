import type { IAnchorRect } from '@interfaces';
import { SCRIM_BOUND, SPOTLIGHT_PADDING, SPOTLIGHT_RADIUS } from '@constants';

const right = ({ left, width }: IAnchorRect) => left + width;

const bottom = ({ top, height }: IAnchorRect) => top + height;

const intersects = (first: IAnchorRect, second: IAnchorRect): boolean =>
  first.left < right(second) && second.left < right(first) && first.top < bottom(second) && second.top < bottom(first);

const union = (first: IAnchorRect, second: IAnchorRect): IAnchorRect => {
  const left = Math.min(first.left, second.left);
  const top = Math.min(first.top, second.top);

  return {
    left,
    top,
    width: Math.max(right(first), right(second)) - left,
    height: Math.max(bottom(first), bottom(second)) - top,
  };
};

export const inflate = ({ top, left, width, height }: IAnchorRect): IAnchorRect => ({
  top: top - SPOTLIGHT_PADDING,
  left: left - SPOTLIGHT_PADDING,
  width: width + SPOTLIGHT_PADDING * 2,
  height: height + SPOTLIGHT_PADDING * 2,
});

export const mergeHoles = (holes: readonly IAnchorRect[]): IAnchorRect[] => {
  const merged = holes.reduce<IAnchorRect[]>((kept, hole) => {
    const overlapping = kept.filter((rect) => intersects(rect, hole));

    if (overlapping.length === 0) return [...kept, hole];

    return [
      ...kept.filter((rect) => !intersects(rect, hole)),
      overlapping.reduce((box, rect) => union(box, rect), hole),
    ];
  }, []);

  return merged.length === holes.length ? merged : mergeHoles(merged);
};

const roundedRectPath = (hole: IAnchorRect): string => {
  const { top, left, width, height } = hole;
  const rightEdge = right(hole);
  const bottomEdge = bottom(hole);
  const radius = Math.min(SPOTLIGHT_RADIUS, width / 2, height / 2);
  const corner = (x: number, y: number) => `A${radius} ${radius} 0 0 1 ${x} ${y}`;

  return [
    `M${left + radius} ${top}`,
    `H${rightEdge - radius}`,
    corner(rightEdge, top + radius),
    `V${bottomEdge - radius}`,
    corner(rightEdge - radius, bottomEdge),
    `H${left + radius}`,
    corner(left, bottomEdge - radius),
    `V${top + radius}`,
    corner(left + radius, top),
    'Z',
  ].join(' ');
};

export const buildScrimPath = (holes: readonly IAnchorRect[]): string =>
  [
    `M${-SCRIM_BOUND} ${-SCRIM_BOUND} H${SCRIM_BOUND * 2} V${SCRIM_BOUND * 2} H${-SCRIM_BOUND} Z`,
    ...mergeHoles(holes.map(inflate)).map(roundedRectPath),
  ].join(' ');
