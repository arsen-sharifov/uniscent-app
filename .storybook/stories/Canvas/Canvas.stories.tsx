import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { Canvas } from '@/components';

import { denseCanvas, emptyCanvas, evaluatedCanvas, reasoningCanvas, resolvedCanvas } from './consts';
import { ARG_CATEGORIES } from '../../consts';
import { WithCanvasStage, WithFittedCanvas, WithReactFlow, withCanvasStore } from '../../decorators';

const meta: Meta<typeof Canvas> = {
  title: 'Components/Canvas',
  component: Canvas,
  parameters: {
    docs: {
      description: {
        component:
          'Interactive node-based reasoning canvas powered by React Flow. In the app it hydrates from Supabase; in Storybook the store is mocked directly so every state — empty, populated, evaluated — is previewable. Stories stay interactive for dragging, connecting and right-click menus; the toolbar and its keyboard shortcuts live outside the Canvas component and are documented under Components/Toolbar.',
      },
    },
  },
  argTypes: {
    workspaceId: {
      control: 'text',
      description: 'Active workspace identifier.',
      table: { category: ARG_CATEGORIES.CONTENT },
    },
    threadId: {
      control: 'text',
      description: 'Active thread identifier.',
      table: { category: ARG_CATEGORIES.CONTENT },
    },
  },
  decorators: [WithFittedCanvas, WithCanvasStage, WithReactFlow],
};

export default meta;

type Story = StoryObj<typeof Canvas>;

export const Empty: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'A hydrated canvas with no nodes. The background pattern remains visible; save status appears only while loading or after an error.',
      },
    },
  },
  args: { workspaceId: 'sb-workspace', threadId: 'sb-empty' },
  decorators: [withCanvasStore({ threadId: 'sb-empty', nodes: emptyCanvas.nodes, edges: emptyCanvas.edges })],
};

export const WithNodes: Story = {
  parameters: {
    docs: {
      description: {
        story: 'A small reasoning graph — central question with connected arguments. Fully interactive.',
      },
    },
  },
  args: { workspaceId: 'sb-workspace', threadId: 'sb-reasoning' },
  decorators: [
    withCanvasStore({ threadId: 'sb-reasoning', nodes: reasoningCanvas.nodes, edges: reasoningCanvas.edges }),
  ],
};

export const EvaluatedPaths: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Nodes marked as valid / invalid paths, with comments attached. Edge tones reflect the effective status of the branch.',
      },
    },
  },
  args: { workspaceId: 'sb-workspace', threadId: 'sb-evaluated' },
  decorators: [
    withCanvasStore({ threadId: 'sb-evaluated', nodes: evaluatedCanvas.nodes, edges: evaluatedCanvas.edges }),
  ],
};

export const ResolvedDiscussion: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'A resolved discussion: a validated reasoning chain (each step marked valid) runs from the question to the node marked as the final answer (purple). Every edge on that route takes the answer tone, so the path to the answer reads purple while the unrelated branch stays neutral. Validity is set manually and gated, never auto-derived from the answer.',
      },
    },
  },
  args: { workspaceId: 'sb-workspace', threadId: 'sb-resolved' },
  decorators: [withCanvasStore({ threadId: 'sb-resolved', nodes: resolvedCanvas.nodes, edges: resolvedCanvas.edges })],
};

export const Dense: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Twelve nodes — useful for checking pan/zoom performance on a denser canvas.',
      },
    },
  },
  args: { workspaceId: 'sb-workspace', threadId: 'sb-dense' },
  decorators: [withCanvasStore({ threadId: 'sb-dense', nodes: denseCanvas.nodes, edges: denseCanvas.edges })],
};

export const EditorPreferences: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Editor preferences wired to the Controls panel. Toggle `snapToGrid` and `smartGuides`, then drag a node: positions lock to a 16px lattice and dashed alignment lines flash when it lines up with its neighbours.',
      },
    },
  },
  args: { workspaceId: 'sb-workspace', threadId: 'sb-editor', snapToGrid: true, smartGuides: true },
  argTypes: {
    snapToGrid: {
      control: 'boolean',
      description: 'Lock node positions to a 16px grid while dragging.',
      table: { category: ARG_CATEGORIES.BEHAVIOR },
    },
    smartGuides: {
      control: 'boolean',
      description: 'Flash alignment lines when a dragged node lines up with others.',
      table: { category: ARG_CATEGORIES.BEHAVIOR },
    },
  },
  decorators: [withCanvasStore({ threadId: 'sb-editor', nodes: reasoningCanvas.nodes, edges: reasoningCanvas.edges })],
};

export const BackendError: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'The real un-mocked component. Without a reachable Supabase instance the sync hook fails and the canvas shows its load-error overlay — this is the production failure state.',
      },
    },
  },
  args: {
    workspaceId: 'sb-workspace',
    threadId: 'sb-backend-error',
  },
};
