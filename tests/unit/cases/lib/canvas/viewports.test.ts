import { beforeEach, describe, expect, test } from 'vitest';

import { recallViewport, rememberViewport } from '@/lib/canvas';

describe('recallViewport', () => {
  describe('GIVEN a thread whose viewport was never remembered', () => {
    describe('WHEN its viewport is recalled', () => {
      test('THEN nothing is returned', () => {
        expect(recallViewport('thread-unseen')).toBeUndefined();
      });
    });
  });

  describe('GIVEN viewports remembered for two threads', () => {
    beforeEach(() => {
      rememberViewport('thread-a', { x: 10, y: 20, zoom: 1.5 });
      rememberViewport('thread-b', { x: -40, y: 5, zoom: 0.5 });
    });

    describe('WHEN each viewport is recalled', () => {
      test('THEN every thread gets back its own viewport', () => {
        expect(recallViewport('thread-a')).toEqual({ x: 10, y: 20, zoom: 1.5 });
        expect(recallViewport('thread-b')).toEqual({ x: -40, y: 5, zoom: 0.5 });
      });
    });
  });

  describe('GIVEN a thread whose viewport is remembered twice', () => {
    beforeEach(() => {
      rememberViewport('thread-c', { x: 0, y: 0, zoom: 1 });
      rememberViewport('thread-c', { x: 300, y: 120, zoom: 2 });
    });

    describe('WHEN its viewport is recalled', () => {
      test('THEN the latest viewport wins', () => {
        expect(recallViewport('thread-c')).toEqual({ x: 300, y: 120, zoom: 2 });
      });
    });
  });
});
