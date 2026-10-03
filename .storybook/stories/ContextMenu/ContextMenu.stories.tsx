import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { ContextMenu } from '@/components';

import { ctxCanvasNode, ctxReferenceNode, edgeMenu, nodeMenu, paneMenu, referenceMenu } from './consts';
import { ARG_CATEGORIES } from '../../consts';
import { WithCanvasStage, withCanvasStore } from '../../decorators';

const noop = () => {};

const meta: Meta<typeof ContextMenu> = {
  title: 'Components/Canvas/ContextMenu',
  component: ContextMenu,
  parameters: {
    docs: {
      description: {
        component:
          'Right-click menu rendered above the canvas as an opaque `--surface` panel. Its content depends on what was right-clicked — empty pane, a regular reasoning node, a reference node, or an edge. The menu reads the target node from the store, so the relevant node is mocked per story.',
      },
    },
  },
  argTypes: {
    menu: {
      control: false,
      description: 'TCanvasContextMenu discriminated union — `pane | node | edge` with screen + flow coordinates.',
      table: { category: ARG_CATEGORIES.CONTENT },
    },
    onClose: {
      control: false,
      description: 'Fires after any action is selected or on outside-click / Escape.',
      table: { category: ARG_CATEGORIES.BEHAVIOR },
    },
  },
  decorators: [WithCanvasStage],
};

export default meta;

type Story = StoryObj<typeof ContextMenu>;

export const PaneMenu: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Right-click on empty canvas — two affordances: add a node (`N`) and drop a reference (`R`).',
      },
    },
  },
  args: { menu: paneMenu, onClose: noop },
  decorators: [withCanvasStore()],
};

export const NodeMenu: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Right-click on a regular reasoning node — status toggles, mark as answer (`A`), comment shortcut, duplicate, and delete. This fixture has no validated parent, so the valid and answer entries render disabled with their hint.',
      },
    },
  },
  args: { menu: nodeMenu, onClose: noop },
  decorators: [withCanvasStore({ nodes: [ctxCanvasNode] })],
};

export const ReferenceNodeMenu: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Right-click on a reference card — open the referenced canvas or delete the reference.',
      },
    },
  },
  args: { menu: referenceMenu, onClose: noop },
  decorators: [withCanvasStore({ nodes: [ctxReferenceNode] })],
};

export const EdgeMenu: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Right-click on an edge — single destructive action to remove the connection.',
      },
    },
  },
  args: { menu: edgeMenu, onClose: noop },
  decorators: [withCanvasStore()],
};
