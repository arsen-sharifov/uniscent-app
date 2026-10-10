import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { createRootAttributeSubscription } from '@/lib/utils';

const onChange = vi.fn();

let unsubscribe: () => void;

afterEach(() => {
  document.documentElement.removeAttribute('data-watched');
  document.documentElement.removeAttribute('data-other');
});

describe('createRootAttributeSubscription', () => {
  describe('GIVEN a subscriber to one root attribute', () => {
    beforeEach(() => {
      unsubscribe = createRootAttributeSubscription(['data-watched'])(onChange);
    });

    afterEach(() => {
      unsubscribe();
    });

    describe('WHEN the watched attribute changes', () => {
      beforeEach(async () => {
        document.documentElement.setAttribute('data-watched', 'on');
        await Promise.resolve();
      });

      test('THEN the subscriber is notified', () => {
        expect(onChange).toHaveBeenCalledOnce();
      });
    });

    describe('WHEN another attribute changes', () => {
      beforeEach(async () => {
        document.documentElement.setAttribute('data-other', 'on');
        await Promise.resolve();
      });

      test('THEN the subscriber is left alone', () => {
        expect(onChange).not.toHaveBeenCalled();
      });
    });
  });

  describe('GIVEN a subscriber that has unsubscribed', () => {
    beforeEach(() => {
      createRootAttributeSubscription(['data-watched'])(onChange)();
    });

    describe('WHEN the watched attribute changes', () => {
      beforeEach(async () => {
        document.documentElement.setAttribute('data-watched', 'on');
        await Promise.resolve();
      });

      test('THEN the subscriber is not notified', () => {
        expect(onChange).not.toHaveBeenCalled();
      });
    });
  });
});
