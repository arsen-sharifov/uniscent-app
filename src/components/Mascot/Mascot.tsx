import { clsx } from 'clsx';

import type { TMascotCharacter, TMascotPose } from '@interfaces';

import {
  MASCOT_EYES,
  MASCOT_EYE_RADIUS,
  MASCOT_EYE_X,
  MASCOT_EYE_Y,
  MASCOT_FOOT,
  MASCOT_LEGS,
  MASCOT_LEG_BOTTOM,
  MASCOT_LEG_TOP,
  MASCOT_LIMB_WIDTH,
  MASCOT_POSES,
  MASCOT_SHOULDER,
  MASCOT_VIEW_BOX,
} from './consts';
import { ErgoBody, MascotArm, NodiBody } from './fragments';

interface IMascotProps {
  label: string;
  pose?: TMascotPose;
  character?: TMascotCharacter;
  className?: string;
}

export const Mascot = ({ label, pose = 'idle', character = 'nodi', className }: IMascotProps) => {
  const shape = MASCOT_POSES[pose];
  const eye = MASCOT_EYES[character];
  const eyeY = MASCOT_EYE_Y + shape.eyeOffsetY;
  const eager = shape.sway === 'eager';

  return (
    <svg
      viewBox={MASCOT_VIEW_BOX}
      role="img"
      aria-label={label}
      className={clsx('h-16 w-16 shrink-0 animate-mascot-float motion-reduce:animate-none', className)}
    >
      {MASCOT_LEGS.map((x) => (
        <g key={x}>
          <path
            d={`M${x} ${MASCOT_LEG_TOP} V${MASCOT_LEG_BOTTOM}`}
            fill="none"
            stroke="var(--text-muted)"
            strokeWidth={MASCOT_LIMB_WIDTH}
            strokeLinecap="round"
          />
          <rect
            x={x - MASCOT_FOOT.width / 2}
            y={MASCOT_LEG_BOTTOM - MASCOT_FOOT.height / 2}
            width={MASCOT_FOOT.width}
            height={MASCOT_FOOT.height}
            rx={MASCOT_FOOT.radius}
            fill="var(--text-muted)"
          />
        </g>
      ))}

      <MascotArm
        arm={shape.leftArm}
        shoulderX={MASCOT_SHOULDER.left}
        animation={eager ? 'animate-mascot-sway-eager' : 'animate-mascot-sway'}
      />
      <MascotArm
        arm={shape.rightArm}
        shoulderX={MASCOT_SHOULDER.right}
        animation={eager ? 'animate-mascot-sway-alt-eager' : 'animate-mascot-sway-alt'}
      />

      {character === 'ergo' ? <ErgoBody /> : <NodiBody />}

      {shape.happyEyes
        ? MASCOT_EYE_X.map((x) => (
            <path
              key={x}
              d={`M${x - MASCOT_EYE_RADIUS} ${eyeY + 1} Q${x} ${eyeY - 2.6} ${x + MASCOT_EYE_RADIUS} ${eyeY + 1}`}
              fill="none"
              stroke="var(--text-strong)"
              strokeWidth="2"
              strokeLinecap="round"
            />
          ))
        : MASCOT_EYE_X.map((x) => (
            <ellipse
              key={x}
              cx={x}
              cy={eyeY}
              rx={eye.rx}
              ry={eye.ry}
              fill="var(--text-strong)"
              className="origin-center animate-mascot-blink [transform-box:fill-box] motion-reduce:animate-none"
            />
          ))}
    </svg>
  );
};
