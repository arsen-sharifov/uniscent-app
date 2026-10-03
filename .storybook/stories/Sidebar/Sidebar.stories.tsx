import type { Decorator, Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { Sidebar } from '@/components';

import { deepTree, defaultWorkspaceId, flatThreads, fullTree, manyItems, workspaces } from './consts';
import { SidebarWithState } from './fragments';
import { ARG_CATEGORIES } from '../../consts';

const WithFullscreen: Decorator = (Story) => (
  <div className="relative h-screen w-screen bg-[color:var(--app-bg)]">
    <Story />
  </div>
);

const meta: Meta<typeof Sidebar> = {
  title: 'Components/Sidebar',
  component: Sidebar,
  parameters: {
    docs: {
      description: {
        component:
          'Workspace navigation rail — a floating glass panel on `--surface-glass` over `backdrop-blur-2xl`, holding a collapsible folder/thread tree. The active row takes the standard selection pair: an `--accent-soft` fill and a 3px lime strip on its left edge. Sixteen callbacks are wired to Storybook actions — open the Actions tab to inspect events while you click around.',
      },
    },
  },
  args: {
    onItemClick: fn(),
    onDeleteItem: fn(),
    onCreateThread: fn(),
    onRenameItem: fn(),
    onCreateFolder: fn(),
    onEditingComplete: fn(),
    onWorkspaceEditingComplete: fn(),
    onWorkspaceSelect: fn(),
    onCreateWorkspace: fn(),
    onRenameWorkspace: fn(),
    onDeleteWorkspace: fn(),
    onMoveWorkspace: fn(),
    onMoveItem: fn(),
    onBulkDelete: fn(),
    onBulkMove: fn(),
    onBulkDeleteWorkspaces: fn(),
  },
  argTypes: {
    workspaces: { table: { category: ARG_CATEGORIES.CONTENT } },
    activeWorkspaceId: { control: 'text', table: { category: ARG_CATEGORIES.CONTENT } },
    activeItemId: { control: 'text', table: { category: ARG_CATEGORIES.CONTENT } },
    items: { table: { category: ARG_CATEGORIES.CONTENT } },
    onItemClick: { table: { category: ARG_CATEGORIES.BEHAVIOR } },
    onDeleteItem: { table: { category: ARG_CATEGORIES.BEHAVIOR } },
    onCreateThread: { table: { category: ARG_CATEGORIES.BEHAVIOR } },
    onRenameItem: { table: { category: ARG_CATEGORIES.BEHAVIOR } },
    onCreateFolder: { table: { category: ARG_CATEGORIES.BEHAVIOR } },
    onWorkspaceSelect: { table: { category: ARG_CATEGORIES.BEHAVIOR } },
    onCreateWorkspace: { table: { category: ARG_CATEGORIES.BEHAVIOR } },
    onRenameWorkspace: { table: { category: ARG_CATEGORIES.BEHAVIOR } },
    onDeleteWorkspace: { table: { category: ARG_CATEGORIES.BEHAVIOR } },
    onMoveWorkspace: { table: { category: ARG_CATEGORIES.BEHAVIOR } },
    onMoveItem: { table: { category: ARG_CATEGORIES.BEHAVIOR } },
    onBulkDelete: { table: { category: ARG_CATEGORIES.BEHAVIOR } },
    onBulkMove: { table: { category: ARG_CATEGORIES.BEHAVIOR } },
    onBulkDeleteWorkspaces: { table: { category: ARG_CATEGORIES.BEHAVIOR } },
    onEditingComplete: { table: { category: ARG_CATEGORIES.BEHAVIOR } },
    onWorkspaceEditingComplete: { table: { category: ARG_CATEGORIES.BEHAVIOR } },
  },
  decorators: [WithFullscreen],
};

export default meta;

type Story = StoryObj<typeof Sidebar>;

export const Default: Story = {
  render: SidebarWithState,
  args: {
    items: fullTree,
    workspaces,
    activeWorkspaceId: defaultWorkspaceId,
    activeItemId: 'f1-t1',
  },
};

export const Empty: Story = {
  render: SidebarWithState,
  args: {
    items: [],
    workspaces,
    activeWorkspaceId: defaultWorkspaceId,
  },
};

export const FlatThreads: Story = {
  render: SidebarWithState,
  args: {
    items: flatThreads,
    workspaces,
    activeWorkspaceId: defaultWorkspaceId,
    activeItemId: 't2',
  },
};

export const Overflow: Story = {
  render: SidebarWithState,
  args: {
    items: manyItems,
    workspaces,
    activeWorkspaceId: defaultWorkspaceId,
    activeItemId: 'scroll-t5',
  },
};

export const DeepNesting: Story = {
  render: SidebarWithState,
  args: {
    items: deepTree,
    workspaces,
    activeWorkspaceId: defaultWorkspaceId,
    activeItemId: 'd1-f1-t1',
  },
};

export const SingleWorkspace: Story = {
  render: SidebarWithState,
  args: {
    items: fullTree,
    workspaces: [{ id: 'ws-1', name: 'My Workspace', canManageWorkspace: true }],
    activeWorkspaceId: 'ws-1',
    activeItemId: 'f1-t1',
  },
};

export const NoActiveSelection: Story = {
  parameters: {
    docs: {
      description: {
        story: 'No item highlighted. Useful for the post-creation state where the user just opened a new workspace.',
      },
    },
  },
  render: SidebarWithState,
  args: {
    items: fullTree,
    workspaces,
    activeWorkspaceId: defaultWorkspaceId,
    activeItemId: undefined,
  },
};

export const ManyWorkspaces: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Workspace switcher overflow — ensures the popover scrolls smoothly with a long workspace list.',
      },
    },
  },
  render: SidebarWithState,
  args: {
    items: fullTree,
    workspaces: Array.from({ length: 18 }, (_, index) => ({
      id: `ws-${index + 1}`,
      name: `Workspace ${index + 1}`,
      canManageWorkspace: true,
    })),
    activeWorkspaceId: 'ws-3',
    activeItemId: 'f1-t1',
  },
};

export const EditingItem: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Sidebar mounts with `editingItemId` preset to an existing thread, surfacing the inline rename field on load. Mirrors the state right after creating a new thread.',
      },
    },
  },
  render: SidebarWithState,
  args: {
    items: fullTree,
    workspaces,
    activeWorkspaceId: defaultWorkspaceId,
    activeItemId: 'f1-t1',
    editingItemId: 'f1-t1',
  },
};

export const EditingWorkspace: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Sidebar mounts with `editingWorkspaceId` preset, opening the workspace switcher in rename mode. Mirrors the state right after creating a new workspace.',
      },
    },
  },
  render: SidebarWithState,
  args: {
    items: fullTree,
    workspaces,
    activeWorkspaceId: defaultWorkspaceId,
    activeItemId: 'f1-t1',
    editingWorkspaceId: defaultWorkspaceId,
  },
};
