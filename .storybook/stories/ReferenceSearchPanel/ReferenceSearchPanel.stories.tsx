import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { ReferenceSearchPanel } from '@/components';

import { emptyReferenceNodes, referenceNodes } from './consts';
import { ReferenceSearchFlow } from './fragments';
import { ARG_CATEGORIES } from '../../consts';
import { WithCanvasStage, WithReactFlow, withCanvasStore } from '../../decorators';

const OPEN_PANEL_STATE = { referenceSearchPosition: { x: 0, y: 0 } };

const meta: Meta<typeof ReferenceSearchPanel> = {
  title: 'Components/Canvas/ReferenceSearchPanel',
  component: ReferenceSearchPanel,
  parameters: {
    docs: {
      description: {
        component:
          'Search palette pinned to the spot where the user requested a new reference, drawn as an opaque `--surface` panel. Filters across node label, thread name, and workspace name. The store flag `referenceSearchPosition` controls visibility; here it is mocked directly so the panel renders without going through the toolbar.',
      },
    },
  },
  argTypes: {
    nodes: {
      control: false,
      description: 'INodeReference[] — pool of nodes from the active workspace.',
      table: { category: ARG_CATEGORIES.CONTENT },
    },
  },
  decorators: [WithCanvasStage, WithReactFlow, withCanvasStore(OPEN_PANEL_STATE)],
};

export default meta;

type Story = StoryObj<typeof ReferenceSearchPanel>;

export const Default: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Six candidate nodes shown — fully keyboard-navigable. The active option carries the standard selection pair: an `--accent-soft` row fill and a 3px lime strip on its left edge. Type into the input to filter live.',
      },
    },
  },
  render: () => <ReferenceSearchFlow nodes={referenceNodes} />,
};

export const Filtered: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Default mock data, but with overlapping workspaces and thread names — type `governance`, `provenance`, or `product` in the input to see the filter narrow the listbox.',
      },
    },
  },
  render: () => <ReferenceSearchFlow nodes={referenceNodes} />,
};

export const Empty: Story = {
  parameters: {
    docs: {
      description: {
        story: 'No candidates available — the empty-state slot is shown with the search-X icon.',
      },
    },
  },
  render: () => <ReferenceSearchFlow nodes={emptyReferenceNodes} />,
};
