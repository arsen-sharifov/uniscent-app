import type { TNavItem, IWorkspaceItem } from '@interfaces';

export const workspaces: IWorkspaceItem[] = [
  { id: 'ws-1', name: 'My Workspace', canManageWorkspace: true },
  { id: 'ws-2', name: 'Design Team', canManageWorkspace: true },
  { id: 'ws-3', name: 'Engineering', canManageWorkspace: true },
];

export const defaultWorkspaceId = 'ws-1';

export const fullTree: TNavItem[] = [
  {
    type: 'folder',
    id: 'f1',
    name: 'Research',
    items: [
      { type: 'thread', id: 'f1-t1', name: 'AI Ethics' },
      {
        type: 'folder',
        id: 'f1-f1',
        name: 'Competitors',
        items: [
          { type: 'thread', id: 'f1-f1-t1', name: 'Feature Matrix' },
          { type: 'thread', id: 'f1-f1-t2', name: 'Market Share' },
        ],
      },
    ],
  },
  { type: 'thread', id: 't1', name: 'Product Strategy' },
  {
    type: 'folder',
    id: 'f2',
    name: 'Engineering',
    items: [
      { type: 'thread', id: 'f2-t1', name: 'System Design' },
      { type: 'thread', id: 'f2-t2', name: 'API Architecture' },
      {
        type: 'folder',
        id: 'f2-f1',
        name: 'Database',
        items: [
          { type: 'thread', id: 'f2-f1-t1', name: 'Schema Design' },
          { type: 'thread', id: 'f2-f1-t2', name: 'Migrations' },
        ],
      },
    ],
  },
  {
    type: 'folder',
    id: 'f3',
    name: 'Team',
    items: [
      { type: 'thread', id: 'f3-t1', name: 'Hiring Plan' },
      {
        type: 'folder',
        id: 'f3-f1',
        name: 'Q1 2026',
        items: [
          { type: 'thread', id: 'f3-f1-t1', name: 'Engineering Roles' },
          { type: 'thread', id: 'f3-f1-t2', name: 'Onboarding Flow' },
        ],
      },
    ],
  },
  { type: 'folder', id: 'f4', name: 'Archive', items: [] },
  { type: 'thread', id: 't2', name: 'Investor Thesis' },
];

export const flatThreads: TNavItem[] = [
  { type: 'thread', id: 't1', name: 'Meeting Notes' },
  { type: 'thread', id: 't2', name: 'Design Review' },
  { type: 'thread', id: 't3', name: 'Sprint Retro' },
  { type: 'thread', id: 't4', name: 'Product Roadmap' },
  { type: 'thread', id: 't5', name: 'Quarterly Goals' },
];

export const manyItems: TNavItem[] = Array.from({ length: 30 }, (_, index) => ({
  type: 'thread' as const,
  id: `scroll-t${index}`,
  name: `Thread ${index + 1}: ${['Analysis', 'Review', 'Planning', 'Research', 'Design'][index % 5]}`,
}));

export const deepTree: TNavItem[] = [
  {
    type: 'folder',
    id: 'd1',
    name: 'Strategic Planning & Research',
    items: [
      {
        type: 'folder',
        id: 'd1-f1',
        name: 'Competitive Analysis Framework',
        items: [
          {
            type: 'thread',
            id: 'd1-f1-t1',
            name: 'Market Positioning Strategy Notes',
          },
          {
            type: 'thread',
            id: 'd1-f1-t2',
            name: 'Consumer Behaviour Research Data',
          },
          {
            type: 'folder',
            id: 'd1-f1-f1',
            name: 'Regional Market Breakdown',
            items: [
              {
                type: 'thread',
                id: 'd1-f1-f1-t1',
                name: 'EMEA Product-Market Fit Assessment',
              },
              {
                type: 'thread',
                id: 'd1-f1-f1-t2',
                name: 'APAC Competitive Intelligence Report',
              },
            ],
          },
        ],
      },
      {
        type: 'thread',
        id: 'd1-t1',
        name: 'Quarterly Strategic Objectives Overview',
      },
    ],
  },
];
