import type { Decorator, Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { List } from '@/components';

import { BULK_ACTION_LABELS } from './consts';
import { BulkActionsRow, ContentExample, SimpleTrigger } from './fragments';
import { ARG_CATEGORIES } from '../../consts';

const WithStage: Decorator = (Story) => (
  <div className="flex min-h-screen w-full justify-center px-8 py-16">
    <div
      data-visual-target
      className="h-fit w-80 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-elevated)] p-2"
    >
      <Story />
    </div>
  </div>
);

const meta: Meta<typeof List> = {
  title: 'Components/List',
  component: List,
  parameters: {
    docs: {
      description: {
        component:
          'Generic collapsible container with render-prop trigger. The trigger receives `(open, toggle)` so consumers can render whatever they like and decide when to call toggle. The `onToggle` action fires whenever the sample trigger flips state.',
      },
    },
  },
  args: {
    defaultOpen: false,
  },
  argTypes: {
    defaultOpen: {
      control: 'boolean',
      description: 'Whether the list starts expanded.',
      table: { category: ARG_CATEGORIES.BEHAVIOR },
    },
    trigger: {
      description: '`(open, toggle) => ReactNode` render function.',
      table: { category: ARG_CATEGORIES.CONTENT },
    },
    children: {
      description: 'Revealed content.',
      table: { category: ARG_CATEGORIES.CONTENT },
    },
  },
  decorators: [WithStage],
};

export default meta;

type Story = StoryObj<typeof List>;

export const Collapsed: Story = {
  args: {
    defaultOpen: false,
    trigger: SimpleTrigger('Click to expand', { onToggle: fn() }),
    children: <ContentExample text="Revealed content appears here." />,
  },
};

export const Expanded: Story = {
  args: {
    defaultOpen: true,
    trigger: SimpleTrigger('Section header', { onToggle: fn() }),
    children: <ContentExample text="This content is visible by default." />,
  },
};

export const Nested: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Lists composed inside other lists. Each level fires its own `onToggle` action — you can trace open/close cascades in the Actions tab.',
      },
    },
  },
  render: () => (
    <List trigger={SimpleTrigger('Parent', { onToggle: fn() })} defaultOpen>
      <div className="ml-3 space-y-0.5 border-l border-[color:var(--border)] pl-2">
        <ContentExample text="Sibling item" />
        <List trigger={SimpleTrigger('Child folder', { onToggle: fn() })} defaultOpen>
          <div className="ml-3 space-y-0.5 border-l border-[color:var(--border)] pl-2">
            <ContentExample text="Leaf item A" />
            <ContentExample text="Leaf item B" />
            <List trigger={SimpleTrigger('Deepest', { onToggle: fn() })}>
              <ContentExample text="Furthest leaf — only visible when all parents are open." />
            </List>
          </div>
        </List>
      </div>
    </List>
  ),
};

export const MultipleSiblings: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Five sibling lists. Useful for verifying that toggling one entry never affects the others.',
      },
    },
  },
  render: () => (
    <div className="space-y-1">
      {Array.from({ length: 5 }).map((_, index) => (
        <List key={index} defaultOpen={index === 0} trigger={SimpleTrigger(`Section ${index + 1}`, { onToggle: fn() })}>
          <ContentExample text={`Body of section ${index + 1}.`} />
        </List>
      ))}
    </div>
  ),
};

export const WithBulkActions: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Five rows with a checkbox + actions menu inside the trigger. Demonstrates a richer render-prop trigger where the checkbox and menu button must not propagate clicks to the toggle.',
      },
    },
  },
  render: () => {
    const onSelect = fn();
    const onMenu = fn();

    return (
      <div className="space-y-1">
        {BULK_ACTION_LABELS.map((label) => (
          <BulkActionsRow key={label} label={label} onSelect={onSelect} onMenu={onMenu} />
        ))}
      </div>
    );
  },
};

export const Animated: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Starts collapsed (`defaultOpen: false`) so the open/close grid-rows transition is visible on the first click. Use the header to toggle and watch the smooth reveal.',
      },
    },
  },
  args: {
    defaultOpen: false,
    trigger: SimpleTrigger('Click me to animate', { onToggle: fn() }),
    children: (
      <div className="space-y-1 px-3 py-2 text-[12.5px] leading-relaxed text-[color:var(--text-muted)]">
        <p>The container animates via `grid-template-rows` from `0fr` to `1fr`.</p>
        <p>No height measurement, no JS-driven keyframes — purely CSS.</p>
        <p>Toggle the header repeatedly to inspect the easing curve.</p>
      </div>
    ),
  },
};

export const LongContent: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Animation behaviour with tall payloads. The grid-rows transition keeps the list smooth even with long content.',
      },
    },
  },
  args: {
    defaultOpen: true,
    trigger: SimpleTrigger('Notes', { onToggle: fn() }),
    children: (
      <div className="space-y-1 px-3 py-2 text-[12px] leading-relaxed text-[color:var(--text-muted)]">
        {Array.from({ length: 8 }).map((_, index) => (
          <p key={index}>
            <span className="font-mono-ui text-[9.5px] tracking-[0.18em] text-[color:var(--text-subtle)] uppercase">
              ¶ {String(index + 1).padStart(2, '0')}
            </span>{' '}
            — Paragraph used to exercise the open/close transition. Each entry is intentionally short to keep the page
            readable.
          </p>
        ))}
      </div>
    ),
  },
};
