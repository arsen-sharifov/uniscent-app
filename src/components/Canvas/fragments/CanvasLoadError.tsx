'use client';

import { useTranslations } from '@/i18n';

interface ICanvasLoadErrorProps {
  onRetry: () => void;
}

export const CanvasLoadError = ({ onRetry }: ICanvasLoadErrorProps) => {
  const t = useTranslations();

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="absolute inset-0 z-20 flex items-center justify-center bg-[color:var(--app-bg)]/55 backdrop-blur-sm"
    >
      <div className="flex max-w-sm flex-col items-center gap-2 rounded-2xl border border-[color:var(--status-warning-border)] bg-[color:var(--status-warning-bg)] px-5 py-4 text-center font-grotesk shadow-[var(--shadow-modal)] backdrop-blur-xl">
        <span className="text-[12.5px] font-semibold tracking-tight text-[color:var(--status-warning)]">
          {t.platform.canvas.loadError.title}
        </span>
        <p className="text-[11.5px] leading-snug text-[color:var(--status-warning)] opacity-85">
          {t.platform.canvas.loadError.hint}
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-[color:var(--status-warning-soft)] px-3 py-1 font-mono-ui text-[10.5px] tracking-[0.04em] text-[color:var(--status-warning)] lowercase transition-colors duration-150 hover:bg-[color:var(--status-warning-border)] focus-visible:ring-2 focus-visible:ring-[color:var(--ring-focus)] focus-visible:outline-none motion-reduce:transition-none"
        >
          {t.platform.canvas.loadError.retry}
        </button>
      </div>
    </div>
  );
};
