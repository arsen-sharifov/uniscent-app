import type { Metadata } from 'next';
import { JetBrains_Mono, Onest } from 'next/font/google';
import { headers } from 'next/headers';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale } from 'next-intl/server';
import type { ReactNode } from 'react';

import { DEFAULT_PREFERENCES } from '@constants';
import { EventBoundary } from '@/components/EventBoundary';

import { THEME_BOOTSTRAP } from './themeBootstrap';
import './globals.css';

export const metadata: Metadata = {
  title: 'Uniscept',
  description: 'A platform for structured discussions and argument mapping',
};

const heroSans = Onest({
  subsets: ['latin', 'latin-ext', 'cyrillic'],
  variable: '--font-hero-sans',
});

const heroMono = JetBrains_Mono({
  subsets: ['latin', 'latin-ext', 'cyrillic'],
  variable: '--font-hero-mono',
});

const RootLayout = async ({ children }: Readonly<{ children: ReactNode }>) => {
  const locale = await getLocale();
  const nonce = (await headers()).get('x-nonce') ?? undefined;

  return (
    <html
      lang={locale}
      className="scroll-smooth"
      data-scroll-behavior="smooth"
      data-theme={DEFAULT_PREFERENCES.theme}
      data-canvas-pattern={DEFAULT_PREFERENCES.canvasPattern}
      suppressHydrationWarning
    >
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      </head>
      <body
        className={`${heroSans.variable} ${heroMono.variable} bg-[color:var(--app-bg)] font-grotesk text-[color:var(--text)] antialiased`}
      >
        <NextIntlClientProvider>
          <EventBoundary>{children}</EventBoundary>
        </NextIntlClientProvider>
      </body>
    </html>
  );
};

export default RootLayout;
