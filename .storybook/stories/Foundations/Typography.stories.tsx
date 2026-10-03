import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { TypographyAtlas } from './fragments';

const meta: Meta = {
  title: 'Foundations/Typography',
  parameters: {
    docs: {
      description: {
        component:
          'Type system anchored on two voices: `font-grotesk` (Onest) for human content and `font-mono-ui` (JetBrains Mono) for system labels, meta and codes. Every Tailwind class is exactly what the product uses — click to copy.',
      },
    },
  },
};

export default meta;

type Story = StoryObj;

export const Scale: Story = { render: () => <TypographyAtlas /> };
