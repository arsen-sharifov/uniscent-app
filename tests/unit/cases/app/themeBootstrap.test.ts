import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { PREFERENCES_STORAGE_KEY } from '@constants';
import { THEME_BOOTSTRAP } from '@/app/themeBootstrap';

const DEFAULT_ATTRIBUTES = {
  'data-scripted': '',
  'data-theme': 'auto',
  'data-canvas-pattern': 'dots',
  'data-default-zoom': '100',
  'data-snap-to-grid': 'false',
  'data-smart-guides': 'true',
};

const readAttributes = () =>
  Object.fromEntries(
    Object.keys(DEFAULT_ATTRIBUTES).map((attribute) => [attribute, document.documentElement.getAttribute(attribute)]),
  );

afterEach(() => {
  localStorage.clear();
  Object.keys(DEFAULT_ATTRIBUTES).forEach((attribute) => document.documentElement.removeAttribute(attribute));
});

describe('THEME_BOOTSTRAP', () => {
  describe('GIVEN stored preferences with valid values', () => {
    beforeEach(() => {
      localStorage.setItem(
        PREFERENCES_STORAGE_KEY,
        JSON.stringify({
          theme: 'eclipse',
          canvasPattern: 'lines',
          defaultZoom: 125,
          snapToGrid: true,
          smartGuides: false,
        }),
      );
    });

    describe('WHEN the bootstrap script runs', () => {
      beforeEach(() => {
        new Function(THEME_BOOTSTRAP)();
      });

      test('THEN the html attributes mirror the stored preferences and mark the page as scripted', () => {
        expect(readAttributes()).toEqual({
          'data-scripted': '',
          'data-theme': 'eclipse',
          'data-canvas-pattern': 'lines',
          'data-default-zoom': '125',
          'data-snap-to-grid': 'true',
          'data-smart-guides': 'false',
        });
      });
    });
  });

  describe('GIVEN stored preferences with unknown or mistyped values', () => {
    beforeEach(() => {
      localStorage.setItem(
        PREFERENCES_STORAGE_KEY,
        JSON.stringify({ theme: 'neon', canvasPattern: 'zigzag', defaultZoom: 33, snapToGrid: 'yes', smartGuides: 0 }),
      );
    });

    describe('WHEN the bootstrap script runs', () => {
      beforeEach(() => {
        new Function(THEME_BOOTSTRAP)();
      });

      test('THEN every attribute falls back to its default', () => {
        expect(readAttributes()).toEqual(DEFAULT_ATTRIBUTES);
      });
    });
  });

  describe('GIVEN corrupted json in storage', () => {
    beforeEach(() => {
      localStorage.setItem(PREFERENCES_STORAGE_KEY, '{oops');
    });

    describe('WHEN the bootstrap script runs', () => {
      beforeEach(() => {
        new Function(THEME_BOOTSTRAP)();
      });

      test('THEN every attribute falls back to its default', () => {
        expect(readAttributes()).toEqual(DEFAULT_ATTRIBUTES);
      });
    });
  });

  describe('GIVEN empty storage', () => {
    describe('WHEN the bootstrap script runs', () => {
      beforeEach(() => {
        new Function(THEME_BOOTSTRAP)();
      });

      test('THEN every attribute falls back to its default', () => {
        expect(readAttributes()).toEqual(DEFAULT_ATTRIBUTES);
      });
    });
  });
});
