import { ECanvasNodeType, type TCanvasContextMenu, type TCanvasNode, type TReferenceNode } from '@interfaces';

const SB_NODE_ID = 'sb-ctx-node';
const SB_REFERENCE_ID = 'sb-ctx-reference';
const SB_EDGE_ID = 'sb-ctx-edge';

const MENU_X = 240;
const MENU_Y = 160;

export const paneMenu: TCanvasContextMenu = {
  type: 'pane',
  x: MENU_X,
  y: MENU_Y,
  flowX: 120,
  flowY: 80,
};

export const nodeMenu: TCanvasContextMenu = {
  type: 'node',
  x: MENU_X,
  y: MENU_Y,
  nodeId: SB_NODE_ID,
};

export const referenceMenu: TCanvasContextMenu = {
  type: 'node',
  x: MENU_X,
  y: MENU_Y,
  nodeId: SB_REFERENCE_ID,
};

export const edgeMenu: TCanvasContextMenu = {
  type: 'edge',
  x: MENU_X,
  y: MENU_Y,
  edgeId: SB_EDGE_ID,
};

export const ctxCanvasNode: TCanvasNode = {
  id: SB_NODE_ID,
  type: ECanvasNodeType.Canvas,
  position: { x: 0, y: 0 },
  data: {
    label: 'Should canvas evaluation be voting-based?',
    status: null,
    isAnswer: false,
    comments: [],
  },
};

export const ctxReferenceNode: TReferenceNode = {
  id: SB_REFERENCE_ID,
  type: ECanvasNodeType.Reference,
  position: { x: 0, y: 0 },
  data: {
    label: 'Provenance keeps reasoning auditable.',
    sourceNodeId: 'src-node',
    sourceNodeLabel: 'Provenance keeps reasoning auditable.',
    sourceThreadId: 'src-thread',
    sourceThreadName: 'Governance model',
    sourceWorkspaceId: 'src-workspace',
    sourceWorkspaceName: 'Research',
  },
};
