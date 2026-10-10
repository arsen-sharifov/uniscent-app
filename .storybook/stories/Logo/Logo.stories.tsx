import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { Logo } from '@/components';

import { SIZES, THEMES } from './consts';
import { ARG_CATEGORIES } from '../../consts';
import { WithPad } from '../../decorators';

const meta: Meta<typeof Logo> = {
  title: 'Branding/Logo',
  component: Logo,
  parameters: {
    docs: {
      description: {
        component:
          'Static solid-ink wordmark set in `font-grotesk` at `font-extrabold`. It paints in `currentColor`, so the surrounding text color decides its ink. Use `className` to control size and weight.',
      },
    },
  },
  argTypes: {
    className: {
      control: 'text',
      description: 'Tailwind classes applied to the logo span (e.g. `text-4xl tracking-tighter`).',
      table: { category: ARG_CATEGORIES.APPEARANCE },
    },
  },
  decorators: [WithPad],
};

export default meta;

type Story = StoryObj<typeof Logo>;

export const Default: Story = {
  args: { className: 'text-2xl' },
};

export const Sizes: Story = {
  parameters: {
    docs: {
      description: {
        story: 'The full type scale the logo is used in across the product.',
      },
    },
  },
  render: () => (
    <div className="flex flex-col items-start gap-4">
      {SIZES.map(({ label, className }) => (
        <div key={label} className="flex items-baseline gap-6">
          <span className="w-12 font-mono-ui text-[10.5px] tracking-[0.18em] text-[color:var(--text-subtle)] uppercase">
            {label}
          </span>
          <Logo className={className} />
          <code className="font-mono-ui text-[10px] tracking-[0.04em] text-[color:var(--text-muted)]">{className}</code>
        </div>
      ))}
    </div>
  ),
};

export const Themes: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'The wordmark takes the inherited text color of its surface, so it reads as ink on every theme rather than carrying a color of its own. Each tile renders the logo under a different `data-theme`.',
      },
    },
  },
  render: () => (
    <div
      data-visual-target
      className="mx-auto grid w-full max-w-[1100px] grid-cols-1 gap-3 px-8 py-10 sm:grid-cols-2 lg:grid-cols-3"
    >
      {THEMES.map((theme) => (
        <div
          key={theme}
          data-theme={theme}
          className="relative isolate flex h-40 items-center justify-center rounded-xl border border-[color:var(--border)] bg-[color:var(--app-bg)] text-[color:var(--text)]"
        >
          <Logo className="text-5xl" />
          <span className="absolute top-3 left-3 font-mono-ui text-[10px] tracking-[0.18em] text-[color:var(--text-subtle)] uppercase">
            {theme}
          </span>
          {theme === 'auto' && (
            <span className="absolute top-7 left-3 font-mono-ui text-[9px] tracking-[0.18em] text-[color:var(--text-faint)] uppercase">
              adaptive
            </span>
          )}
        </div>
      ))}
    </div>
  ),
};

export const MotionShowcase: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'The wordmark is a static solid-ink grotesk (no gradient, no motion) so it renders identically regardless of the reduced-motion preference; both tiles should look the same.',
      },
    },
  },
  render: () => (
    <div className="mx-auto grid w-full max-w-[1100px] grid-cols-1 gap-3 px-8 py-10 lg:grid-cols-2">
      <div className="relative isolate flex h-48 items-center justify-center rounded-xl border border-[color:var(--border)] bg-[color:var(--app-bg)] text-[color:var(--text)]">
        <Logo className="text-6xl" />
        <span className="absolute top-3 left-3 font-mono-ui text-[10px] tracking-[0.18em] text-[color:var(--text-subtle)] uppercase">
          motion-on
        </span>
        <span className="absolute top-7 left-3 font-mono-ui text-[9px] tracking-[0.18em] text-[color:var(--text-faint)] uppercase">
          static wordmark
        </span>
      </div>
      <div className="relative isolate flex h-48 items-center justify-center rounded-xl border border-[color:var(--border)] bg-[color:var(--app-bg)] text-[color:var(--text)] motion-reduce:[&_*]:!animate-none">
        <Logo className="text-6xl" />
        <span className="absolute top-3 left-3 font-mono-ui text-[10px] tracking-[0.18em] text-[color:var(--text-subtle)] uppercase">
          motion-reduce
        </span>
        <span className="absolute top-7 left-3 font-mono-ui text-[9px] tracking-[0.18em] text-[color:var(--text-faint)] uppercase">
          static wordmark
        </span>
      </div>
    </div>
  ),
};
