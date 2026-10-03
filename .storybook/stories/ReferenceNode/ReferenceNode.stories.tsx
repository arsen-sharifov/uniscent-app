import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { ReferenceNode } from '@/components';

import { defaultReference, longPathReference, selectedReference } from './consts';
import { SingleNodeFlow } from '../../components';
import { ARG_CATEGORIES } from '../../consts';
import { WithCanvasStage, WithReactFlow, withCanvasStore } from '../../decorators';

const meta: Meta<typeof ReferenceNode> = {
  title: 'Components/Canvas/ReferenceNode',
  component: ReferenceNode,
  parameters: {
    docs: {
      description: {
        component:
          'Cross-thread reference card — a thin pointer to a node living on another canvas. It shares the card shell of a reasoning node and is told apart by its band: a 3px `--ref` strip, the link icon, and the REFERENCE status word, with `--ref` handles to match. Double-click or the arrow button navigate to the source canvas in the real app; here the router push is harmless.',
      },
    },
  },
  argTypes: {
    id: {
      control: false,
      table: { category: ARG_CATEGORIES.OTHER },
    },
    data: {
      control: false,
      description: 'IReferenceNodeData — source workspace, thread, and node identifiers.',
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

type Story = StoryObj<typeof ReferenceNode>;

export const Default: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Resting reference card with a mono workspace / thread breadcrumb and an arrow affordance in the band.',
      },
    },
  },
  decorators: [withCanvasStore({ nodes: [defaultReference] })],
  render: () => <SingleNodeFlow node={defaultReference} />,
};

export const Selected: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Selected via React Flow — outlined with the same `--selection` ring every node type uses.',
      },
    },
  },
  decorators: [withCanvasStore({ nodes: [selectedReference] })],
  render: () => <SingleNodeFlow node={selectedReference} />,
};

export const LongPath: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Workspace and thread names overflow the breadcrumb — both segments truncate with the slash divider preserved.',
      },
    },
  },
  decorators: [withCanvasStore({ nodes: [longPathReference] })],
  render: () => <SingleNodeFlow node={longPathReference} />,
};
