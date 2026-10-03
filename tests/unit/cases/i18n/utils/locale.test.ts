import { describe, expect, test } from 'vitest';

import { isLocale, negotiateLocale } from '@/i18n/utils';

describe('negotiateLocale', () => {
  describe('GIVEN a browser asking for a supported language', () => {
    describe('WHEN the header is negotiated', () => {
      test('THEN the region is dropped and the base language wins', () => {
        expect(negotiateLocale('uk-UA,uk;q=0.9,en-US;q=0.8')).toBe('uk');
      });
    });
  });

  describe('GIVEN a browser that lists an unsupported language before supported ones', () => {
    describe('WHEN the header is negotiated', () => {
      test('THEN the first supported language in its order of preference wins', () => {
        expect(negotiateLocale('de-DE,de;q=0.9,fr;q=0.5,uk;q=0.2')).toBe('fr');
      });
    });
  });

  describe('GIVEN nothing to go on', () => {
    describe('WHEN the header is missing, empty or only unsupported', () => {
      test('THEN english carries the page', () => {
        expect(negotiateLocale(null)).toBe('en');
        expect(negotiateLocale('')).toBe('en');
        expect(negotiateLocale('*')).toBe('en');
        expect(negotiateLocale('de-DE,de;q=0.9')).toBe('en');
      });
    });
  });
});

describe('isLocale', () => {
  describe('GIVEN a stored value', () => {
    describe('WHEN it is checked', () => {
      test('THEN only a supported language code passes', () => {
        expect(isLocale('uk')).toBe(true);
        expect(isLocale('de')).toBe(false);
        expect(isLocale(undefined)).toBe(false);
      });
    });
  });
});
