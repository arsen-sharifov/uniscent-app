import { Background, ReactFlow, ReactFlowProvider } from '@xyflow/react';
import { clsx } from 'clsx';
import type { ReactNode } from 'react';

import type { TCanvasPattern } from '@interfaces';

import {
  BACKGROUND_DOT_GAP,
  BACKGROUND_SIZE_BY_PATTERN,
  BACKGROUND_VARIANT_BY_PATTERN,
} from '@/components/Canvas/consts';

import { LOCKED_GESTURES, PRO_OPTIONS } from '../../../../consts';

interface IPatternStageProps {
  pattern: TCanvasPattern;
  className: string;
  children?: ReactNode;
}

export const PatternStage = ({ pattern, className, children }: IPatternStageProps) => (
  <div
    className={clsx(
      'relative w-full overflow-hidden border border-[color:var(--border)] bg-[color:var(--app-bg)]',
      className,
    )}
  >
    <ReactFlowProvider>
      <ReactFlow
        nodes={[]}
        edges={[]}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        proOptions={PRO_OPTIONS}
        {...LOCKED_GESTURES}
      >
        {pattern !== 'none' && (
          <Background
            variant={BACKGROUND_VARIANT_BY_PATTERN[pattern]}
            gap={BACKGROUND_DOT_GAP}
            size={BACKGROUND_SIZE_BY_PATTERN[pattern]}
            color="var(--app-bg-grid)"
          />
        )}
      </ReactFlow>
    </ReactFlowProvider>
    {children}
  </div>
);
