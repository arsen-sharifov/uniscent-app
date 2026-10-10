import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Sparkles } from 'lucide-react';
import type { ComponentProps } from 'react';
import { fn } from 'storybook/test';

import { BENCHMARK_SIZES } from './consts';
import { IconGallery, ProductIconGallery } from './fragments';
import { ARG_CATEGORIES } from '../../consts';

type TIconStoryArgs = Omit<ComponentProps<typeof IconGallery>, 'onCopy'>;

const meta: Meta<TIconStoryArgs> = {
  title: 'Foundations/Icons',
  parameters: {
    docs: {
      description: {
        component:
          'Lucide icon reference with controls for size, stroke and colour. Browse the full library, review the product set or compare optical weight across benchmark sizes.',
      },
    },
  },
  args: {
    size: 18,
    strokeWidth: 1.85,
    color: undefined,
    absoluteStrokeWidth: false,
  },
  argTypes: {
    size: {
      control: { type: 'range', min: 12, max: 36, step: 1 },
      description: 'Icon size in pixels.',
      table: { category: ARG_CATEGORIES.APPEARANCE },
    },
    color: {
      control: 'color',
      description: 'Icon stroke color (leave empty to inherit `currentColor`).',
      table: { category: ARG_CATEGORIES.APPEARANCE },
    },
    strokeWidth: {
      control: { type: 'range', min: 0.5, max: 3, step: 0.05 },
      description: 'Stroke width of icon paths.',
      table: { category: ARG_CATEGORIES.APPEARANCE },
    },
    absoluteStrokeWidth: {
      control: 'boolean',
      description: 'When enabled, stroke width stays constant regardless of icon size.',
      table: { category: ARG_CATEGORIES.BEHAVIOR },
    },
  },
};

export default meta;

type Story = StoryObj<TIconStoryArgs>;

export const All: Story = {
  name: 'Gallery',
  render: (args) => <IconGallery {...args} onCopy={fn()} />,
};

export const ProductSet: Story = {
  name: 'Product set',
  parameters: {
    docs: {
      description: {
        story: 'All Lucide icons currently used across the product.',
      },
    },
  },
  render: (args) => <ProductIconGallery {...args} onCopy={fn()} />,
};

export const SizeBenchmark: Story = {
  name: 'Size benchmark',
  parameters: {
    docs: {
      description: {
        story:
          'Single icon (`Sparkles`) rendered side-by-side at 12 / 16 / 20 / 24 / 28 / 32 px so the stroke and optical weight can be compared across sizes. Stroke options from Controls still apply.',
      },
    },
  },
  render: (args) => (
    <div className="flex min-h-screen items-center justify-center bg-[color:var(--app-bg)] p-10">
      <div
        data-visual-target
        className="flex items-end gap-6 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-elevated)] px-8 py-6"
      >
        {BENCHMARK_SIZES.map((size) => (
          <div key={size} className="flex flex-col items-center gap-2 text-[color:var(--text)]">
            <Sparkles
              size={size}
              color={args.color}
              strokeWidth={args.strokeWidth}
              absoluteStrokeWidth={args.absoluteStrokeWidth}
            />
            <span className="font-mono-ui text-[10px] tracking-[0.18em] text-[color:var(--text-subtle)] uppercase">
              {size}px
            </span>
          </div>
        ))}
      </div>
    </div>
  ),
};
