import { BackgroundVariant, type DefaultEdgeOptions, Position } from '@xyflow/react';
import { AlertTriangle, CheckCircle2, CircleDashed, Flag, HelpCircle, Link2, XCircle } from 'lucide-react';

import type {
  ICanvasSkeletonNode,
  IHandlePosition,
  INodeBandStyle,
  TCanvasPattern,
  TEdgeTone,
  TNodeBandTone,
  TValidationAction,
  TVisibleSaveStatus,
} from '@interfaces';

import { ECanvasTool } from '@/components/tools';

export const HANDLE_POSITIONS: IHandlePosition[] = [
  { id: 'top', position: Position.Top },
  { id: 'left', position: Position.Left },
  { id: 'right', position: Position.Right },
  { id: 'bottom', position: Position.Bottom },
];

export const ARRIVAL_FIT_DURATION_MS = 700;
export const ARRIVAL_FIT_PADDING = 0.25;
export const ARRIVAL_CLEANUP_MS = 1600;

export const BACKGROUND_DOT_GAP = 26;

export const BACKGROUND_SIZE_BY_PATTERN: Record<Exclude<TCanvasPattern, 'none'>, number> = {
  dots: 1.5,
  lines: 1.1,
  cross: 6,
};

export const BACKGROUND_VARIANT_BY_PATTERN: Record<Exclude<TCanvasPattern, 'none'>, BackgroundVariant> = {
  dots: BackgroundVariant.Dots,
  lines: BackgroundVariant.Lines,
  cross: BackgroundVariant.Cross,
};

export const RUBBER_LINE_STROKE_WIDTH = 2;
export const RUBBER_LINE_DASH_ARRAY = '6 4';
export const RUBBER_LINE_DOT_RADIUS = 3.5;
export const RUBBER_LINE_DOT_STROKE_WIDTH = 1.5;

export const CONNECTION_RADIUS = 32;
export const NODE_DRAG_THRESHOLD = 3;
export const OPEN_COMMENTS_Z_INDEX = 2000;
export const OVERLAY_VIEWPORT_MARGIN = 8;

export const ZOOM_STEP_FACTOR = 1.25;
export const ZOOM_MIN = 0.2;
export const ZOOM_MAX = 4;
export const ZOOM_DURATION_MS = 200;

const SNAP_GRID_PX = 16;
export const SNAP_GRID: [number, number] = [SNAP_GRID_PX, SNAP_GRID_PX];

export const ALIGN_GUIDE_THRESHOLD_PX = 4;
export const ALIGN_GUIDE_STROKE_WIDTH = 1;
export const ALIGN_GUIDE_DASH_ARRAY = '4 4';

export const MIDDLE_MOUSE_BUTTON = 1;
export const PAN_BUTTONS_ALL: number[] = [0, MIDDLE_MOUSE_BUTTON];
export const PAN_BUTTONS_MIDDLE: number[] = [MIDDLE_MOUSE_BUTTON];

export const PRO_OPTIONS = { hideAttribution: true } as const;

export const EDGE_DEFAULT_STROKE_WIDTH = 1.75;

export const EDGE_TONE_STROKES: Record<TEdgeTone, string> = {
  default: 'var(--text-subtle)',
  valid: 'var(--status-success)',
  answer: 'var(--decision)',
  invalid: 'var(--status-error)',
  tainted: 'var(--status-warning)',
};

export const EDGE_TONES = Object.keys(EDGE_TONE_STROKES) as TEdgeTone[];

export const DEFAULT_EDGE_OPTIONS: DefaultEdgeOptions = {
  type: 'default',
  style: {
    strokeWidth: EDGE_DEFAULT_STROKE_WIDTH,
  },
};

export const ELIGIBLE_ACTION_BY_TOOL: Partial<Record<ECanvasTool, TValidationAction>> = {
  [ECanvasTool.ValidPath]: 'valid',
  [ECanvasTool.Answer]: 'answer',
};

export const ARIA_LABEL_KEY_BY_STATUS: Record<TVisibleSaveStatus, 'errorTitle' | 'offline' | 'retrying'> = {
  error: 'errorTitle',
  offline: 'offline',
  retrying: 'retrying',
};

export const HISTORY_ACCESS_KEYS = ['userId', 'isOwner', 'canEditCanvas', 'canComment'] as const;

export const LOAD_TIMEOUT_MS = 15000;
export const LOAD_TIMEOUT_MESSAGE = 'Request timed out';

export const FRESH_FIT_PADDING = 0.22;
export const FIT_REQUEST_DURATION_MS = 240;

export const NODE_BAND_TONES: Record<TNodeBandTone, INodeBandStyle> = {
  question: { icon: HelpCircle, color: 'var(--question)' },
  reference: { icon: Link2, color: 'var(--ref)' },
  answer: { icon: Flag, color: 'var(--decision)' },
  valid: { icon: CheckCircle2, color: 'var(--status-success)' },
  invalid: { icon: XCircle, color: 'var(--status-error)' },
  affected: { icon: AlertTriangle, color: 'var(--status-warning)' },
  open: { icon: CircleDashed, color: 'var(--text-muted)' },
};

export const NODE_ALARM_WASHES: Partial<Record<TNodeBandTone, string>> = {
  invalid: 'color-mix(in srgb, var(--status-error) var(--node-wash), transparent)',
  affected: 'color-mix(in srgb, var(--status-warning) var(--node-wash), transparent)',
};

export const CANVAS_SKELETON_NODES: readonly ICanvasSkeletonNode[] = [
  { id: 'question', x: 50, y: 24, width: 236, lines: 2 },
  { id: 'left', x: 31, y: 50, width: 208, lines: 2 },
  { id: 'right', x: 66, y: 48, width: 196, lines: 1 },
  { id: 'answer', x: 49, y: 72, width: 224, lines: 2 },
];

export const REFERENCE_SKELETON_ROWS: readonly string[] = ['w-40', 'w-28', 'w-36', 'w-24'];
