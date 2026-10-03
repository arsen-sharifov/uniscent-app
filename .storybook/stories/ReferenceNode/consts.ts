import type { TReferenceNode } from '@interfaces';

import { createReferenceNode } from '../../utils';

const SB_REF_ID = 'sb-ref-1';

export const defaultReference: TReferenceNode = createReferenceNode(
  SB_REF_ID,
  'Provenance keeps reasoning auditable over time.',
  'Governance model',
  'Research',
);

export const selectedReference: TReferenceNode = createReferenceNode(
  SB_REF_ID,
  'Selected reference card — the active border ring is on.',
  'Governance model',
  'Research',
  true,
);

export const longPathReference: TReferenceNode = createReferenceNode(
  SB_REF_ID,
  'Voting thresholds should scale with the size of the canvas membership and respond to historical churn.',
  'Long deliberation thread on quorum, voting thresholds and qualified majorities',
  'Strategy & long-horizon planning workspace',
);
