import { DioramaNode } from './DioramaNode';

interface IGuidesDioramaProps {
  active: boolean;
}

export const GuidesDiorama = ({ active }: IGuidesDioramaProps) => (
  <svg viewBox="0 0 200 80" className="absolute inset-0 h-full w-full" aria-hidden>
    <g opacity="0.55">
      <rect
        x="22"
        y="10"
        width="32"
        height="20"
        rx="2.5"
        fill="var(--surface-elevated)"
        stroke="var(--border-strong)"
        strokeWidth="0.7"
      />
      <rect
        x="146"
        y="50"
        width="32"
        height="20"
        rx="2.5"
        fill="var(--surface-elevated)"
        stroke="var(--border-strong)"
        strokeWidth="0.7"
      />
    </g>
    <g
      stroke="var(--accent)"
      strokeWidth="0.7"
      strokeDasharray="3.5 3"
      strokeLinecap="round"
      className="transition-opacity duration-200 ease-out motion-reduce:transition-none"
      style={{ opacity: active ? 0.9 : 0 }}
    >
      <line x1="38" y1="20" x2="100" y2="20" />
      <line x1="100" y1="20" x2="100" y2="40" />
      <line x1="100" y1="40" x2="162" y2="40" />
      <line x1="162" y1="40" x2="162" y2="60" />
    </g>
    <g transform="translate(100, 40)">
      <DioramaNode active={active} strokeWidth={active ? 1.2 : 0.9} />
    </g>
  </svg>
);
