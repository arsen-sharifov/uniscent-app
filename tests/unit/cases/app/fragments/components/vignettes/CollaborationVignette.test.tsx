import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { TRANSLATIONS } from '@mocks/i18n';
import { useVignettePhase } from '@mocks/landingHooks';
import { CollaborationVignette } from '@/app/fragments/components/vignettes';

vi.mock('@/i18n', () => import('@mocks/i18n'));
vi.mock('@/app/fragments/hooks', () => import('@mocks/landingHooks'));

afterEach(cleanup);

describe('CollaborationVignette', () => {
  describe('GIVEN the second phase of the comment demonstration', () => {
    beforeEach(() => {
      useVignettePhase.mockReturnValue(1);
    });

    describe('WHEN the vignette is displayed', () => {
      beforeEach(() => {
        render(<CollaborationVignette />);
      });

      test('THEN the discussed claim shows two comments next to its linked counterpart', () => {
        expect(
          screen.getByText(TRANSLATIONS.landing.product.vignettes.collaborationClaim).parentElement,
        ).toHaveTextContent('2');
        expect(document.querySelectorAll('svg > path[marker-end]')).toHaveLength(1);
      });
    });
  });
});
