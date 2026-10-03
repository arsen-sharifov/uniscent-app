export const ArrivalGlow = () => (
  <>
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-30 animate-ref-arrival-glow motion-reduce:hidden"
      style={{ background: 'radial-gradient(ellipse at center, var(--accent-glow) 0%, transparent 70%)' }}
    />
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-30 animate-ref-arrival-ring motion-reduce:hidden"
    />
  </>
);
