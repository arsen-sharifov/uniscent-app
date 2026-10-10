import { event } from '@/lib/events';

export const PINNED_DURATION_MS = 600_000;

export const TOAST_TRIGGERS = [
  { label: 'Success', fire: () => event.success('Workspace created') },
  { label: 'Info', fire: () => event.info('Reference opened in a new canvas') },
  { label: 'Warning', fire: () => event.warning('You have unsaved changes') },
  { label: 'Error', fire: () => event.error(new Error('Could not reach the server')) },
];
