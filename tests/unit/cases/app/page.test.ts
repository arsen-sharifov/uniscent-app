import { beforeEach, describe, expect, test, vi } from 'vitest';

import { generateMetadata } from '@/app/page';
import uk from '@/locales/uk.json';

const { getTranslations } = vi.hoisted(() => ({ getTranslations: vi.fn() }));

vi.mock('@/i18n/translations', () => ({ getTranslations }));

describe('generateMetadata', () => {
  describe('GIVEN a landing page request resolved to ukrainian', () => {
    beforeEach(() => {
      getTranslations.mockResolvedValue(uk);
    });

    describe('WHEN the landing page metadata is generated', () => {
      test('THEN the description speaks ukrainian and the title is left to the root layout', async () => {
        await expect(generateMetadata()).resolves.toEqual({ description: uk.common.metadata.description });
      });
    });
  });
});
