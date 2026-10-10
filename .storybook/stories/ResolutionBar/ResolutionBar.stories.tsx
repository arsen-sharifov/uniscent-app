import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { ResolutionBar } from '@/components';

import { answeredNodes } from './consts';
import { WithCanvasStage, withCanvasStore } from '../../decorators';

const meta: Meta<typeof ResolutionBar> = {
  title: 'Components/Canvas/ResolutionBar',
  component: ResolutionBar,
  parameters: {
    docs: {
      description: {
        component:
          'A discussion is resolved when at least one answer has a valid effective status. The decision-colored pill stays hidden if every answer is unvalidated, refuted or affected by an invalid dependency. The store is mocked so each state previews in isolation.',
      },
    },
  },
  decorators: [WithCanvasStage],
};

export default meta;

type Story = StoryObj<typeof ResolutionBar>;

export const Resolved: Story = {
  parameters: {
    docs: {
      description: {
        story: 'A valid answer has no invalid dependencies, so the “Resolved” pill appears at the top of the canvas.',
      },
    },
  },
  decorators: [withCanvasStore({ nodes: answeredNodes })],
  render: () => (
    <div data-visual-target>
      <ResolutionBar />
    </div>
  ),
};

export const WithoutAnswer: Story = {
  parameters: {
    docs: {
      description: {
        story: 'No answer node yet — the bar is hidden, so nothing renders at the top.',
      },
    },
  },
  decorators: [withCanvasStore({ nodes: [] })],
  render: () => <ResolutionBar />,
};
