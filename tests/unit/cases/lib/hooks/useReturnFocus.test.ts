import { type RenderHookResult, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { useReturnFocus } from '@hooks';

const trigger = document.createElement('button');
const field = document.createElement('input');

let hook: RenderHookResult<void, { active: boolean }>;

beforeEach(() => {
  document.body.append(trigger, field);
});

afterEach(() => {
  trigger.remove();
  field.remove();
});

describe('useReturnFocus', () => {
  describe('GIVEN a surface that turns active while the trigger holds focus', () => {
    beforeEach(() => {
      hook = renderHook<void, { active: boolean }>(({ active }) => useReturnFocus(active), {
        initialProps: { active: false },
      });
      trigger.focus();
      hook.rerender({ active: true });
      field.focus();
    });

    describe('WHEN it turns inactive', () => {
      beforeEach(() => {
        hook.rerender({ active: false });
      });

      test('THEN focus returns to the trigger', () => {
        expect(document.activeElement).toBe(trigger);
      });
    });

    describe('WHEN it unmounts while still active', () => {
      beforeEach(() => {
        hook.unmount();
      });

      test('THEN focus returns to the trigger', () => {
        expect(document.activeElement).toBe(trigger);
      });
    });
  });

  describe('GIVEN a surface mounted active while the trigger holds focus', () => {
    beforeEach(() => {
      trigger.focus();
      hook = renderHook<void, { active: boolean }>(({ active }) => useReturnFocus(active), {
        initialProps: { active: true },
      });
      field.focus();
    });

    describe('WHEN it unmounts', () => {
      beforeEach(() => {
        hook.unmount();
      });

      test('THEN focus returns to the trigger', () => {
        expect(document.activeElement).toBe(trigger);
      });
    });
  });

  describe('GIVEN a surface that never turned active', () => {
    beforeEach(() => {
      trigger.focus();
      hook = renderHook<void, { active: boolean }>(({ active }) => useReturnFocus(active), {
        initialProps: { active: false },
      });
      field.focus();
    });

    describe('WHEN it unmounts', () => {
      beforeEach(() => {
        hook.unmount();
      });

      test('THEN focus stays where the user put it', () => {
        expect(document.activeElement).toBe(field);
      });
    });
  });
});
