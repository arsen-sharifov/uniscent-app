import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import type { TTheme } from '@interfaces';

import { ThemesAtlas, TypographyOnTheme } from './fragments';

const meta: Meta = {
  title: 'Foundations/Themes',
  parameters: {
    docs: {
      description: {
        component:
          'Eight themes and Auto share one token vocabulary; Daybreak and Eclipse are the pair the product ships under, and Auto resolves to one of them from the browser preference. The hero card mirrors your active toolbar theme; the strip surfaces the others. Switch the toolbar to retune everything.',
      },
    },
  },
};

export default meta;

type Story = StoryObj;

export const Atlas: Story = {
  render: (_, { globals }) => <ThemesAtlas activeTheme={(globals.theme as TTheme) || 'daybreak'} />,
};

export const Typography: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Four steps of the type scale rendered across every theme.',
      },
    },
  },
  render: (_, { globals }) => <TypographyOnTheme activeTheme={(globals.theme as TTheme) || 'daybreak'} />,
};
