import { type LucideProps, Search, icons } from 'lucide-react';
import { type CSSProperties, useMemo, useState } from 'react';

import { GALLERY_COLS, GALLERY_ROW_HEIGHT } from '../consts';
import { IconCell } from './IconCell';

const iconEntries = Object.entries(icons);

interface IIconGalleryProps extends Pick<LucideProps, 'absoluteStrokeWidth' | 'color' | 'size' | 'strokeWidth'> {
  onCopy: (name: string) => void;
}

export const IconGallery = ({ size, color, strokeWidth, absoluteStrokeWidth, onCopy }: IIconGalleryProps) => {
  const [search, setSearch] = useState('');
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(800);

  const filtered = useMemo(
    () => (search ? iconEntries.filter(([name]) => name.toLowerCase().includes(search.toLowerCase())) : iconEntries),
    [search],
  );

  const totalRows = Math.ceil(filtered.length / GALLERY_COLS);
  const fromRow = Math.max(0, Math.floor(scrollTop / GALLERY_ROW_HEIGHT) - 2);
  const toRow = Math.min(totalRows, Math.ceil((scrollTop + viewportHeight) / GALLERY_ROW_HEIGHT) + 2);

  const handleSearch = (next: string) => {
    setSearch(next);
    setScrollTop(0);
  };

  return (
    <div className="flex h-screen flex-col gap-4 bg-[color:var(--app-bg)] p-6">
      <header className="flex flex-wrap items-center gap-3">
        <label className="inline-flex items-center gap-2 rounded-md border border-[color:var(--border-strong)] bg-[color:var(--surface-elevated)] px-3 py-1.5">
          <Search className="h-3.5 w-3.5 text-[color:var(--text-subtle)]" strokeWidth={2} />
          <input
            type="text"
            placeholder="Search icons (e.g. arrow, user, lock)…"
            value={search}
            onChange={(inputEvent) => handleSearch(inputEvent.target.value)}
            className="w-[260px] bg-transparent text-[12.5px] text-[color:var(--text)] placeholder:text-[color:var(--text-subtle)] focus:outline-none"
          />
          {search && (
            <button
              type="button"
              onClick={() => handleSearch('')}
              className="font-mono-ui text-[9.5px] tracking-[0.2em] text-[color:var(--text-subtle)] uppercase hover:text-[color:var(--text)]"
            >
              Clear
            </button>
          )}
        </label>
        <span className="font-mono-ui text-[10px] tracking-[0.18em] text-[color:var(--text-subtle)] uppercase">
          {filtered.length}/{iconEntries.length} icons
        </span>
        <span className="ml-auto font-mono-ui text-[10px] tracking-[0.18em] text-[color:var(--text-faint)] uppercase">
          click any tile to copy <code className="font-mono-ui">&lt;Name /&gt;</code>
        </span>
      </header>

      <div
        className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-3"
        onScroll={(event) => {
          setScrollTop(event.currentTarget.scrollTop);
          setViewportHeight(event.currentTarget.clientHeight);
        }}
      >
        {filtered.length === 0 ? (
          <div className="flex h-full items-center justify-center text-[12.5px] text-[color:var(--text-muted)]">
            No icons match <code className="ml-1 font-mono-ui">{search}</code>.
          </div>
        ) : (
          <div style={{ height: totalRows * GALLERY_ROW_HEIGHT, position: 'relative' } as CSSProperties}>
            {Array.from({ length: toRow - fromRow }, (_, index) => {
              const row = fromRow + index;

              return (
                <div
                  key={row}
                  className="absolute right-0 left-0 grid gap-2"
                  style={{
                    top: row * GALLERY_ROW_HEIGHT,
                    height: GALLERY_ROW_HEIGHT - 8,
                    gridTemplateColumns: `repeat(${GALLERY_COLS}, minmax(0, 1fr))`,
                  }}
                >
                  {filtered.slice(row * GALLERY_COLS, row * GALLERY_COLS + GALLERY_COLS).map(([name, Icon]) => (
                    <IconCell
                      key={name}
                      name={name}
                      Icon={Icon}
                      size={size}
                      color={color}
                      strokeWidth={strokeWidth}
                      absoluteStrokeWidth={absoluteStrokeWidth}
                      onCopy={onCopy}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
