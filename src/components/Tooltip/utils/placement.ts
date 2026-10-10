import type { ISize, ITooltipPosition, TTooltipPlacement } from '@interfaces';

import { PLACEMENT_FALLBACK_ORDER, TRIGGER_GAP, VIEWPORT_MARGIN } from '../consts';

export const getOppositePlacement = (placement: TTooltipPlacement): TTooltipPlacement => {
  if (placement === 'top') return 'bottom';
  if (placement === 'bottom') return 'top';
  if (placement === 'left') return 'right';

  return 'left';
};

export const fitsInViewport = (placement: TTooltipPlacement, trigger: DOMRect, tooltip: ISize): boolean => {
  if (placement === 'top') return trigger.top - TRIGGER_GAP - tooltip.height >= VIEWPORT_MARGIN;

  if (placement === 'bottom')
    return trigger.bottom + TRIGGER_GAP + tooltip.height <= window.innerHeight - VIEWPORT_MARGIN;

  if (placement === 'left') return trigger.left - TRIGGER_GAP - tooltip.width >= VIEWPORT_MARGIN;

  return trigger.right + TRIGGER_GAP + tooltip.width <= window.innerWidth - VIEWPORT_MARGIN;
};

export const choosePlacement = (preferred: TTooltipPlacement, trigger: DOMRect, tooltip: ISize): TTooltipPlacement => {
  const candidates = [preferred, getOppositePlacement(preferred), ...PLACEMENT_FALLBACK_ORDER];

  return candidates.find((candidate) => fitsInViewport(candidate, trigger, tooltip)) ?? preferred;
};

const computeBeforeClamp = (
  placement: TTooltipPlacement,
  trigger: DOMRect,
  tooltip: ISize,
): { top: number; left: number } => {
  if (placement === 'top') {
    return {
      top: trigger.top - TRIGGER_GAP - tooltip.height,
      left: trigger.left + trigger.width / 2 - tooltip.width / 2,
    };
  }
  if (placement === 'bottom') {
    return {
      top: trigger.bottom + TRIGGER_GAP,
      left: trigger.left + trigger.width / 2 - tooltip.width / 2,
    };
  }
  if (placement === 'left') {
    return {
      top: trigger.top + trigger.height / 2 - tooltip.height / 2,
      left: trigger.left - TRIGGER_GAP - tooltip.width,
    };
  }

  return {
    top: trigger.top + trigger.height / 2 - tooltip.height / 2,
    left: trigger.right + TRIGGER_GAP,
  };
};

export const computeTooltipPosition = (
  placement: TTooltipPlacement,
  trigger: DOMRect,
  tooltip: ISize,
): ITooltipPosition => {
  const raw = computeBeforeClamp(placement, trigger, tooltip);

  const left = Math.max(VIEWPORT_MARGIN, Math.min(raw.left, window.innerWidth - tooltip.width - VIEWPORT_MARGIN));
  const top = Math.max(VIEWPORT_MARGIN, Math.min(raw.top, window.innerHeight - tooltip.height - VIEWPORT_MARGIN));

  return {
    top,
    left,
    placement,
    arrowLeft: trigger.left + trigger.width / 2 - left,
    arrowTop: trigger.top + trigger.height / 2 - top,
  };
};
