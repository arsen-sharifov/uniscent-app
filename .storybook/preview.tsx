import type { Decorator, Preview } from '@storybook/nextjs-vite';
import { NextIntlClientProvider } from 'next-intl';
import { useEffect } from 'react';

import type { TTheme } from '@interfaces';

import { mockPermissionsStore } from './utils';
import en from '../src/locales/en.json';
import '../src/app/globals.css';

const THEME_OPTIONS: { value: TTheme; title: string }[] = [
  { value: 'daybreak', title: 'Daybreak' },
  { value: 'eclipse', title: 'Eclipse' },
  { value: 'graphite', title: 'Paper' },
  { value: 'solstice', title: 'Carbon' },
  { value: 'aurora', title: 'Ember' },
  { value: 'tide', title: 'Tide' },
  { value: 'orchid', title: 'Orchid' },
  { value: 'bloom', title: 'Bloom' },
  { value: 'auto', title: 'Auto' },
];

const IntlDecorator: Decorator = (Story) => (
  <NextIntlClientProvider locale="en" messages={en}>
    <Story />
  </NextIntlClientProvider>
);

const ThemeDecorator: Decorator = (Story, context) => {
  const theme = (context.globals.theme as TTheme) || 'daybreak';
  const inStory = context.viewMode !== 'docs';

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <div
      data-theme={theme}
      className={
        inStory
          ? 'min-h-screen w-full bg-[color:var(--app-bg)] text-[color:var(--text)]'
          : 'rounded-xl border border-[color:var(--border)] bg-[color:var(--app-bg)] p-4 text-[color:var(--text)]'
      }
    >
      <Story />
    </div>
  );
};

const preview: Preview = {
  decorators: [ThemeDecorator, IntlDecorator],
  beforeEach: () => {
    mockPermissionsStore();
  },
  tags: ['autodocs'],
  globalTypes: {
    theme: {
      description: 'Active Uniscept theme',
      defaultValue: 'daybreak',
      toolbar: {
        title: 'Theme',
        icon: 'paintbrush',
        items: THEME_OPTIONS,
        dynamicTitle: true,
      },
    },
  },
  parameters: {
    layout: 'fullscreen',
    nextjs: {
      appDirectory: true,
    },
    controls: {
      matchers: {
        color: /(color)$/i,
        date: /Date$/i,
      },
    },
    options: {
      storySort: {
        order: [
          'Foundations',
          ['Colors', 'Typography', 'Themes', 'Patterns & Effects'],
          'Branding',
          'Components',
          ['Canvas', '*'],
        ],
      },
    },
  },
};

export default preview;
