'use client';

import { createPortal } from 'react-dom';

import { useMounted } from '@hooks';
import { useTranslations } from '@/i18n';
import { useToastStore } from '@/lib/events';

import { ToastItem } from './fragments';

export const Toaster = () => {
  const t = useTranslations();
  const mounted = useMounted();
  const toasts = useToastStore((state) => state.toasts);
  const dismiss = useToastStore((state) => state.dismiss);

  if (!mounted) {
    return null;
  }

  return createPortal(
    <section
      aria-label={t.common.notifications}
      className="pointer-events-none fixed top-4 right-[var(--toast-safe-right)] z-90 flex w-[min(24rem,calc(100vw-var(--toast-safe-right)-1rem))] flex-col gap-2"
    >
      {[...toasts].reverse().map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
      ))}
    </section>,
    document.body,
  );
};
