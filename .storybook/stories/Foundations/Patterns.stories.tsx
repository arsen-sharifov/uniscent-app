import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import type { TCanvasPattern, TTheme } from '@interfaces';
import { CANVAS_PATTERN_VALUES } from '@constants';

import { PatternsAtlas } from './fragments';
import { ARG_CATEGORIES } from '../../consts';

interface IPatternsStoryArgs {
  pattern: TCanvasPattern;
}

const meta: Meta<IPatternsStoryArgs> = {
  title: 'Foundations/Patterns & Effects',
  parameters: {
    docs: {
      description: {
        component:
          'Texture (canvas patterns), depth (shadow), shape (radius), rhythm (spacing). Patterns render through the real Background component, not faked CSS. Switch theme via the toolbar; switch pattern via Controls.',
      },
    },
  },
  args: {
    pattern: 'dots',
  },
  argTypes: {
    pattern: {
      control: { type: 'inline-radio' },
      options: [...CANVAS_PATTERN_VALUES],
      description: 'Canvas background pattern.',
      table: { category: ARG_CATEGORIES.APPEARANCE },
    },
  },
};

export default meta;

type Story = StoryObj<IPatternsStoryArgs>;

export const Effects: Story = {
  render: (args, { globals }) => (
    <PatternsAtlas pattern={args.pattern} activeTheme={(globals.theme as TTheme) || 'daybreak'} />
  ),
};
