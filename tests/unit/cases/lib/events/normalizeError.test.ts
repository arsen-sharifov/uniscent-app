import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { normalizeError } from '@/lib/events/normalizeError';

const BOOM = new Error('boom');

afterEach(() => {
  Reflect.deleteProperty(window.navigator, 'onLine');
});

describe('normalizeError', () => {
  describe('GIVEN an error with a known database code', () => {
    describe('WHEN it is normalized', () => {
      test('THEN the category follows the code map', () => {
        expect(normalizeError({ code: '23505', message: 'duplicate key' })).toMatchObject({
          category: 'validation',
          message: 'duplicate key',
        });
        expect(normalizeError({ code: 'PGRST116', message: 'no rows' })).toMatchObject({ category: 'notFound' });
      });
    });
  });

  describe('GIVEN a write rejected by a database check constraint', () => {
    describe('WHEN it is normalized', () => {
      test('THEN the category is validation', () => {
        expect(
          normalizeError({ code: '23514', message: 'new row for relation "threads" violates check constraint' }),
        ).toMatchObject({ category: 'validation' });
      });
    });
  });

  describe('GIVEN an invitation refused because the workspace reached its pending invitation limit', () => {
    describe('WHEN it is normalized', () => {
      test('THEN the category is limitReached', () => {
        expect(normalizeError({ code: '54000', message: 'too many pending invitations' })).toMatchObject({
          category: 'limitReached',
        });
      });
    });
  });

  describe('GIVEN an account deletion refused while the user owns workspaces shared with others', () => {
    describe('WHEN it is normalized', () => {
      test('THEN the route code wins over the conflict status', () => {
        expect(normalizeError({ code: 'owns_shared_workspaces', status: 409, message: 'Conflict' })).toMatchObject({
          category: 'ownsSharedWorkspaces',
        });
      });
    });
  });

  describe('GIVEN an error with a known auth code', () => {
    describe('WHEN it is normalized', () => {
      test('THEN the category follows the code map', () => {
        expect(normalizeError({ code: 'invalid_credentials', message: 'nope' })).toMatchObject({
          category: 'invalidCredentials',
        });
      });
    });
  });

  describe('GIVEN a password update refused because the current password is missing or wrong', () => {
    describe('WHEN it is normalized', () => {
      test('THEN the category is invalidCredentials, like the route pre-check', () => {
        expect(normalizeError({ code: 'current_password_required', status: 400, message: 'required' })).toMatchObject({
          category: 'invalidCredentials',
        });
        expect(normalizeError({ code: 'current_password_mismatch', status: 400, message: 'mismatch' })).toMatchObject({
          category: 'invalidCredentials',
        });
      });
    });
  });

  describe('GIVEN a stale session rejected by auth with a non-auth status', () => {
    describe('WHEN it is normalized', () => {
      test('THEN the category is auth, not the status category', () => {
        expect(normalizeError({ code: 'bad_jwt', status: 403, message: 'invalid JWT' })).toMatchObject({
          category: 'auth',
        });
        expect(normalizeError({ code: 'refresh_token_already_used', status: 400, message: 'used' })).toMatchObject({
          category: 'auth',
        });
      });
    });
  });

  describe('GIVEN an error with only an http status', () => {
    describe('WHEN it is normalized', () => {
      test('THEN the category follows the status map', () => {
        expect(normalizeError({ status: 403, message: 'forbidden' })).toMatchObject({ category: 'permission' });
        expect(normalizeError({ status: 404, message: 'missing' })).toMatchObject({ category: 'notFound' });
        expect(normalizeError({ status: 429, message: 'slow down' })).toMatchObject({ category: 'rateLimit' });
      });
    });
  });

  describe('GIVEN an error with both a code and a status', () => {
    describe('WHEN it is normalized', () => {
      test('THEN the code takes precedence', () => {
        expect(normalizeError({ code: '42501', status: 404, message: 'denied' })).toMatchObject({
          category: 'permission',
        });
      });
    });
  });

  describe('GIVEN an error with an unmapped code and a mapped status', () => {
    describe('WHEN it is normalized', () => {
      test('THEN the status map is used as a fallback', () => {
        expect(normalizeError({ code: 'not_a_real_code', status: 404, message: 'missing' })).toMatchObject({
          category: 'notFound',
        });
      });
    });
  });

  describe('GIVEN a fetch failure message', () => {
    describe('WHEN it is normalized', () => {
      test('THEN the category is network', () => {
        expect(normalizeError(new TypeError('Failed to fetch'))).toMatchObject({ category: 'network' });
      });
    });
  });

  describe('GIVEN an offline browser', () => {
    beforeEach(() => {
      Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: false });
    });

    describe('WHEN an unremarkable error is normalized', () => {
      test('THEN the category is network', () => {
        expect(normalizeError({ message: 'something broke' })).toMatchObject({ category: 'network' });
      });
    });
  });

  describe('GIVEN a plain error without markers', () => {
    describe('WHEN it is normalized', () => {
      test('THEN the category is unknown and the cause is preserved', () => {
        expect(normalizeError(BOOM)).toEqual({ category: 'unknown', message: 'boom', cause: BOOM });
      });
    });
  });

  describe('GIVEN a non-object value', () => {
    describe('WHEN it is normalized', () => {
      test('THEN the message is stringified', () => {
        expect(normalizeError('boom')).toMatchObject({ category: 'unknown', message: 'boom' });
      });
    });
  });
});
