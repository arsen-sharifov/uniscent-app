'use client';

import { Handle, type HandleType } from '@xyflow/react';
import { clsx } from 'clsx';

import { usePermissionsStore } from '@/lib/stores';

import { HANDLE_POSITIONS } from '../consts';

interface INodeHandlesProps {
  type: HandleType;
  revealClassName: string;
}

export const NodeHandles = ({ type, revealClassName }: INodeHandlesProps) => {
  const canEditCanvas = usePermissionsStore((state) => state.canEditCanvas);

  return HANDLE_POSITIONS.map(({ id, position }) => (
    <Handle
      key={id}
      id={id}
      type={type}
      position={position}
      isConnectable={canEditCanvas}
      className={clsx(
        '!h-2.5 !w-2.5 !rounded-full !border !border-[color:var(--surface)] !bg-[color:var(--accent)] !opacity-0 !shadow-[0_0_0_3px_var(--accent-soft)] !transition-opacity !duration-200',
        canEditCanvas ? revealClassName : '!pointer-events-none',
      )}
    />
  ));
};
