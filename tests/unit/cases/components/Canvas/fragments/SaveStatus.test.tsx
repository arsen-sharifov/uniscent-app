import { render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';

import type { ISaveState } from '@interfaces';

import { TRANSLATIONS } from '@mocks/i18n';
import { SaveStatus } from '@/components/Canvas/fragments';

vi.mock('@/i18n', () => import('@mocks/i18n'));

const saveCopy = TRANSLATIONS.platform.canvas.save;

const saveState = (overrides: Partial<ISaveState>): ISaveState => ({
  status: 'idle',
  lastSavedAt: null,
  retryAttempt: 0,
  pendingCount: 0,
  failedCount: 0,
  ...overrides,
});

describe('SaveStatus', () => {
  describe('GIVEN a save that is being retried', () => {
    describe('WHEN the second attempt is running', () => {
      test('THEN a polite status output names the retry and its attempt', () => {
        render(<SaveStatus state={saveState({ status: 'retrying', retryAttempt: 2 })} />);

        expect(screen.getByRole('status', { name: saveCopy.retrying })).toHaveTextContent('Attempt 2');
        expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
        expect(screen.getByRole('status').tagName).toBe('OUTPUT');
      });
    });
  });

  describe('GIVEN a canvas that went offline with pending changes', () => {
    describe('WHEN the status renders', () => {
      test('THEN a polite status output counts the pending changes', () => {
        render(<SaveStatus state={saveState({ status: 'offline', pendingCount: 3 })} />);

        expect(screen.getByRole('status', { name: saveCopy.offline })).toHaveTextContent('3 changes pending');
      });
    });
  });

  describe('GIVEN a save that failed', () => {
    describe('WHEN the status renders', () => {
      test('THEN an assertive alert offers retry and discard', () => {
        render(<SaveStatus state={saveState({ status: 'error' })} />);

        expect(screen.getByRole('alert', { name: saveCopy.errorTitle })).toHaveAttribute('aria-live', 'assertive');
        expect(screen.getByRole('button', { name: saveCopy.retryAriaLabel })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: saveCopy.discardAriaLabel })).toBeInTheDocument();
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
      });
    });
  });

  describe('GIVEN a save that went through', () => {
    describe('WHEN the status renders', () => {
      test('THEN nothing is shown', () => {
        const { container } = render(<SaveStatus state={saveState({ status: 'saved', lastSavedAt: 1 })} />);

        expect(container).toBeEmptyDOMElement();
      });
    });
  });
});
