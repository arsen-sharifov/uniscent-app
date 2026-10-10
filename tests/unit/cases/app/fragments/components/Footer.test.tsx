import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { TRANSLATIONS } from '@mocks/i18n';
import { Footer } from '@/app/fragments/components';

vi.mock('@/i18n', () => import('@mocks/i18n'));

afterEach(() => {
  vi.useRealTimers();
});

describe('Footer', () => {
  describe('GIVEN a page rendered in a later year than the one its module loaded in', () => {
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date('2031-01-01T12:00:00Z'));
    });

    describe('WHEN it renders', () => {
      beforeEach(() => {
        render(<Footer />);
      });

      test('THEN the copyright shows the current year', () => {
        expect(screen.getByText(`© 2031 ${TRANSLATIONS.landing.header.logo}`)).toBeInTheDocument();
      });
    });
  });
});
