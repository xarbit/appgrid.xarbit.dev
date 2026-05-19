import { useEffect, useState, useCallback } from "react";

export interface GalleryItem {
  full: string;
  fullAvif?: string;
  thumb: string;
  thumbAvif?: string;
  alt: string;
  width: number;
  height: number;
}

interface Props {
  items: GalleryItem[];
}

export default function Gallery({ items }: Props) {
  const [active, setActive] = useState<number | null>(null);

  const close = useCallback(() => setActive(null), []);
  const prev = useCallback(
    () => setActive((i) => (i === null ? null : (i - 1 + items.length) % items.length)),
    [items.length],
  );
  const next = useCallback(
    () => setActive((i) => (i === null ? null : (i + 1) % items.length)),
    [items.length],
  );

  useEffect(() => {
    if (active === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [active, close, prev, next]);

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item, i) => (
          <button
            key={item.full}
            onClick={() => setActive(i)}
            className="group relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--elevated)] aspect-video focus:outline-none focus:ring-2 focus:ring-[#3daee9] cursor-zoom-in"
          >
            <picture>
              {item.thumbAvif && <source srcSet={item.thumbAvif} type="image/avif" />}
              <img
                src={item.thumb}
                alt={item.alt}
                loading="lazy"
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </picture>
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
              <span className="text-sm font-medium text-white">{item.alt}</span>
            </div>
          </button>
        ))}
      </div>

      {active !== null && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 md:p-10"
          onClick={close}
        >
          <button
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 grid place-items-center text-white"
            onClick={close}
            aria-label="Close"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          <button
            className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 grid place-items-center text-white"
            onClick={(e) => {
              e.stopPropagation();
              prev();
            }}
            aria-label="Previous"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          <button
            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 grid place-items-center text-white"
            onClick={(e) => {
              e.stopPropagation();
              next();
            }}
            aria-label="Next"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>

          <figure
            className="max-w-6xl max-h-full flex flex-col items-center gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <picture>
              {items[active].fullAvif && (
                <source srcSet={items[active].fullAvif} type="image/avif" />
              )}
              <img
                src={items[active].full}
                alt={items[active].alt}
                className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
              />
            </picture>
            <figcaption className="text-sm text-[var(--fg-muted)]">
              {items[active].alt} · {active + 1} / {items.length}
            </figcaption>
          </figure>
        </div>
      )}
    </>
  );
}
