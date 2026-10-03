import { describe, expect, test } from 'vitest';

import en from '@/locales/en.json';
import es from '@/locales/es.json';
import fr from '@/locales/fr.json';
import pt from '@/locales/pt.json';
import ro from '@/locales/ro.json';
import uk from '@/locales/uk.json';

const collectKeys = (dictionary: object, prefix = ''): string[] =>
  Object.entries(dictionary).flatMap(([key, value]) =>
    typeof value === 'object' && value !== null ? collectKeys(value, `${prefix}${key}.`) : [`${prefix}${key}`],
  );

const collectMessages = (dictionary: object, prefix = ''): Array<[string, string]> =>
  Object.entries(dictionary).flatMap(([key, value]): Array<[string, string]> => {
    if (typeof value === 'object' && value !== null) return collectMessages(value, `${prefix}${key}.`);
    if (typeof value !== 'string') return [];

    return [[`${prefix}${key}`, value]];
  });

const EN_MESSAGES = new Map(collectMessages(en));

const placeholdersOf = (message: string): string =>
  [...message.matchAll(/\{\s*(\w+)\s*[,}]/g)]
    .map((match) => match[1] ?? '')
    .sort()
    .join(',');

const placeholderMismatches = (dictionary: object): string[] =>
  collectMessages(dictionary)
    .filter(([path, message]) => {
      const source = EN_MESSAGES.get(path);

      return source !== undefined && placeholdersOf(source) !== placeholdersOf(message);
    })
    .map(([path]) => path);

describe('locales', () => {
  describe('GIVEN the en reference dictionary', () => {
    describe('WHEN comparing the uk dictionary', () => {
      test('THEN it has exactly the same keys', () => {
        expect(collectKeys(uk).sort()).toEqual(collectKeys(en).sort());
      });

      test('THEN every message keeps the en placeholders', () => {
        expect(placeholderMismatches(uk)).toEqual([]);
      });
    });

    describe('WHEN comparing the ro dictionary', () => {
      test('THEN it has exactly the same keys', () => {
        expect(collectKeys(ro).sort()).toEqual(collectKeys(en).sort());
      });

      test('THEN every message keeps the en placeholders', () => {
        expect(placeholderMismatches(ro)).toEqual([]);
      });
    });

    describe('WHEN comparing the fr dictionary', () => {
      test('THEN it has exactly the same keys', () => {
        expect(collectKeys(fr).sort()).toEqual(collectKeys(en).sort());
      });

      test('THEN every message keeps the en placeholders', () => {
        expect(placeholderMismatches(fr)).toEqual([]);
      });
    });

    describe('WHEN comparing the es dictionary', () => {
      test('THEN it has exactly the same keys', () => {
        expect(collectKeys(es).sort()).toEqual(collectKeys(en).sort());
      });

      test('THEN every message keeps the en placeholders', () => {
        expect(placeholderMismatches(es)).toEqual([]);
      });
    });

    describe('WHEN comparing the pt dictionary', () => {
      test('THEN it has exactly the same keys', () => {
        expect(collectKeys(pt).sort()).toEqual(collectKeys(en).sort());
      });

      test('THEN every message keeps the en placeholders', () => {
        expect(placeholderMismatches(pt)).toEqual([]);
      });
    });
  });
});
