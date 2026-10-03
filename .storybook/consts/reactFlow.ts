import { CanvasNode, QuestionNode, ReferenceNode } from '@/components';

export { PRO_OPTIONS } from '@/components';

export const FIT_VIEW_OPTIONS = { padding: 1.2, maxZoom: 1 } as const;

export const CANVAS_FIT_VIEW_OPTIONS = { padding: 0.2, maxZoom: 1 } as const;

export const LOCKED_GESTURES = {
  panOnDrag: false,
  zoomOnScroll: false,
  zoomOnPinch: false,
  zoomOnDoubleClick: false,
} as const;

export const NODE_TYPES = {
  'canvas-node': CanvasNode,
  'question-node': QuestionNode,
  'reference-node': ReferenceNode,
};
