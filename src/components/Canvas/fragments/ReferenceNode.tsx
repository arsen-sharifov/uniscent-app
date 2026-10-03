'use client';

import type { NodeProps } from '@xyflow/react';
import { clsx } from 'clsx';
import { ArrowUpRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { MouseEvent } from 'react';

import type { TReferenceNode } from '@interfaces';

import { useTranslations } from '@/i18n';

import { buildReferenceTargetUrl } from '../utils';
import { NodeBand } from './NodeBand';
import { NodeHandles } from './NodeHandles';

export const ReferenceNode = ({ data, selected }: NodeProps<TReferenceNode>) => {
  const t = useTranslations();
  const { sourceNodeLabel, sourceThreadName, sourceWorkspaceName } = data;

  const router = useRouter();

  const targetUrl = buildReferenceTargetUrl(data);

  const openTarget = (event: MouseEvent) => {
    event.stopPropagation();
    if (targetUrl) router.push(targetUrl);
  };

  return (
    <div
      data-export-node
      className={clsx(
        'group/ref relative flex max-w-[280px] min-w-[200px] flex-col overflow-visible rounded-xl border border-[color:var(--border-strong)] bg-[color:var(--surface-elevated)] shadow-[var(--shadow-pip)] transition-[box-shadow,border-color,transform] duration-200 hover:-translate-y-px hover:border-[color:var(--ref-border)] hover:shadow-[var(--shadow-card-hover)] motion-reduce:transition-none motion-reduce:hover:translate-y-0',
        selected && 'shadow-[var(--shadow-card-hover)] ring-[1.5px] ring-[color:var(--selection)]',
      )}
    >
      <NodeHandles type="target" revealClassName="group-hover/ref:!opacity-100" />

      <div className="flex flex-col gap-1.5 px-4 py-3">
        <NodeBand
          tone="reference"
          label={t.platform.canvas.reference.badge}
          trailing={
            targetUrl !== null && (
              <button
                type="button"
                onClick={openTarget}
                onMouseDown={(event) => event.stopPropagation()}
                aria-label={t('platform.canvas.reference.openLabel', { name: sourceNodeLabel })}
                className="nodrag flex h-4 w-4 items-center justify-center rounded-md transition-transform duration-150 group-hover/ref:translate-x-px group-hover/ref:-translate-y-px focus-visible:ring-2 focus-visible:ring-[color:var(--ring-focus)] focus-visible:outline-none motion-reduce:transition-none motion-reduce:group-hover/ref:translate-x-0 motion-reduce:group-hover/ref:translate-y-0"
              >
                <ArrowUpRight className="h-3 w-3" strokeWidth={2.25} />
              </button>
            )
          }
        />

        <p className="truncate font-grotesk text-[13px] font-medium tracking-tight text-[color:var(--text-strong)] select-none">
          {sourceNodeLabel}
        </p>

        <p className="flex items-center gap-1 truncate font-mono-ui text-[10.5px] tracking-[0.04em] text-[color:var(--text-label)]">
          <span className="truncate text-[color:var(--text-subtle)]">
            {sourceWorkspaceName || t.platform.canvas.reference.workspaceFallback}
          </span>
          <span className="text-[color:var(--text-faint)]">/</span>
          <span className="truncate text-[color:var(--text-subtle)]">{sourceThreadName}</span>
        </p>
      </div>
    </div>
  );
};
