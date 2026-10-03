import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { TRANSLATIONS } from '@mocks/i18n';
import { COMMENT_ACCESS, READONLY_ACCESS } from '@mocks/roles';
import { CommentsButton } from '@/components/Canvas/fragments';
import { useCanvasStore, usePermissionsStore } from '@/lib/stores';

vi.mock('@/i18n', () => import('@mocks/i18n'));

const onPageClick = vi.fn();
const onPagePress = vi.fn();

beforeEach(() => {
  document.body.addEventListener('click', onPageClick);
  document.body.addEventListener('mousedown', onPagePress);
});

afterEach(() => {
  document.body.removeEventListener('click', onPageClick);
  document.body.removeEventListener('mousedown', onPagePress);
  useCanvasStore.getState().clearCanvas();
  usePermissionsStore.getState().clearAccess();
});

describe('CommentsButton', () => {
  describe('GIVEN a viewer on a node without comments', () => {
    beforeEach(() => {
      usePermissionsStore.getState().setAccess('ws-1', 'user-1', READONLY_ACCESS);
    });

    describe('WHEN the button would render', () => {
      beforeEach(() => {
        render(<CommentsButton nodeId="n1" count={0} />);
      });

      test('THEN nothing is shown', () => {
        expect(screen.queryByRole('button')).not.toBeInTheDocument();
      });
    });
  });

  describe('GIVEN a commenter on a node without comments', () => {
    beforeEach(() => {
      usePermissionsStore.getState().setAccess('ws-1', 'user-1', COMMENT_ACCESS);
      render(<CommentsButton nodeId="n1" count={0} />);
    });

    describe('WHEN the button renders', () => {
      test('THEN it invites a first comment without a count', () => {
        expect(screen.getByRole('button', { name: TRANSLATIONS.platform.canvas.node.addComment }).textContent).toBe('');
      });
    });

    describe('WHEN the button is clicked', () => {
      beforeEach(() => {
        fireEvent.click(screen.getByRole('button', { name: TRANSLATIONS.platform.canvas.node.addComment }));
      });

      test('THEN the node comments open without the click reaching the canvas', () => {
        expect(useCanvasStore.getState().openCommentsNodeId).toBe('n1');
        expect(onPageClick).not.toHaveBeenCalled();
      });
    });

    describe('WHEN the pointer goes down on the button', () => {
      beforeEach(() => {
        fireEvent.mouseDown(screen.getByRole('button', { name: TRANSLATIONS.platform.canvas.node.addComment }));
      });

      test('THEN the press does not reach the canvas', () => {
        expect(onPagePress).not.toHaveBeenCalled();
      });
    });
  });

  describe('GIVEN a viewer on a node whose two comments are open', () => {
    beforeEach(() => {
      usePermissionsStore.getState().setAccess('ws-1', 'user-1', READONLY_ACCESS);
      useCanvasStore.getState().setOpenCommentsNodeId('n1');
      render(<CommentsButton nodeId="n1" count={2} />);
    });

    describe('WHEN the button renders', () => {
      test('THEN it shows the comment count', () => {
        expect(screen.getByRole('button', { name: TRANSLATIONS.platform.canvas.node.viewComments })).toHaveTextContent(
          '2',
        );
      });
    });

    describe('WHEN the button is clicked', () => {
      beforeEach(() => {
        fireEvent.click(screen.getByRole('button', { name: TRANSLATIONS.platform.canvas.node.viewComments }));
      });

      test('THEN the comments close', () => {
        expect(useCanvasStore.getState().openCommentsNodeId).toBeNull();
      });
    });
  });
});
