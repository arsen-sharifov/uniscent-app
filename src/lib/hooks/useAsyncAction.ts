'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { SUCCESS_RESET_DELAY_MS } from '@constants';
import { event } from '@/lib/events';

export const useAsyncAction = () => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const run = useCallback(async (action: () => Promise<boolean | void>, title: string) => {
    setLoading(true);
    setSuccess(false);
    setErrorMessage(null);

    const outcome = await action().catch((error: unknown) => {
      event.error(error, { title, context: 'asyncAction' });

      return false;
    });

    setLoading(false);
    if (outcome === false) return;

    setSuccess(true);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setSuccess(false), SUCCESS_RESET_DELAY_MS);
  }, []);

  return {
    loading,
    success,
    error: errorMessage,
    run,
    setError: setErrorMessage,
  };
};
