import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { AVATAR_ICONS } from '@constants';
import { Avatar } from '@/components';

import { NAME_CASES, SCRIPT_CASES } from './consts';
import {
  CommentThreadExample,
  InitialsShowcase,
  PopoverTriggerExample,
  SidebarHeaderExample,
  WorkspaceMembersExample,
} from './fragments';
import { Showcase } from '../../components';
import { ARG_CATEGORIES } from '../../consts';
import { WithPad } from '../../decorators';

const meta: Meta<typeof Avatar> = {
  title: 'Components/Avatar',
  component: Avatar,
  parameters: {
    docs: {
      description: {
        component:
          'Ringed `--accent-soft` disc showing a chosen icon or mono initials in `--accent-text`. `getInitials()` derives up to two characters; whitespace-only and empty names fall back to "U".',
      },
    },
  },
  args: {
    name: 'John Doe',
  },
  argTypes: {
    name: {
      control: 'text',
      description: 'Full name used to derive initials.',
      table: { category: ARG_CATEGORIES.CONTENT },
    },
  },
  decorators: [WithPad],
};

export default meta;

type Story = StoryObj<typeof Avatar>;

export const Default: Story = {};

export const SingleName: Story = {
  args: { name: 'Alice' },
};

export const Empty: Story = {
  args: { name: '' },
};

export const Variants: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Every case the initials algorithm handles, rendered through the shared Showcase grid.',
      },
    },
  },
  render: () => <InitialsShowcase title="Initials resolution" caption="getInitials()" cases={NAME_CASES} />,
};

export const CyrillicAndDiacritics: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Extended coverage for non-Latin scripts. Confirms initials, casing, and fit inside the disc across Cyrillic, Greek, CJK, and RTL inputs.',
      },
    },
  },
  render: () => <InitialsShowcase title="Non-Latin scripts" caption="locale scripts" cases={SCRIPT_CASES} />,
};

export const Sizes: Story = {
  parameters: {
    docs: {
      description: {
        story: 'The five sizes the Avatar ships: xs, sm, md, lg (default), xl. Sizes scale the initials uniformly.',
      },
    },
  },
  render: () => (
    <Showcase
      title="Sizes"
      caption="initials"
      columns={4}
      items={(['xs', 'sm', 'md', 'lg', 'xl'] as const).map((size) => ({
        label: size,
        hint: `size=${size}`,
        children: (
          <div className="flex h-24 w-full items-center justify-center">
            <Avatar name="Dana Park" size={size} />
          </div>
        ),
      }))}
    />
  ),
};

export const WithIcon: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Avatar with a chosen icon instead of initials. This is what users see after picking an icon in Settings → Profile.',
      },
    },
  },
  render: () => (
    <Showcase
      title="Icon variants"
      caption="20 marks"
      columns={5}
      items={AVATAR_ICONS.map(({ id }) => ({
        label: id,
        hint: 'lg',
        children: (
          <div className="flex h-24 w-full items-center justify-center">
            <Avatar name="Dana Park" icon={id} size="lg" />
          </div>
        ),
      }))}
    />
  ),
};

export const IconVsInitials: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Icon and initials side by side at every size. The icon is sized to sit with the same restraint as the letters rather than filling the circle.',
      },
    },
  },
  render: () => (
    <Showcase
      title="Icon vs initials"
      caption="matched weight"
      items={(['xs', 'sm', 'md', 'lg', 'xl'] as const).map((size) => ({
        label: size,
        hint: `size=${size}`,
        children: (
          <div className="flex h-24 w-full items-center justify-center gap-4">
            <Avatar name="Dana Park" icon="cat" size={size} />
            <Avatar name="Dana Park" size={size} />
          </div>
        ),
      }))}
    />
  ),
};

export const InContext: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Avatar embedded in the surfaces it ships in: sidebar header, comment thread, workspace member list, and a bare popover trigger.',
      },
    },
  },
  render: () => (
    <Showcase
      title="In context"
      caption="product surfaces"
      columns={2}
      items={[
        {
          label: 'Sidebar header',
          hint: 'identity',
          description: 'Compact identity row with plan caption next to the avatar.',
          children: <SidebarHeaderExample />,
        },
        {
          label: 'Comment thread',
          hint: 'timestamp',
          description: 'Aligned to the top of the comment body with a relative timestamp.',
          children: <CommentThreadExample />,
        },
        {
          label: 'Workspace members',
          hint: 'role chip',
          description: 'List row pairs the avatar with a name and a role pill.',
          span: true,
          children: <WorkspaceMembersExample />,
        },
        {
          label: 'Popover trigger',
          hint: 'standalone',
          description: 'Single avatar acting as the toggle for an account menu.',
          children: <PopoverTriggerExample />,
        },
      ]}
    />
  ),
};
