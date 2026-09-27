import { type MeasuringConfiguration, MeasuringStrategy } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';

import type { TItemActionTone } from '@interfaces';

export const MAX_DEPTH = 2;
export const INDENTATION_WIDTH = 20;

export const POINTER_ACTIVATION_DISTANCE = 5;

export const POINTER_SENSOR_OPTIONS = { activationConstraint: { distance: POINTER_ACTIVATION_DISTANCE } };
export const KEYBOARD_SENSOR_OPTIONS = { coordinateGetter: sortableKeyboardCoordinates };

export const FOLDER_INSIDE_THRESHOLD = 0.25;
export const LEAF_SPLIT_THRESHOLD = 0.5;
export const DROP_ZONE_HYSTERESIS_PX = 6;
export const AUTO_EXPAND_DELAY_MS = 500;

export const DRAG_SELECT_ACTIVATION_PX = 5;
export const AUTO_SCROLL_ZONE_PX = 30;
export const AUTO_SCROLL_STEP_PX = 8;
export const AUTO_SCROLL_INTERVAL_MS = 16;

export const DND_MEASURING: MeasuringConfiguration = {
  droppable: { strategy: MeasuringStrategy.WhileDragging },
};

export const SKELETON_ROW_WIDTHS: readonly string[] = ['w-40', 'w-28', 'w-36', 'w-24', 'w-32', 'w-20'];

export const ITEM_ACTION_TONES: Record<TItemActionTone, string> = {
  accent:
    'cursor-pointer hover:bg-[color:var(--surface-overlay)] hover:text-[color:var(--accent-text)] active:bg-[color:var(--accent-soft)] active:text-[color:var(--accent-text)]',
  neutral:
    'cursor-pointer hover:bg-[color:var(--surface-overlay)] hover:text-[color:var(--text-strong)] active:bg-[color:var(--surface-overlay)] active:text-[color:var(--text-strong)]',
  danger:
    'cursor-pointer hover:bg-[color:var(--status-error-bg)] hover:text-[color:var(--status-error)] active:bg-[color:var(--status-error-soft)] active:text-[color:var(--status-error)]',
};
