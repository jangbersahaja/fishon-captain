import type { MediaPreview as BasePreview } from "../types";

type MediaPreview = BasePreview & {
  alt?: string;
  isCover?: boolean;
  progress?: number; // NEW
};

type MediaGridProps = {
  items: MediaPreview[];
  emptyLabel: string;
  onRemove: (index: number) => void;
  onUpdateAlt?: (index: number, alt: string) => void;
  onMove?: (from: number, to: number) => void;
  onSetCover?: (index: number) => void;
};

export function MediaGrid({
  items,
  emptyLabel,
  onRemove,
  onUpdateAlt,
  onMove,
  onSetCover,
}: MediaGridProps) {
  if (!items.length) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-200 px-4 py-10 text-center text-sm text-slate-500">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item, index) => {
        const disabled =
          typeof item.progress === "number" && item.progress < 100;

        return (
          <div
            key={`${item.url}-${index}`}
            className="group relative overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm"
          >
            {item.isCover && (
              <span className="absolute left-2 top-2 z-10 rounded bg-slate-900/80 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white">
                Cover
              </span>
            )}

            {/* Thumbnail */}
            <div
              className="h-36 bg-cover bg-center"
              style={{ backgroundImage: `url(${item.url})` }}
            />

            {/* Alt text input */}
            <div className="px-3 pt-2">
              <input
                type="text"
                placeholder="Alt text (description)"
                value={item.alt ?? ""}
                onChange={(e) => onUpdateAlt?.(index, e.target.value)}
                className="w-full rounded border border-neutral-200 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-slate-300"
                disabled={disabled}
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between px-3 py-2 text-xs text-slate-600">
              <span className="truncate" title={item.name}>
                {item.name}
              </span>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label="Move up"
                    title="Move up"
                    onClick={() => onMove?.(index, index - 1)}
                    disabled={index === 0 || disabled}
                    className="rounded border border-neutral-200 px-1 py-0.5 disabled:opacity-40"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    aria-label="Move down"
                    title="Move down"
                    onClick={() => onMove?.(index, index + 1)}
                    disabled={index === items.length - 1 || disabled}
                    className="rounded border border-neutral-200 px-1 py-0.5 disabled:opacity-40"
                  >
                    ↓
                  </button>
                </div>

                <button
                  type="button"
                  aria-label="Set as cover"
                  title="Set as cover"
                  onClick={() => onSetCover?.(index)}
                  disabled={disabled || item.isCover === true}
                  className="rounded border border-neutral-200 px-2 py-0.5 hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ★ Cover
                </button>

                <button
                  type="button"
                  onClick={() => onRemove(index)}
                  disabled={disabled}
                  className="text-red-500 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
