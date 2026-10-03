import type { TCanvasNode } from '@interfaces';

import { createCanvasNode, createComment } from '../../utils';

export const SB_NODE_ID = 'sb-node-1';

export const defaultNode: TCanvasNode = createCanvasNode(
  SB_NODE_ID,
  0,
  0,
  'Voting balances authority across all members of a thread.',
);

export const selectedNode: TCanvasNode = createCanvasNode(
  SB_NODE_ID,
  0,
  0,
  'Selected reasoning node with active outline.',
  null,
  [],
  true,
);

export const validNode: TCanvasNode = createCanvasNode(
  SB_NODE_ID,
  0,
  0,
  'Require provenance on publish, not on draft.',
  'valid',
);

export const invalidNode: TCanvasNode = createCanvasNode(
  SB_NODE_ID,
  0,
  0,
  'Mandatory provenance blocks quick drafts.',
  'invalid',
);

export const withCommentsNode: TCanvasNode = createCanvasNode(
  SB_NODE_ID,
  0,
  0,
  'Should canvas evaluation be voting-based?',
  null,
  [
    createComment('c1', 'Voting distributes responsibility across all canvas members.'),
    createComment('c2', 'Could a qualified majority be a sensible middle ground here?'),
    createComment('c3', 'Concerned about speed — fast canvases stall under voting overhead.', 'sb-other'),
  ],
);

export const longLabelNode: TCanvasNode = createCanvasNode(
  SB_NODE_ID,
  0,
  0,
  'A deliberately long reasoning label that wraps onto several lines so the clamp-and-expand control surfaces. It keeps going and going across multiple lines, eventually crossing the collapse threshold so the "Show more" toggle appears beneath the label, letting reviewers read the full thought without resizing the node manually.',
);

export const pendingNode: TCanvasNode = createCanvasNode(SB_NODE_ID, 0, 0, 'Awaiting an outgoing connection.');

export const editingNode: TCanvasNode = createCanvasNode(
  SB_NODE_ID,
  0,
  0,
  'Rename me — the field is focused for editing.',
);

export const answerNode: TCanvasNode = createCanvasNode(
  SB_NODE_ID,
  0,
  0,
  'Adopt qualified-majority voting for canvas evaluation.',
  null,
  [],
  false,
  true,
);
