import { clsx } from 'clsx';

import type { IToolGroup } from '@interfaces';

import { Skeleton } from '@/components/Skeleton';

interface IToolbarSkeletonProps {
  groups: IToolGroup[];
}

export const ToolbarSkeleton = ({ groups }: IToolbarSkeletonProps) => (
  <div aria-hidden className="flex flex-1 flex-col items-stretch px-2 pt-1">
    {groups.map((group, index) => (
      <div
        key={group.id}
        className={clsx('flex flex-col items-stretch gap-1 py-2', index > 0 && 'border-t border-[color:var(--border)]')}
      >
        {group.tools.map((tool) => (
          <span key={tool.id} className="flex h-9 w-9 items-center justify-center self-center">
            <Skeleton className="h-[18px] w-[18px]" />
          </span>
        ))}
      </div>
    ))}
  </div>
);
