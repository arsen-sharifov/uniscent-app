import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import type { IComment } from '@interfaces';

import { THREAD_ID, canvasNode, comment } from '@mocks/canvas';
import { TRANSLATIONS } from '@mocks/i18n';
import { COMMENT_ACCESS, READONLY_ACCESS } from '@mocks/roles';
import { CommentsPanelContent } from '@/components/Canvas/fragments';
import { useCanvasStore, usePermissionsStore } from '@/lib/stores';

vi.mock('@/i18n', () => import('@mocks/i18n'));

const nodeCopy = TRANSLATIONS.platform.canvas.node;
const commentsCopy = TRANSLATIONS.platform.canvas.comments;

const onCommentTextChange = vi.fn();

const thread = [
  comment('c1', { authorId: 'user-1', text: 'Mine' }),
  comment('c2', { authorId: 'user-2', text: 'Theirs' }),
];

const storedComments = () =>
  useCanvasStore.getState().nodes.find((node) => node.id === 'n1')?.data.comments as IComment[] | undefined;

afterEach(() => {
  useCanvasStore.getState().clearCanvas();
  usePermissionsStore.getState().clearAccess();
});

describe('CommentsPanelContent', () => {
  describe('GIVEN a commenter reading a thread with their own and a foreign comment', () => {
    beforeEach(() => {
      usePermissionsStore.getState().setAccess('ws-1', 'user-1', COMMENT_ACCESS);
      useCanvasStore.getState().loadCanvas(THREAD_ID, { nodes: [canvasNode('n1', { comments: thread })], edges: [] });
      useCanvasStore.getState().setOpenCommentsNodeId('n1');
      render(
        <CommentsPanelContent nodeId="n1" comments={thread} commentText="" onCommentTextChange={onCommentTextChange} />,
      );
    });

    describe('WHEN the panel renders', () => {
      test('THEN both comments are listed under a counted header with delete offered only on their own', () => {
        expect(screen.getByText(nodeCopy.commentsHeader)).toHaveTextContent(`${nodeCopy.commentsHeader}2`);
        expect(screen.getByText('Mine')).toBeInTheDocument();
        expect(screen.getByText('Theirs')).toBeInTheDocument();
        expect(screen.getAllByRole('button', { name: commentsCopy.deleteAriaLabel })).toHaveLength(1);
      });

      test('THEN the composer is empty and cannot send yet', () => {
        expect(screen.getByPlaceholderText(nodeCopy.addCommentPlaceholder)).toHaveValue('');
        expect(screen.getByRole('button', { name: nodeCopy.sendComment })).toBeDisabled();
      });
    });

    describe('WHEN they type into the composer', () => {
      beforeEach(() => {
        fireEvent.change(screen.getByPlaceholderText(nodeCopy.addCommentPlaceholder), { target: { value: 'Draft' } });
      });

      test('THEN the draft is handed to the owner', () => {
        expect(onCommentTextChange).toHaveBeenCalledExactlyOnceWith('Draft');
      });
    });

    describe('WHEN they delete their own comment', () => {
      beforeEach(() => {
        fireEvent.click(screen.getByRole('button', { name: commentsCopy.deleteAriaLabel }));
      });

      test('THEN only the foreign comment remains on the node', () => {
        expect(storedComments()?.map((entry) => entry.id)).toEqual(['c2']);
      });
    });

    describe('WHEN they close the panel', () => {
      beforeEach(() => {
        fireEvent.click(screen.getByRole('button', { name: nodeCopy.closeComments }));
      });

      test('THEN the node comments are no longer open', () => {
        expect(useCanvasStore.getState().openCommentsNodeId).toBeNull();
      });
    });
  });

  describe('GIVEN a commenter with a padded draft', () => {
    beforeEach(() => {
      usePermissionsStore.getState().setAccess('ws-1', 'user-1', COMMENT_ACCESS);
      useCanvasStore.getState().loadCanvas(THREAD_ID, { nodes: [canvasNode('n1')], edges: [] });
      render(
        <CommentsPanelContent
          nodeId="n1"
          comments={[]}
          commentText="  Ship it  "
          onCommentTextChange={onCommentTextChange}
        />,
      );
    });

    describe('WHEN the draft is sent', () => {
      beforeEach(() => {
        fireEvent.click(screen.getByRole('button', { name: nodeCopy.sendComment }));
      });

      test('THEN the trimmed comment is added and the draft is cleared', () => {
        expect(storedComments()).toEqual([expect.objectContaining({ text: 'Ship it', authorId: 'user-1' })]);
        expect(onCommentTextChange).toHaveBeenCalledExactlyOnceWith('');
      });
    });
  });

  describe('GIVEN a commenter with a blank draft', () => {
    beforeEach(() => {
      usePermissionsStore.getState().setAccess('ws-1', 'user-1', COMMENT_ACCESS);
      useCanvasStore.getState().loadCanvas(THREAD_ID, { nodes: [canvasNode('n1')], edges: [] });
      render(
        <CommentsPanelContent nodeId="n1" comments={[]} commentText="   " onCommentTextChange={onCommentTextChange} />,
      );
    });

    describe('WHEN the composer form is submitted anyway', () => {
      beforeEach(() => {
        fireEvent.submit(screen.getByPlaceholderText(nodeCopy.addCommentPlaceholder));
      });

      test('THEN nothing is added and the draft is left alone', () => {
        expect(storedComments()).toEqual([]);
        expect(onCommentTextChange).not.toHaveBeenCalled();
      });
    });
  });

  describe('GIVEN a node without comments', () => {
    beforeEach(() => {
      usePermissionsStore.getState().setAccess('ws-1', 'user-1', COMMENT_ACCESS);
    });

    describe('WHEN the panel renders', () => {
      beforeEach(() => {
        render(
          <CommentsPanelContent nodeId="n1" comments={[]} commentText="" onCommentTextChange={onCommentTextChange} />,
        );
      });

      test('THEN the empty note shows and the header carries no count', () => {
        expect(screen.getByText(nodeCopy.noComments)).toBeInTheDocument();
        expect(screen.getByText(nodeCopy.commentsHeader)).toHaveTextContent(new RegExp(`^${nodeCopy.commentsHeader}$`));
      });
    });
  });

  describe('GIVEN a viewer reading comments', () => {
    beforeEach(() => {
      usePermissionsStore.getState().setAccess('ws-1', 'user-1', READONLY_ACCESS);
    });

    describe('WHEN the panel renders', () => {
      beforeEach(() => {
        render(
          <CommentsPanelContent
            nodeId="n1"
            comments={thread}
            commentText=""
            onCommentTextChange={onCommentTextChange}
          />,
        );
      });

      test('THEN the comments are readable without a composer or delete actions', () => {
        expect(screen.getByText('Mine')).toBeInTheDocument();
        expect(screen.queryByPlaceholderText(nodeCopy.addCommentPlaceholder)).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: commentsCopy.deleteAriaLabel })).not.toBeInTheDocument();
      });
    });
  });
});
