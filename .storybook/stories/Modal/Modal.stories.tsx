import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { AlertTriangle } from 'lucide-react';
import { useArgs } from 'storybook/preview-api';
import { fn } from 'storybook/test';

import { ConfirmDialog, Modal } from '@/components';

import { TabbedModalWithState, TriggerExample } from './fragments';
import { ARG_CATEGORIES } from '../../consts';
import { WithPad } from '../../decorators';

const meta: Meta<typeof Modal> = {
  title: 'Components/Modal',
  component: Modal,
  parameters: {
    docs: {
      description: {
        component:
          'Portal-based modal built as a `--surface-panel` sheet (the `app-panel` material) over a `--scrim` backdrop, with Escape key handling and focus restoration. The `open` arg is wired through `useArgs` so the Controls panel toggles the real state.',
      },
    },
  },
  args: {
    open: false,
    overflowHidden: false,
    onClose: fn(),
  },
  argTypes: {
    open: {
      control: 'boolean',
      description: 'Whether the modal is visible.',
      table: { category: ARG_CATEGORIES.BEHAVIOR },
    },
    onClose: {
      description: 'Fired on backdrop click, Escape key, or close button.',
      table: { category: ARG_CATEGORIES.BEHAVIOR },
    },
    overflowHidden: {
      control: 'boolean',
      description: 'Hides the default × button and clips overflow.',
      table: { category: ARG_CATEGORIES.BEHAVIOR },
    },
    className: {
      control: 'text',
      description: 'Tailwind classes applied to the modal panel (e.g. `max-w-3xl`).',
      table: { category: ARG_CATEGORIES.APPEARANCE },
    },
    children: {
      description: 'Modal body content.',
      table: { category: ARG_CATEGORIES.CONTENT },
    },
  },
  decorators: [WithPad],
};

export default meta;

type Story = StoryObj<typeof Modal>;

export const Default: Story = {
  args: {
    open: false,
    children: (
      <div className="p-6">
        <h2 className="text-lg font-bold text-[color:var(--text-strong)]">Default modal</h2>
        <p className="mt-2 text-[13px] text-[color:var(--text-muted)]">
          Click the backdrop, press Escape, or use the × button to close. Each route fires{' '}
          <code className="font-mono-ui text-[11px]">onClose</code> — check the Actions tab.
        </p>
      </div>
    ),
  },
  render: function Render(args) {
    const [{ open }, updateArgs] = useArgs<typeof args>();

    const handleClose = () => {
      args.onClose?.();
      updateArgs({ open: false });
    };

    return (
      <>
        <TriggerExample onClick={() => updateArgs({ open: true })} label="Open modal" />
        <Modal {...args} open={open} onClose={handleClose} />
      </>
    );
  },
};

export const CustomWidth: Story = {
  args: {
    className: 'max-w-3xl',
    children: (
      <div className="p-8">
        <h2 className="text-lg font-bold text-[color:var(--text-strong)]">Wide modal</h2>
        <p className="mt-2 text-[13px] text-[color:var(--text-muted)]">
          The container takes any Tailwind class. Here it’s <code className="font-mono-ui text-[11px]">max-w-3xl</code>.
        </p>
      </div>
    ),
  },
  render: Default.render,
};

export const Scrollable: Story = {
  args: {
    className: 'max-w-xl',
    children: (
      <div className="px-6 py-5">
        <h2 className="text-lg font-bold text-[color:var(--text-strong)]">Scrollable content</h2>
        <p className="mt-2 text-[13px] text-[color:var(--text-muted)]">
          The modal body scrolls when content exceeds 90vh.
        </p>
        <div className="mt-4 space-y-3">
          {Array.from({ length: 30 }).map((_, index) => (
            <p key={index} className="text-[13px] leading-relaxed text-[color:var(--text)]">
              <span className="font-mono-ui text-[11px] text-[color:var(--text-subtle)]">
                ¶ {String(index + 1).padStart(2, '0')}
              </span>{' '}
              — Long-form paragraph used to test the scroll behaviour inside the modal container. Each line wraps
              naturally on smaller widths and stacks vertically.
            </p>
          ))}
        </div>
      </div>
    ),
  },
  render: Default.render,
};

export const OverflowHidden: Story = {
  args: {
    overflowHidden: true,
    children: (
      <div className="relative">
        <div className="bg-[color:var(--accent)] p-8 text-[color:var(--on-accent)]">
          <h2 className="font-grotesk text-lg font-semibold">Edge-to-edge artwork</h2>
          <p className="mt-1 text-[13px] opacity-85">
            `overflowHidden` clips children to the border-radius and hides the default × button — you must provide your
            own close affordance.
          </p>
        </div>
        <div className="p-6">
          <p className="text-[13px] text-[color:var(--text-muted)]">
            Below the hero, content lives on the normal surface.
          </p>
        </div>
      </div>
    ),
  },
  render: Default.render,
};

export const ConfirmDialogCase: Story = {
  name: 'ConfirmDialog',
  parameters: {
    docs: {
      description: {
        story:
          'Pre-built confirmation dialog using `ConfirmDialog`. `onConfirm` and `onCancel` both fire actions; use the Actions tab to see which the user chose.',
      },
    },
  },
  args: {
    open: false,
  },
  render: function Render() {
    const [{ open }, updateArgs] = useArgs<{ open: boolean }>();

    const handleConfirm = fn();
    const handleCancel = fn();

    return (
      <>
        <TriggerExample onClick={() => updateArgs({ open: true })} label="Delete workspace" />
        <ConfirmDialog
          open={open}
          title="Delete this workspace?"
          message="All canvases, references and comments inside it will be permanently removed."
          confirmLabel="Delete"
          cancelLabel="Cancel"
          onConfirm={() => {
            handleConfirm();
            updateArgs({ open: false });
          }}
          onCancel={() => {
            handleCancel();
            updateArgs({ open: false });
          }}
        />
      </>
    );
  },
};

export const FormCase: Story = {
  name: 'With form',
  parameters: {
    docs: {
      description: {
        story:
          'Modal hosting a form. Submission and cancellation each fire their own action; useful sample for settings panels.',
      },
    },
  },
  args: { open: false },
  render: function Render() {
    const [{ open }, updateArgs] = useArgs<{ open: boolean }>();
    const onSubmit = fn();

    return (
      <>
        <TriggerExample onClick={() => updateArgs({ open: true })} label="Open form modal" />
        <Modal open={open} onClose={() => updateArgs({ open: false })} className="max-w-md">
          <form
            className="p-6"
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              onSubmit(Object.fromEntries(data.entries()));
              updateArgs({ open: false });
            }}
          >
            <header className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[color:var(--accent-soft)] text-[color:var(--accent-text)]">
                <AlertTriangle className="h-4 w-4" strokeWidth={2.25} />
              </span>
              <div>
                <h2 className="text-base font-bold text-[color:var(--text-strong)]">Invite a collaborator</h2>
                <p className="text-[11.5px] text-[color:var(--text-muted)]">They’ll get an email with a join link.</p>
              </div>
            </header>
            <label className="mt-5 block">
              <span className="block font-mono-ui text-[10px] tracking-[0.18em] text-[color:var(--text-subtle)] uppercase">
                Email
              </span>
              <input
                type="email"
                name="email"
                defaultValue="alex@uniscept.app"
                className="mt-1 w-full rounded-lg border border-[color:var(--border-strong)] bg-[color:var(--surface)] px-3 py-2 text-[13px] text-[color:var(--text-strong)] outline-none focus:border-[color:var(--accent)]"
              />
            </label>
            <label className="mt-3 block">
              <span className="block font-mono-ui text-[10px] tracking-[0.18em] text-[color:var(--text-subtle)] uppercase">
                Role
              </span>
              <select
                name="role"
                defaultValue="member"
                className="mt-1 w-full rounded-lg border border-[color:var(--border-strong)] bg-[color:var(--surface)] px-3 py-2 text-[13px] text-[color:var(--text-strong)] outline-none focus:border-[color:var(--accent)]"
              >
                <option value="viewer">Viewer</option>
                <option value="member">Member</option>
                <option value="owner">Owner</option>
              </select>
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => updateArgs({ open: false })}
                className="rounded-xl px-4 py-1.5 text-[13px] font-medium text-[color:var(--text-muted)] hover:bg-[color:var(--surface-overlay)] hover:text-[color:var(--text-strong)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-xl bg-[color:var(--accent)] px-4 py-1.5 text-[13px] font-medium text-[color:var(--on-accent)] shadow-[0_6px_14px_-8px_var(--accent-glow)]"
              >
                Send invite
              </button>
            </div>
          </form>
        </Modal>
      </>
    );
  },
};

export const WithTabs: Story = {
  name: 'With tabs',
  parameters: {
    docs: {
      description: {
        story:
          'Modal hosting a small tab navigation. Each tab swaps the body — useful for settings shells that group related panels under one surface.',
      },
    },
  },
  args: { open: false, className: 'max-w-xl' },
  render: function Render(args) {
    const [{ open }, updateArgs] = useArgs<typeof args>();

    return (
      <>
        <TriggerExample onClick={() => updateArgs({ open: true })} label="Open tabbed modal" />
        <TabbedModalWithState {...args} open={open} onClose={() => updateArgs({ open: false })} />
      </>
    );
  },
};

export const MinimalConfirm: Story = {
  name: 'Minimal confirm',
  parameters: {
    docs: {
      description: {
        story:
          'Plain confirmation surface without an icon or header — just a title and two actions. Lightweight alternative to `ConfirmDialog` for low-risk choices.',
      },
    },
  },
  args: { open: false, className: 'max-w-sm' },
  render: function Render(args) {
    const [{ open }, updateArgs] = useArgs<typeof args>();
    const handleConfirm = fn();
    const handleCancel = fn();

    return (
      <>
        <TriggerExample onClick={() => updateArgs({ open: true })} label="Discard changes" />
        <Modal {...args} open={open} onClose={() => updateArgs({ open: false })}>
          <div className="p-6">
            <h2 className="text-[14px] font-semibold text-[color:var(--text-strong)]">Discard unsaved changes?</h2>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  handleCancel();
                  updateArgs({ open: false });
                }}
                className="rounded-xl px-4 py-1.5 text-[13px] font-medium text-[color:var(--text-muted)] hover:bg-[color:var(--surface-overlay)] hover:text-[color:var(--text-strong)]"
              >
                Keep editing
              </button>
              <button
                type="button"
                onClick={() => {
                  handleConfirm();
                  updateArgs({ open: false });
                }}
                className="rounded-xl bg-[color:var(--accent)] px-4 py-1.5 text-[13px] font-medium text-[color:var(--on-accent)] shadow-[0_6px_14px_-8px_var(--accent-glow)]"
              >
                Discard
              </button>
            </div>
          </div>
        </Modal>
      </>
    );
  },
};
