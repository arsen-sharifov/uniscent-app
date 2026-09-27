import { fireEvent, render, screen } from '@testing-library/react';
import { Hand, Undo2 } from 'lucide-react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { IToolItem } from '@interfaces';

import { ToolButton } from '@/components/Toolbar/fragments';

const PAN: IToolItem = { id: 'pan', icon: Hand, label: 'Pan', shortcut: 'H' };
const UNDO: IToolItem = { id: 'undo', icon: Undo2, label: 'Undo', kind: 'action' };

const onClick = vi.fn();

const selectionMark = () => document.querySelector('span[aria-hidden]');

describe('ToolButton', () => {
  describe('GIVEN the active mode tool', () => {
    beforeEach(() => {
      render(<ToolButton tool={PAN} active onClick={onClick} />);
    });

    describe('WHEN it renders', () => {
      test('THEN it is pressed and shows the accent selection mark', () => {
        expect(screen.getByRole('button', { name: 'Pan' })).toHaveAttribute('aria-pressed', 'true');
        expect(selectionMark()).toHaveClass('opacity-100', 'bg-[color:var(--accent)]');
      });
    });
  });

  describe('GIVEN an inactive toned mode tool', () => {
    beforeEach(() => {
      render(<ToolButton tool={{ ...PAN, tone: 'success' }} active={false} onClick={onClick} />);
    });

    describe('WHEN it renders', () => {
      test('THEN the selection mark takes the tone ink and stays hidden', () => {
        expect(selectionMark()).toHaveClass('opacity-0');
        expect(selectionMark()).not.toHaveClass('bg-[color:var(--accent)]');
        expect(selectionMark()).toHaveStyle({ backgroundColor: 'var(--status-success)' });
      });
    });
  });

  describe('GIVEN an action tool', () => {
    beforeEach(() => {
      render(<ToolButton tool={UNDO} active={false} onClick={onClick} />);
    });

    describe('WHEN it is clicked', () => {
      beforeEach(() => {
        fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
      });

      test('THEN it runs and flashes', () => {
        expect(onClick).toHaveBeenCalledExactlyOnceWith('undo');
        expect(screen.getByRole('button', { name: 'Undo' })).toHaveClass('scale-[1.06]');
      });
    });
  });

  describe('GIVEN a disabled action tool', () => {
    beforeEach(() => {
      render(<ToolButton tool={{ ...UNDO, disabled: true }} active={false} onClick={onClick} />);
    });

    describe('WHEN it is clicked', () => {
      beforeEach(() => {
        fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
      });

      test('THEN nothing runs and it does not flash', () => {
        expect(onClick).not.toHaveBeenCalled();
        expect(screen.getByRole('button', { name: 'Undo' })).not.toHaveClass('scale-[1.06]');
      });
    });
  });
});
