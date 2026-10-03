'use client';

import { MessageSquare, Send, X } from 'lucide-react';
import type { SubmitEvent } from 'react';

import type { IComment } from '@interfaces';

import { useTranslations } from '@/i18n';
import { MAX_COMMENT_LENGTH } from '@/lib/canvas';
import { useCanvasStore, usePermissionsStore } from '@/lib/stores';

import { CommentItem } from './CommentItem';

interface ICommentsPanelContentProps {
  nodeId: string;
  comments: IComment[];
  commentText: string;
  onCommentTextChange: (commentText: string) => void;
}

export const CommentsPanelContent = ({
  nodeId,
  comments,
  commentText,
  onCommentTextChange,
}: ICommentsPanelContentProps) => {
  const t = useTranslations();

  const setOpenCommentsNodeId = useCanvasStore((state) => state.setOpenCommentsNodeId);
  const addComment = useCanvasStore((state) => state.addComment);
  const deleteComment = useCanvasStore((state) => state.deleteComment);
  const userId = usePermissionsStore((state) => state.userId);
  const canComment = usePermissionsStore((state) => state.canComment);

  const handleCommentSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = commentText.trim();
    if (!trimmed) return;

    addComment(nodeId, trimmed);
    onCommentTextChange('');
  };

  return (
    <>
      <div className="flex items-center justify-between border-b border-[color:var(--border)] px-3.5 py-2.5">
        <div className="flex items-center gap-2 font-mono-ui text-[10px] font-bold tracking-[0.14em] text-[color:var(--text-label)] uppercase">
          <MessageSquare className="h-3 w-3" strokeWidth={2.5} />
          {t.platform.canvas.node.commentsHeader}
          {comments.length > 0 && (
            <span className="rounded-full bg-[color:var(--surface-overlay)] px-1.5 py-px text-[9px] tracking-[0.08em] text-[color:var(--text-muted)] tabular-nums">
              {comments.length}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setOpenCommentsNodeId(null)}
          className="flex h-5 w-5 items-center justify-center rounded-md text-[color:var(--text-muted)] transition-colors duration-150 hover:bg-[color:var(--surface-overlay)] hover:text-[color:var(--text-strong)] focus-visible:ring-2 focus-visible:ring-[color:var(--ring-focus)] focus-visible:outline-none motion-reduce:transition-none"
          aria-label={t.platform.canvas.node.closeComments}
        >
          <X className="h-3 w-3" />
        </button>
      </div>

      <div className="nowheel nopan flex max-h-56 flex-col gap-1.5 overflow-y-auto px-3 py-2.5">
        {comments.length === 0 ? (
          <p className="mx-auto max-w-[200px] py-4 text-center text-[11px] leading-snug text-[color:var(--text-muted)]">
            {t.platform.canvas.node.noComments}
          </p>
        ) : (
          comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              canDelete={canComment && comment.authorId === userId}
              onDelete={(commentId) => deleteComment(nodeId, commentId)}
            />
          ))
        )}
      </div>

      {canComment && (
        <form
          onSubmit={handleCommentSubmit}
          className="nopan flex items-center gap-2 border-t border-[color:var(--border)] px-2.5 py-2"
        >
          <input
            value={commentText}
            maxLength={MAX_COMMENT_LENGTH}
            onChange={(event) => onCommentTextChange(event.target.value)}
            placeholder={t.platform.canvas.node.addCommentPlaceholder}
            className="min-w-0 flex-1 bg-transparent px-1 text-[12px] text-[color:var(--text-strong)] caret-[color:var(--accent)] outline-none placeholder:text-[color:var(--text-muted)]"
          />
          <button
            type="submit"
            disabled={!commentText.trim()}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[color:var(--accent)] text-[color:var(--on-accent)] transition-[background-color,opacity] duration-150 hover:bg-[color:var(--accent-strong)] focus-visible:ring-2 focus-visible:ring-[color:var(--ring-focus)] focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-[color:var(--surface-overlay)] disabled:text-[color:var(--text-subtle)] disabled:hover:bg-[color:var(--surface-overlay)] motion-reduce:transition-none"
            aria-label={t.platform.canvas.node.sendComment}
          >
            <Send className="h-3 w-3" strokeWidth={2.25} />
          </button>
        </form>
      )}
    </>
  );
};
