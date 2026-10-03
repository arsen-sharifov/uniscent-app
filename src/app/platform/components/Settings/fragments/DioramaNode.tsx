interface IDioramaNodeProps {
  active: boolean;
  strokeWidth: number;
}

export const DioramaNode = ({ active, strokeWidth }: IDioramaNodeProps) => (
  <>
    <rect
      x="-20"
      y="-11"
      width="40"
      height="22"
      rx="3.5"
      fill="var(--surface-elevated)"
      stroke={active ? 'var(--accent)' : 'var(--border-strong)'}
      strokeWidth={strokeWidth}
      className="transition-[stroke,stroke-width] duration-200 ease-out motion-reduce:transition-none"
    />
    <rect x="-14" y="-6" width="28" height="2" rx="1" fill="var(--text-muted)" opacity="0.55" />
    <rect x="-14" y="-1.5" width="20" height="2" rx="1" fill="var(--text-muted)" opacity="0.32" />
    <rect x="-14" y="3" width="24" height="2" rx="1" fill="var(--text-muted)" opacity="0.28" />
  </>
);
