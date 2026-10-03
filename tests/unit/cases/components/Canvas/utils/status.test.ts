import { describe, expect, test } from 'vitest';

import { NODE_ALARM_WASHES } from '@/components/Canvas/consts';
import { resolveNodeWashStyle } from '@/components/Canvas/utils';

describe('resolveNodeWashStyle', () => {
  describe('GIVEN an alarm tone', () => {
    describe('WHEN the node is at rest', () => {
      test('THEN the tone wash is painted as a flat background layer', () => {
        expect(resolveNodeWashStyle('invalid', false)).toEqual({
          backgroundImage: `linear-gradient(${NODE_ALARM_WASHES.invalid}, ${NODE_ALARM_WASHES.invalid})`,
        });
        expect(resolveNodeWashStyle('affected', false)).toEqual({
          backgroundImage: `linear-gradient(${NODE_ALARM_WASHES.affected}, ${NODE_ALARM_WASHES.affected})`,
        });
      });
    });

    describe('WHEN the node is being edited', () => {
      test('THEN no wash is painted', () => {
        expect(resolveNodeWashStyle('invalid', true)).toBeUndefined();
      });
    });
  });

  describe('GIVEN a calm tone or no tone at all', () => {
    describe('WHEN the node is at rest', () => {
      test('THEN no wash is painted', () => {
        expect(resolveNodeWashStyle('valid', false)).toBeUndefined();
        expect(resolveNodeWashStyle('answer', false)).toBeUndefined();
        expect(resolveNodeWashStyle(undefined, false)).toBeUndefined();
      });
    });
  });
});
