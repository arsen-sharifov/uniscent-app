import { clsx } from 'clsx';

import type { IMascotLimb } from '@interfaces';

import { MASCOT_HAND_RADIUS, MASCOT_LIMB_WIDTH, MASCOT_SHOULDER } from '../consts';

interface IMascotArmProps {
  arm: IMascotLimb;
  shoulderX: number;
  animation: string;
}

export const MascotArm = ({ arm, shoulderX, animation }: IMascotArmProps) => (
  <g
    style={{ transformBox: 'view-box', transformOrigin: `${shoulderX}px ${MASCOT_SHOULDER.y}px` }}
    className={clsx(animation, 'motion-reduce:animate-none')}
  >
    <path
      d={arm.path}
      fill="none"
      stroke="var(--text-muted)"
      strokeWidth={MASCOT_LIMB_WIDTH}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx={arm.handX} cy={arm.handY} r={MASCOT_HAND_RADIUS} fill="var(--text-muted)" />
  </g>
);
