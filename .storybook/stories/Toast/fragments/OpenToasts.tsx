import { useEffect } from 'react';

import { Toaster } from '@/components';
import { event, useToastStore } from '@/lib/events';

import { PINNED_DURATION_MS } from '../consts';

export const OpenToasts = () => {
  useEffect(() => {
    event.success('Workspace settings saved', { duration: PINNED_DURATION_MS });
    event.info('Two teammates are viewing this thread', { duration: PINNED_DURATION_MS });
    event.warning('You are offline, changes will sync later', { duration: PINNED_DURATION_MS });
    event.error(new Error('The canvas could not be saved'), { duration: PINNED_DURATION_MS });

    return () => useToastStore.getState().clear();
  }, []);

  return <Toaster />;
};
