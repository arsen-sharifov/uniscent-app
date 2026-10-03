import type { TCanvasNode } from '@interfaces';

import { createQuestionNode } from '../../utils';

export const SB_QUESTION_ID = 'sb-question-1';

export const defaultQuestion: TCanvasNode = createQuestionNode(
  SB_QUESTION_ID,
  'Should canvas evaluation be voting-based, or decided by an appointed authority?',
);

export const placeholderQuestion: TCanvasNode = createQuestionNode(SB_QUESTION_ID, '');

export const selectedQuestion: TCanvasNode = createQuestionNode(
  SB_QUESTION_ID,
  'How do we keep cross-canvas references trustworthy as conclusions evolve?',
  true,
);

export const editingQuestion: TCanvasNode = createQuestionNode(
  SB_QUESTION_ID,
  'Rewrite me — the question field is focused for editing.',
);

export const longQuestion: TCanvasNode = createQuestionNode(
  SB_QUESTION_ID,
  'When a workspace switches from manual evaluation to voting mid-discussion, what happens to branches that were already marked valid by a single authority? Do we re-open them for a vote, grandfather the existing verdicts, or freeze the discussion until the new governance rules are acknowledged by every member?',
);

export const pendingQuestion: TCanvasNode = createQuestionNode(
  SB_QUESTION_ID,
  'Awaiting an outgoing connection to its first branch.',
);
