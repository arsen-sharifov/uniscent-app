import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test } from 'vitest';

import { stubResizeObserver } from '@mocks/browser';
import { useExpandableLabel } from '@/components/Canvas/hooks';

const labelElement = (scrollHeight: number, clientHeight: number) => {
  const element = document.createElement('p');
  Object.defineProperty(element, 'scrollHeight', { configurable: true, value: scrollHeight });
  Object.defineProperty(element, 'clientHeight', { configurable: true, value: clientHeight });

  return element;
};

let observer: ReturnType<typeof stubResizeObserver>;
let label: { current: ReturnType<typeof useExpandableLabel> };
let unmountLabel: () => void;

beforeEach(() => {
  observer = stubResizeObserver();
});

describe('useExpandableLabel', () => {
  describe('GIVEN a label taller than its clamp', () => {
    let element: HTMLParagraphElement;

    beforeEach(() => {
      element = labelElement(200, 100);
      const view = renderHook(() => useExpandableLabel());

      label = view.result;
      unmountLabel = view.unmount;
    });

    describe('WHEN the label mounts', () => {
      beforeEach(() => {
        act(() => label.current.labelRefCallback(element));
      });

      test('THEN it is measured, watched for resizes and offered as expandable while collapsed', () => {
        expect(observer.observe).toHaveBeenCalledExactlyOnceWith(element);
        expect(label.current.expandable).toBe(true);
        expect(label.current.expanded).toBe(false);
      });
    });

    describe('WHEN the label is expanded and collapsed again', () => {
      let expandedAfterFirstToggle: boolean;

      beforeEach(() => {
        act(() => label.current.labelRefCallback(element));
        act(() => label.current.toggleExpanded());
        expandedAfterFirstToggle = label.current.expanded;
        act(() => label.current.toggleExpanded());
      });

      test('THEN the expanded flag flips each time', () => {
        expect(expandedAfterFirstToggle).toBe(true);
        expect(label.current.expanded).toBe(false);
      });
    });

    describe('WHEN the label unmounts from the page', () => {
      beforeEach(() => {
        act(() => label.current.labelRefCallback(element));
        act(() => label.current.labelRefCallback(null));
      });

      test('THEN the resize watch is released', () => {
        expect(observer.disconnect).toHaveBeenCalledOnce();
      });
    });

    describe('WHEN the owning component unmounts', () => {
      beforeEach(() => {
        act(() => label.current.labelRefCallback(element));
        unmountLabel();
      });

      test('THEN the resize watch is released', () => {
        expect(observer.disconnect).toHaveBeenCalledOnce();
      });
    });
  });

  describe('GIVEN a label that fits its clamp', () => {
    let element: HTMLParagraphElement;

    beforeEach(() => {
      element = labelElement(100, 100);
      label = renderHook(() => useExpandableLabel()).result;
    });

    describe('WHEN the label mounts', () => {
      beforeEach(() => {
        act(() => label.current.labelRefCallback(element));
      });

      test('THEN the label is not expandable', () => {
        expect(label.current.expandable).toBe(false);
      });
    });

    describe('WHEN the mounted label grows past the clamp', () => {
      beforeEach(() => {
        act(() => label.current.labelRefCallback(element));
        Object.defineProperty(element, 'scrollHeight', { configurable: true, value: 180 });
        act(() => observer.resize());
      });

      test('THEN it becomes expandable', () => {
        expect(label.current.expandable).toBe(true);
      });
    });

    describe('WHEN the mounted label is expanded by hand', () => {
      beforeEach(() => {
        act(() => label.current.labelRefCallback(element));
        act(() => label.current.toggleExpanded());
      });

      test('THEN it stays expandable so it can collapse again', () => {
        expect(label.current.expandable).toBe(true);
      });
    });
  });

  describe('GIVEN a disabled label taller than its clamp', () => {
    let element: HTMLParagraphElement;

    beforeEach(() => {
      element = labelElement(200, 100);
      label = renderHook(() => useExpandableLabel(false)).result;
    });

    describe('WHEN the label mounts', () => {
      beforeEach(() => {
        act(() => label.current.labelRefCallback(element));
      });

      test('THEN it is neither watched nor expandable', () => {
        expect(observer.observe).not.toHaveBeenCalled();
        expect(label.current.expandable).toBe(false);
      });
    });

    describe('WHEN the mounted label is toggled', () => {
      beforeEach(() => {
        act(() => label.current.labelRefCallback(element));
        act(() => label.current.toggleExpanded());
      });

      test('THEN it still is not expandable', () => {
        expect(label.current.expandable).toBe(false);
      });
    });
  });
});
