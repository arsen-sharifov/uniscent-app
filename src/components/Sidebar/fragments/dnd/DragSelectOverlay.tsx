import type { IRect } from '@interfaces';

interface IDragSelectOverlayProps {
  rect: IRect | null;
}

export const DragSelectOverlay = ({ rect }: IDragSelectOverlayProps) => {
  if (!rect) {
    return null;
  }

  return (
    <div
      className="pointer-events-none fixed z-50 rounded-lg border border-[color:var(--accent)] bg-[color:var(--accent-soft)]"
      style={{
        left: rect.x,
        top: rect.y,
        width: rect.width,
        height: rect.height,
      }}
    />
  );
};
