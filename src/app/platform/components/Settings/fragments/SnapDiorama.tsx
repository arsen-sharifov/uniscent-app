import { DioramaNode } from './DioramaNode';

interface ISnapDioramaProps {
  active: boolean;
}

export const SnapDiorama = ({ active }: ISnapDioramaProps) => (
  <svg viewBox="0 0 200 80" className="absolute inset-0 h-full w-full" aria-hidden>
    {[40, 70, 100, 130, 160].map((x) =>
      [20, 40, 60].map((y) => (
        <circle
          key={`${x}-${y}`}
          cx={x}
          cy={y}
          r="1.3"
          fill="var(--text-subtle)"
          className="transition-opacity duration-200 ease-out motion-reduce:transition-none"
          style={{ opacity: active ? 0.85 : 0.3 }}
        />
      )),
    )}
    <g
      stroke="var(--accent)"
      strokeWidth="0.6"
      strokeDasharray="2.5 3"
      className="transition-opacity duration-200 ease-out motion-reduce:transition-none"
      style={{ opacity: active ? 0.65 : 0 }}
    >
      <line x1="100" y1="8" x2="100" y2="72" />
      <line x1="26" y1="40" x2="174" y2="40" />
    </g>
    <g
      className="transition-transform duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] motion-reduce:transition-none"
      style={{ transform: active ? 'translate(100px, 40px)' : 'translate(108px, 33px)' }}
    >
      <DioramaNode active={active} strokeWidth={1.1} />
    </g>
  </svg>
);
