import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { QuestionNode } from '@/components';

import {
  defaultQuestion,
  editingQuestion,
  longQuestion,
  pendingQuestion,
  placeholderQuestion,
  SB_QUESTION_ID,
  selectedQuestion,
} from './consts';
import { SingleNodeFlow } from '../../components';
import { ARG_CATEGORIES } from '../../consts';
import { WithCanvasStage, withCanvasStore, WithReactFlow } from '../../decorators';

const meta: Meta<typeof QuestionNode> = {
  title: 'Components/Canvas/QuestionNode',
  component: QuestionNode,
  parameters: {
    docs: {
      description: {
        component:
          'The central question node — auto-created with every thread as the root of the discussion. Distinct from reasoning nodes: anchored on the `--question` tone rather than the accent, non-deletable, excluded from valid/invalid evaluation, and built to hold the full multi-sentence question with inline multi-line editing. The store is mocked so each visual state (resting, empty placeholder, selected, editing, long, pending) previews in isolation.',
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
      description: 'ICanvasNodeData — the label holds the central question.',
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

type Story = StoryObj<typeof QuestionNode>;

export const Default: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Resting state — the framed question under a 3px `--question` strip and the QUESTION status word. Handles fade in on hover.',
      },
    },
  },
  decorators: [withCanvasStore({ nodes: [defaultQuestion] })],
  render: () => <SingleNodeFlow node={defaultQuestion} />,
};

export const Placeholder: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Empty label — the muted placeholder invites the author to frame the discussion. This is the fresh-thread state.',
      },
    },
  },
  decorators: [withCanvasStore({ nodes: [placeholderQuestion] })],
  render: () => <SingleNodeFlow node={placeholderQuestion} />,
};

export const Selected: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Selected via React Flow — outlined with the active border token.',
      },
    },
  },
  decorators: [withCanvasStore({ nodes: [selectedQuestion] })],
  render: () => <SingleNodeFlow node={selectedQuestion} />,
};

export const Editing: Story = {
  parameters: {
    docs: {
      description: {
        story: '`editingNodeId` matches this node, so the question collapses into a focused multi-line textarea.',
      },
    },
  },
  decorators: [withCanvasStore({ nodes: [editingQuestion], editingNodeId: SB_QUESTION_ID })],
  render: () => <SingleNodeFlow node={editingQuestion} />,
};

export const LongQuestion: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'A multi-sentence question crosses the clamp threshold — the `Show more` toggle appears beneath the text.',
      },
    },
  },
  decorators: [withCanvasStore({ nodes: [longQuestion] })],
  render: () => <SingleNodeFlow node={longQuestion} />,
};

export const PendingConnection: Story = {
  parameters: {
    docs: {
      description: {
        story:
          '`pendingConnection` equals this node id — the pulsing ring signals the connect tool is waiting for a branch target.',
      },
    },
  },
  decorators: [withCanvasStore({ nodes: [pendingQuestion], pendingConnection: SB_QUESTION_ID })],
  render: () => <SingleNodeFlow node={pendingQuestion} />,
};
