'use client';

import { clsx } from 'clsx';
import { Check, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

import type { TLocale } from '@interfaces';

import { useLocale, useTranslations, LOCALES, setLocale } from '@/i18n';
import { awardBadge } from '@/lib/badges';
import { event } from '@/lib/events';

interface ILanguagePickerProps {
  onChange: (value: TLocale) => void;
}

export const LanguagePicker = ({ onChange }: ILanguagePickerProps) => {
  const t = useTranslations();
  const activeLocale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const handleLocaleChange = (next: TLocale) => {
    if (next === activeLocale) return;

    startTransition(async () => {
      try {
        await setLocale(next);
      } catch (error) {
        event.error(error, { title: t.common.errorTitles.saveFailed, context: 'settings.setLocale' });

        return;
      }

      onChange(next);
      awardBadge('linguist');
      document.documentElement.setAttribute('lang', next);
      router.refresh();
    });
  };

  return (
    <section>
      <header className="mb-3 flex items-center justify-between">
        <h3 className="font-mono-ui text-[10px] font-bold tracking-[0.14em] text-[color:var(--text-label)] uppercase">
          {t.platform.settings.appearance.language}
        </h3>
        <span
          className={clsx(
            'flex h-5 w-5 items-center justify-center text-[color:var(--accent-text)] transition-opacity duration-150 motion-reduce:transition-none',
            pending ? 'opacity-100 delay-150' : 'opacity-0',
          )}
          aria-hidden
        >
          <Loader2 className="h-3 w-3 animate-spin motion-reduce:animate-none" strokeWidth={2} />
        </span>
      </header>

      <output aria-live="polite" className="sr-only">
        {pending && t.platform.settings.languageSaving}
      </output>

      <div aria-busy={pending} className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {LOCALES.map((locale) => {
          const isActive = locale === activeLocale;

          return (
            <button
              key={locale}
              type="button"
              disabled={pending}
              onClick={() => handleLocaleChange(locale)}
              aria-pressed={isActive}
              className={clsx(
                'group relative flex items-center gap-2.5 rounded-xl border px-3 py-1.5 text-left transition-[border-color,background-color,transform] duration-200 ease-out',
                'focus-visible:ring-2 focus-visible:ring-[color:var(--ring-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--surface)] focus-visible:outline-none',
                'motion-reduce:transition-none motion-reduce:hover:translate-y-0',
                pending ? 'cursor-wait' : 'cursor-pointer hover:-translate-y-px active:translate-y-0',
                isActive
                  ? 'border-[color:var(--border-active)] bg-[color:var(--accent-soft)]'
                  : 'border-[color:var(--border)] bg-[color:var(--surface-elevated)]',
                !isActive &&
                  !pending &&
                  'hover:border-[color:var(--border-strong)] hover:bg-[color:var(--surface-overlay)]',
              )}
            >
              <span
                aria-hidden
                className={clsx(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg font-mono-ui text-[10.5px] font-semibold tracking-[0.06em] transition-colors duration-200 ease-out motion-reduce:transition-none',
                  isActive
                    ? 'bg-[color:var(--accent-soft)] text-[color:var(--accent-text)]'
                    : 'bg-[color:var(--surface-overlay)] text-[color:var(--text-muted)]',
                )}
              >
                {locale.toUpperCase()}
              </span>

              <span
                className={clsx(
                  'min-w-0 flex-1 truncate text-[13px] font-medium tracking-tight transition-colors duration-200 ease-out motion-reduce:transition-none',
                  isActive ? 'text-[color:var(--accent-text)]' : 'text-[color:var(--text)]',
                )}
              >
                {t.platform.settings.appearance.languages[locale]}
              </span>

              <span
                aria-hidden={!isActive}
                className={clsx(
                  'flex h-4 w-4 shrink-0 items-center justify-center text-[color:var(--accent-text)] transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none',
                  isActive ? 'scale-100 opacity-100' : 'scale-50 opacity-0',
                )}
              >
                <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
};
