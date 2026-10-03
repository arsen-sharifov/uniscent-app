import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { CanvasNode } from '@/components';

import {
  answerNode,
  defaultNode,
  editingNode,
  invalidNode,
  longLabelNode,
  pendingNode,
  SB_NODE_ID,
  selectedNode,
  validNode,
  withCommentsNode,
} from './consts';
import { SingleNodeFlow } from '../../components';
import { ARG_CATEGORIES } from '../../consts';
import { WithCanvasStage, withCanvasStore, withPermissionsStore, WithReactFlow } from '../../decorators';

const meta: Meta<typeof CanvasNode> = {
  title: 'Components/Canvas/CanvasNode',
  component: CanvasNode,
  parameters: {
    docs: {
      description: {
        component:
          'Primary reasoning card rendered inside React Flow. Holds the label, evaluation status, inline editing, and the per-node comments popover (an opaque `--surface` panel). Every state is carried by the shared node band: a 3px tone strip across the top of the card plus a `font-mono-ui` uppercase status word in the same tone. The store is mocked directly so each visual state (selected, valid/invalid, pending connection, editing, with comments) is previewable in isolation.',
      },
    },
  },
  argTypes: {
    id: {
      control: false,
      description: 'Node id assigned by the canvas store.',
      table: { category: ARG_CATEGORIES.OTHER },
    },
    data: {
      control: false,
      description: 'ICanvasNodeData — label, status, comments.',
      table: { category: ARG_CATEGORIES.CONTENT },
    },
    selected: {
      control: 'boolean',
      description: 'React Flow selection flag.',
      table: { category: ARG_CATEGORIES.APPEARANCE },
    },
  },
  decorators: [WithCanvasStage, WithReactFlow],
};

export default meta;

type Story = StoryObj<typeof CanvasNode>;

export const Default: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Resting state — no selection, no comments. An unevaluated node carries no band; the strip and status word appear only once it is validated, refuted, affected or marked as the answer. Handles fade in on hover.',
      },
    },
  },
  decorators: [withCanvasStore({ nodes: [defaultNode] })],
  render: () => <SingleNodeFlow node={defaultNode} />,
};

export const Selected: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Selected via React Flow — outlined with the active border token.',
      },
    },
  },
  decorators: [withCanvasStore({ nodes: [selectedNode] })],
  render: () => <SingleNodeFlow node={selectedNode} />,
};

export const WithComments: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Three comments mocked with the side popover open. Mix of own and other-author entries to show the delete affordance.',
      },
    },
  },
  decorators: [withCanvasStore({ nodes: [withCommentsNode], openCommentsNodeId: SB_NODE_ID })],
  render: () => <SingleNodeFlow node={withCommentsNode} />,
};

export const ReadOnlyComments: Story = {
  parameters: {
    docs: {
      story: { inline: false, height: '480px' },
      description: {
        story:
          'Viewer permissions — the comments popover stays readable, but the composer and delete affordances are hidden because `canComment` is off. Rendered in an iframe on the docs page so the permissions override cannot leak into sibling stories that share the store.',
      },
    },
  },
  decorators: [
    withCanvasStore({ nodes: [withCommentsNode], openCommentsNodeId: SB_NODE_ID }),
    withPermissionsStore({ isOwner: false, canEditCanvas: false, canComment: false }),
  ],
  render: () => <SingleNodeFlow node={withCommentsNode} />,
};

export const Valid: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Status set to `valid` — 3px `--status-success` strip, check mark, and the VALID status word.',
      },
    },
  },
  decorators: [withCanvasStore({ nodes: [validNode] })],
  render: () => <SingleNodeFlow node={validNode} />,
};

export const Invalid: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Status set to `invalid` — 3px `--status-error` strip, cross mark, and the INVALID status word.',
      },
    },
  },
  decorators: [withCanvasStore({ nodes: [invalidNode] })],
  render: () => <SingleNodeFlow node={invalidNode} />,
};

export const Answer: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Marked as the discussion final answer — 3px `--decision` strip, flag icon, and the ANSWER status word. Deliberately distinct from valid, which bands in `--status-success`.',
      },
    },
  },
  decorators: [withCanvasStore({ nodes: [answerNode] })],
  render: () => <SingleNodeFlow node={answerNode} />,
};

export const Editing: Story = {
  parameters: {
    docs: {
      description: {
        story: '`editingNodeId` matches this node, so the label collapses into a focused textarea.',
      },
    },
  },
  decorators: [withCanvasStore({ nodes: [editingNode], editingNodeId: SB_NODE_ID })],
  render: () => <SingleNodeFlow node={editingNode} />,
};

export const LongLabel: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Label crosses the clamp threshold — the `Show more` toggle appears beneath the text.',
      },
    },
  },
  decorators: [withCanvasStore({ nodes: [longLabelNode] })],
  render: () => <SingleNodeFlow node={longLabelNode} />,
};

export const PendingConnection: Story = {
  parameters: {
    docs: {
      description: {
        story:
          '`pendingConnection` equals this node id — a pulsing `--ref-border` ring signals the connect tool is waiting for a target.',
      },
    },
  },
  decorators: [withCanvasStore({ nodes: [pendingNode], pendingConnection: SB_NODE_ID })],
  render: () => <SingleNodeFlow node={pendingNode} />,
};
