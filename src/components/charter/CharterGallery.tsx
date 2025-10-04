"use client";

import { zIndexClasses } from "@/config/zIndex";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const PLACEHOLDER = "/placeholder-1.jpg";

type Media =
  | string
  | {
      src: string;
      type?: "image" | "video";
      alt?: string;
      /** Optional poster image for videos */
      poster?: string;
    };

function isVideoUrl(url: string) {
  const u = url.toLowerCase();
  return (
    u.endsWith(".mp4") ||
    u.endsWith(".webm") ||
    u.endsWith(".ogg") ||
    u.includes("youtu.be/") ||
    u.includes("youtube.com/") ||
    u.includes("vimeo.com/")
  );
}

function normalizeMedia(list: Media[], title: string) {
  if (!Array.isArray(list) || list.length === 0) {
    return [{ src: PLACEHOLDER, type: "image", alt: `${title} photo` }];
  }
  return list.slice(0, 20).map((item, idx) => {
    if (typeof item === "string") {
      return {
        src: item || PLACEHOLDER,
        type: isVideoUrl(item) ? "video" : "image",
        alt: `${title} media ${idx + 1}`,
      } as const;
    }
    return {
      src: item.src || PLACEHOLDER,
      type:
        item.type ??
        (item.src ? (isVideoUrl(item.src) ? "video" : "image") : "image"),
      alt: item.alt || `${title} media ${idx + 1}`,
      poster: item.poster,
    } as const;
  });
}

function clsx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export default function CharterGallery({
  images,
  title,
}: {
  images: Media[]; // backward compatible: string[]
  title: string;
}) {
  const media = useMemo(
    () => normalizeMedia(images as Media[], title),
    [images, title]
  );
  const [activeIdx, setActiveIdx] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  const openAt = useCallback((idx: number) => {
    setActiveIdx(idx);
    setIsOpen(true);
  }, []);

  // scroll lock when modal open
  useEffect(() => {
    if (!isOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [isOpen]);

  // keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
      if (e.key === "ArrowRight") setActiveIdx((i) => (i + 1) % media.length);
      if (e.key === "ArrowLeft")
        setActiveIdx((i) => (i - 1 + media.length) % media.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, media.length]);

  const main = media[activeIdx] ?? media[0];

  // ----- Mosaic layout (desktop) + scroller (mobile) -----
  // We show up to 5 tiles on desktop (Airbnb-style mosaic).
  const tiles = media.slice(0, Math.min(5, media.length));

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,3fr)_minmax(0,1fr)] sm:auto-rows-[minmax(0,1fr)]">
        {/* Main tile (left) */}
        <button
          type="button"
          onClick={() => openAt(0)}
          className="group relative w-full overflow-hidden rounded-xl bg-gray-100 sm:row-span-2"
          aria-label="Open gallery"
          style={{ aspectRatio: "16 / 9" }}
        >
          {main?.type === "video" ? (
            <VideoThumb
              src={main.src}
              poster={"poster" in main ? main.poster : undefined}
              alt={`${title} main video`}
            />
          ) : (
            <Image
              src={main?.src || PLACEHOLDER}
              alt={`${title} main image`}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 66vw, 66vw"
              priority
              unoptimized
              onError={(e) => {
                const target = e.currentTarget as HTMLImageElement;
                target.src = PLACEHOLDER;
              }}
            />
          )}

          {/* Overlay top bar with title + count */}
          <div className="pointer-events-none absolute left-0 top-0 z-10 w-full bg-gradient-to-b from-black/30 to-transparent p-3 sm:p-4">
            <div className="flex items-center justify-between gap-2 text-white">
              <div className="min-w-0 truncate text-sm font-semibold drop-shadow">
                {title}
              </div>
              <div className="rounded-full bg-black/40 px-2 py-0.5 text-xs backdrop-blur">
                {media.length} {media.length === 1 ? "item" : "items"}
              </div>
            </div>
          </div>

          {/* View all button (bottom-right) */}
          <div className="pointer-events-none absolute bottom-0 right-0 z-10 m-3 sm:m-4">
            <span className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-sm font-medium text-gray-900 shadow backdrop-blur transition hover:bg-white">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                className="opacity-80"
                aria-hidden="true"
              >
                <path
                  d="M4 6h16M4 12h16M4 18h16"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  openAt(activeIdx);
                }}
              >
                View all
              </span>
            </span>
          </div>
        </button>

        {/* Desktop right column (up to 4 extra tiles) */}
        <div className="hidden sm:grid sm:row-span-2 sm:grid-cols-1 sm:grid-rows-4 sm:gap-3 sm:h-full">
          {tiles.slice(1).map((m, i) => {
            const idx = i + 1;
            const isLast =
              idx === tiles.length - 1 && media.length > tiles.length;
            return (
              <button
                key={m.src + idx}
                type="button"
                onClick={() => openAt(idx)}
                className="group relative flex h-full w-full overflow-hidden rounded-xl bg-gray-100"
                aria-label={`Open item ${idx + 1}`}
              >
                {m.type === "video" ? (
                  <VideoThumb
                    src={m.src}
                    poster={"poster" in m ? m.poster : undefined}
                    alt={`${title} video ${idx + 1}`}
                  />
                ) : (
                  <Image
                    src={m.src || PLACEHOLDER}
                    alt={`${title} image ${idx + 1}`}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    sizes="33vw"
                    unoptimized
                    onError={(e) => {
                      const target = e.currentTarget as HTMLImageElement;
                      target.src = PLACEHOLDER;
                    }}
                  />
                )}

                {/* "See all" overlay on last visible tile when more items exist */}
                {isLast && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40">
                    <span className="rounded-full bg-white/90 px-3 py-1 text-sm font-semibold text-gray-900 shadow">
                      +{media.length - tiles.length} more
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Mobile horizontal scroller */}
        <div className="mt-2 flex gap-2 overflow-x-auto sm:hidden">
          {media.map((m, idx) => (
            <button
              key={m.src + idx}
              type="button"
              onClick={() => openAt(idx)}
              aria-label={`Open item ${idx + 1}`}
              className={clsx(
                "relative h-16 w-28 shrink-0 overflow-hidden rounded-lg border bg-gray-100",
                idx === activeIdx ? "border-[#ec2227]" : "border-transparent"
              )}
            >
              {m.type === "video" ? (
                <VideoThumb
                  src={m.src}
                  poster={"poster" in m ? m.poster : undefined}
                  alt={`${title} video ${idx + 1}`}
                />
              ) : (
                <Image
                  src={m.src || PLACEHOLDER}
                  alt={`${title} thumbnail ${idx + 1}`}
                  fill
                  className="object-cover"
                  sizes="112px"
                  unoptimized
                  onError={(e) => {
                    const target = e.currentTarget as HTMLImageElement;
                    target.src = PLACEHOLDER;
                  }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* LIGHTBOX / MODAL */}
      {isOpen && (
        <Lightbox
          title={title}
          media={media}
          index={activeIdx}
          onClose={() => setIsOpen(false)}
          onIndexChange={setActiveIdx}
        />
      )}
    </>
  );
}

/* ------------------------- Lightbox component ------------------------- */

function Lightbox({
  title,
  media,
  index,
  onClose,
  onIndexChange,
}: {
  title: string;
  media: ReturnType<typeof normalizeMedia>;
  index: number;
  onClose: () => void;
  onIndexChange: (i: number) => void;
}) {
  const [current, setCurrent] = useState(index);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => setCurrent(index), [index]);

  // Keep parent index in sync after Lightbox state updates (avoids parent update during render)
  useEffect(() => {
    onIndexChange(current);
  }, [current, onIndexChange]);

  const next = useCallback(() => {
    setCurrent((i) => (i + 1) % media.length);
  }, [media.length]);

  const prev = useCallback(() => {
    setCurrent((i) => (i - 1 + media.length) % media.length);
  }, [media.length]);

  // simple swipe handlers
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touch.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touch.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touch.current.x;
    if (Math.abs(dx) > 50) {
      if (dx < 0) {
        next();
      } else {
        prev();
      }
    }
    touch.current = null;
  };

  // Fullscreen toggle
  const fsRef = useRef<HTMLDivElement | null>(null);
  const requestFs = () => {
    const el = fsRef.current;
    if (el && el.requestFullscreen) el.requestFullscreen();
  };

  const m = media[current];

  return (
    <div
      className={`fixed inset-0 ${zIndexClasses.modal} bg-black/80 backdrop-blur-sm`}
      role="dialog"
      aria-modal="true"
      ref={containerRef}
      onClick={onClose}
    >
      {/* Top bar */}
      <div
        className="pointer-events-none absolute left-0 right-0 top-0 z-10 mx-auto flex max-w-6xl items-center justify-between px-4 py-3 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm">
          <span className="truncate">{title}</span>
        </div>
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            className="rounded-full bg-white/10 px-3 py-1 text-sm hover:bg-white/20"
            onClick={requestFs}
            aria-label="Enter fullscreen"
          >
            Fullscreen
          </button>
          <button
            className="rounded-full bg-white/10 px-3 py-1 text-sm hover:bg-white/20"
            onClick={onClose}
            aria-label="Close gallery"
          >
            Close
          </button>
        </div>
      </div>

      {/* Media viewer */}
      <div
        ref={fsRef}
        className="absolute inset-0 mx-auto flex max-w-6xl items-center justify-center px-4"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div className="relative aspect-video w-full max-w-full">
          {m.type === "video" ? (
            <VideoPlayer
              src={m.src}
              poster={"poster" in m ? m.poster : undefined}
            />
          ) : (
            <Image
              src={m.src || PLACEHOLDER}
              alt={m.alt || title}
              fill
              className="rounded-lg object-contain"
              sizes="100vw"
              unoptimized
              onError={(e) => {
                const target = e.currentTarget as HTMLImageElement;
                target.src = PLACEHOLDER;
              }}
            />
          )}
        </div>

        {/* Prev/Next controls */}
        {media.length > 1 && (
          <>
            <button
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20"
              onClick={prev}
              aria-label="Previous"
            >
              <ArrowLeft />
            </button>
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20"
              onClick={next}
              aria-label="Next"
            >
              <ArrowRight />
            </button>
          </>
        )}

        {/* Counter */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-sm text-white">
          {current + 1} / {media.length}
        </div>
      </div>

      {/* Filmstrip thumbnails (desktop) */}
      {media.length > 1 && (
        <div
          className="absolute bottom-0 left-0 right-0 hidden max-h-28 overflow-x-auto bg-black/40 py-3 sm:block"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mx-auto flex max-w-6xl gap-2 px-4">
            {media.map((mm, i) => (
              <button
                key={mm.src + i}
                className={clsx(
                  "relative h-20 w-32 shrink-0 overflow-hidden rounded-md border",
                  i === current ? "border-white" : "border-white/30"
                )}
                onClick={() => setCurrent(i)}
                aria-label={`Go to item ${i + 1}`}
              >
                {mm.type === "video" ? (
                  <VideoThumb
                    src={mm.src}
                    poster={"poster" in mm ? mm.poster : undefined}
                    alt={`${title} video ${i + 1}`}
                  />
                ) : (
                  <Image
                    src={mm.src || PLACEHOLDER}
                    alt={`${title} thumbnail ${i + 1}`}
                    fill
                    className="object-cover"
                    sizes="128px"
                    unoptimized
                    onError={(e) => {
                      const target = e.currentTarget as HTMLImageElement;
                      target.src = PLACEHOLDER;
                    }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* --------------------- Video helpers (thumb & player) --------------------- */

function VideoThumb({
  //src,
  poster,
  alt,
}: {
  src: string;
  poster?: string;
  alt: string;
}) {
  // For YouTube/Vimeo we just show a play overlay over the poster or fallback.
  return (
    <div className="absolute inset-0">
      <Image
        src={poster || PLACEHOLDER}
        alt={alt}
        fill
        className="object-cover"
        sizes="100vw"
        unoptimized
      />
      <div className="absolute inset-0 grid place-items-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-black/50 px-3 py-1 text-sm font-semibold text-white">
          ▶ Play
        </span>
      </div>
    </div>
  );
}

function VideoPlayer({ src, poster }: { src: string; poster?: string }) {
  // If YouTube/Vimeo, embed iframe; else use HTML5 video
  if (src.includes("youtube.com") || src.includes("youtu.be")) {
    const id =
      src.match(/(?:v=|\/)([0-9A-Za-z_-]{11})(?:\?|\&|$)/)?.[1] ||
      src.split("/").pop();
    const embed = `https://www.youtube.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`;
    return (
      <iframe
        className="h-full w-full rounded-lg"
        src={embed}
        allow="autoplay; encrypted-media"
        allowFullScreen
        title="Video"
      />
    );
  }
  if (src.includes("vimeo.com")) {
    const id = src.split("/").filter(Boolean).pop();
    const embed = `https://player.vimeo.com/video/${id}?autoplay=1`;
    return (
      <iframe
        className="h-full w-full rounded-lg"
        src={embed}
        allow="autoplay; encrypted-media"
        allowFullScreen
        title="Video"
      />
    );
  }
  return (
    <video
      className="h-full w-full rounded-lg bg-black object-contain"
      controls
      autoPlay
      poster={poster}
    >
      <source src={src} />
      Your browser does not support the video tag.
    </video>
  );
}

/* ----------------------------- Icons ----------------------------- */
function ArrowLeft() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M15 6l-6 6 6 6"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}
function ArrowRight() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M9 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}
