import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { Mascot } from '@/components';

import { MASCOT_CHARACTER_IDS, MASCOT_POSE_IDS } from './consts';
import { BesideWindow, PoseShowcase } from './fragments';
import { ARG_CATEGORIES } from '../../consts';
import { WithPad } from '../../decorators';

const meta: Meta<typeof Mascot> = {
  title: 'Components/Mascot',
  component: Mascot,
  parameters: {
    docs: {
      description: {
        component:
          'Draws either of the two onboarding mascots as an inline SVG. Nodi, the default character, is shaped like the canvas node it is named after: a rounded card with an `--accent` cap across the top and round eyes. Ergo has a round head with an `--accent-2` antenna and taller oval eyes. Both bodies are filled with an opaque `--surface` and outlined in `--border-strong`, with two `--text-strong` eyes and four `--text-muted` limbs drawn behind the body, so only the parts that stick out show. Every color is a theme token, so both characters read in all eight themes. The mascot floats, blinks and swings its arms, and all of that motion stops under reduced motion.',
      },
    },
  },
  argTypes: {
    pose: {
      control: 'inline-radio',
      options: MASCOT_POSE_IDS,
      description: 'Pose to draw, which sets the arms, the eyes and the sway speed. Defaults to `idle`.',
      table: { category: ARG_CATEGORIES.APPEARANCE },
    },
    character: {
      control: 'inline-radio',
      options: MASCOT_CHARACTER_IDS,
      description: 'Which mascot to draw. Defaults to `nodi`.',
      table: { category: ARG_CATEGORIES.APPEARANCE },
    },
    label: {
      control: 'text',
      description: 'Accessible name announced for the mascot.',
      table: { category: ARG_CATEGORIES.CONTENT },
    },
  },
  decorators: [WithPad],
};

export default meta;

type Story = StoryObj<typeof Mascot>;

export const Idle: Story = {
  args: { pose: 'idle', character: 'nodi', label: 'Nodi, your guide' },
  render: ({ pose, character, label }) => (
    <Mascot pose={pose} character={character} label={label} className="h-24 w-24" />
  ),
};

export const NodiPoses: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Nodi in the four poses. In `idle` both arms hang, `point` reaches the arm on the right straight out, `think` raises that arm and lifts the eyes, and `cheer` raises both arms and turns the eyes into arcs. `point` and `cheer` also swing their arms faster.',
      },
    },
  },
  render: () => <PoseShowcase character="nodi" />,
};

export const ErgoPoses: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Ergo in the same four poses, with the same limbs and motion. Only the body differs: a round head instead of the card, an `--accent-2` antenna instead of the accent cap, and taller oval eyes.',
      },
    },
  },
  render: () => <PoseShowcase character="ergo" />,
};

export const NodiBesideTheWindow: Story = {
  args: { pose: 'point' },
  parameters: {
    docs: {
      story: { inline: false },
      description: {
        story:
          'Nodi in the real `TourStepCard`. It stands to the left of the card with its feet on the bottom edge of the card, so the `point` pose reaches toward it.',
      },
    },
  },
  render: ({ pose = 'point' }) => <BesideWindow pose={pose} character="nodi" />,
};

export const ErgoBesideTheWindow: Story = {
  args: { pose: 'point' },
  parameters: {
    docs: {
      story: { inline: false },
      description: {
        story:
          'The same card with Ergo as the speaker. Ergo stands to the right of the card, mirrored so the pointing arm faces it, and the card shows the speaker name in `--accent-2` before the step counter.',
      },
    },
  },
  render: ({ pose = 'point' }) => <BesideWindow pose={pose} character="ergo" />,
};
