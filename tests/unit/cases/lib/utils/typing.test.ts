import { beforeEach, describe, expect, test } from 'vitest';

import { isTypingTarget } from '@/lib/utils';

const editable = document.createElement('div');

describe('isTypingTarget', () => {
  describe('GIVEN a form field element', () => {
    describe('WHEN the target is checked', () => {
      test('THEN inputs, textareas and selects count as typing targets', () => {
        expect(isTypingTarget(document.createElement('input'))).toBe(true);
        expect(isTypingTarget(document.createElement('textarea'))).toBe(true);
        expect(isTypingTarget(document.createElement('select'))).toBe(true);
      });
    });
  });

  describe('GIVEN a content editable element', () => {
    beforeEach(() => {
      Object.defineProperty(editable, 'isContentEditable', { configurable: true, value: true });
    });

    describe('WHEN the target is checked', () => {
      test('THEN it counts as a typing target', () => {
        expect(isTypingTarget(editable)).toBe(true);
      });
    });
  });

  describe('GIVEN a plain element', () => {
    describe('WHEN the target is checked', () => {
      test('THEN it does not count as a typing target', () => {
        expect(isTypingTarget(document.createElement('div'))).toBe(false);
      });
    });
  });

  describe('GIVEN no target', () => {
    describe('WHEN the target is checked', () => {
      test('THEN it does not count as a typing target', () => {
        expect(isTypingTarget(null)).toBe(false);
      });
    });
  });
});
