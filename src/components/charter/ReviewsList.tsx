"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

import { type BookingReview } from "@/dummy/receipts";
import { resolveBadges } from "@/utils/reviewBadges";

import Stars from "./Stars";

function formatDate(iso: string): string {
  if (!iso) return "";
  try {
    const normalized = iso.length === 10 ? `${iso}T00:00:00` : iso;
    return new Date(normalized).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function parseDateMs(iso: string | undefined): number {
  if (!iso) return 0;
  const normalized = iso.length === 10 ? `${iso}T00:00:00` : iso;
  const ms = Date.parse(normalized);
  return Number.isFinite(ms) ? ms : 0;
}

type SortKey = "relevant" | "recent" | "highest" | "lowest";

const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: "relevant", label: "Most relevant" },
  { value: "recent", label: "Most recent" },
  { value: "highest", label: "Highest rated" },
  { value: "lowest", label: "Lowest rated" },
];

function sortReviews(list: BookingReview[], sort: SortKey): BookingReview[] {
  const reviews = [...list];
  const score = (review: BookingReview) => {
    const rating = review.overallRating ?? 0;
    const badgeScore = (review.badges?.length ?? 0) * 12;
    const mediaScore = (review.media?.length ?? 0) * 8;
    const timeScore = parseDateMs(review.createdAt) / 1_000_000_000; // dampened
    return rating * 100 + badgeScore + mediaScore + timeScore;
  };

  const compare: Record<
    SortKey,
    (a: BookingReview, b: BookingReview) => number
  > = {
    relevant: (a, b) => {
      const diff = score(b) - score(a);
      if (diff !== 0) return diff;
      return parseDateMs(b.createdAt) - parseDateMs(a.createdAt);
    },
    recent: (a, b) => parseDateMs(b.createdAt) - parseDateMs(a.createdAt),
    highest: (a, b) => {
      const diff = (b.overallRating ?? 0) - (a.overallRating ?? 0);
      if (diff !== 0) return diff;
      return parseDateMs(b.createdAt) - parseDateMs(a.createdAt);
    },
    lowest: (a, b) => {
      const diff = (a.overallRating ?? 0) - (b.overallRating ?? 0);
      if (diff !== 0) return diff;
      return parseDateMs(b.createdAt) - parseDateMs(a.createdAt);
    },
  };

  return reviews.sort(compare[sort]);
}

function MediaStrip({ media }: { media?: BookingReview["media"] }) {
  if (!media || media.length === 0) return null;
  return (
    <div className="mt-3 flex gap-2 overflow-x-auto">
      {media.map((item) => {
        if (item.type === "image") {
          return (
            <div
              key={item.id}
              className="relative h-15 w-20 shrink-0 overflow-hidden rounded-xl bg-gray-100"
            >
              <Image
                src={item.url}
                alt={item.alt}
                fill
                sizes="128px"
                className="object-cover"
              />
            </div>
          );
        }
        return (
          <div
            key={item.id}
            className="relative h-15 w-20 shrink-0 overflow-hidden rounded-xl bg-gray-900"
          >
            <video
              className="h-full w-full object-cover"
              controls
              preload="metadata"
              muted
              playsInline
              poster={item.poster}
            >
              <source src={item.url} type="video/mp4" />
            </video>
          </div>
        );
      })}
    </div>
  );
}

function ReviewCard({ review }: { review: BookingReview }) {
  const score = review.overallRating ?? 0;
  const badges = resolveBadges(review.badges || []);
  return (
    <article className="flex h-full flex-col rounded-3xl border border-black/10 bg-white/95 p-5 shadow-sm transition hover:shadow-md">
      <header className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold uppercase text-gray-700">
            {review.reviewerInitials ||
              review.reviewerName.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-900">
              {review.reviewerName}
            </div>
            <div className="text-xs text-gray-500">
              {formatDate(review.createdAt)} · {review.tripName}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Stars value={score} />
          <span className="text-xs font-semibold text-gray-500">
            {score.toFixed(1)} / 5
          </span>
        </div>
      </header>

      {review.review && (
        <p className="mt-4 text-sm leading-6 text-gray-700">{review.review}</p>
      )}

      <MediaStrip media={review.media} />

      {badges.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-dashed border-gray-200 pt-3">
          {badges.map((badge) => (
            <span
              key={`${review.id}-${badge.id}`}
              className="group relative inline-flex"
            >
              <span
                tabIndex={0}
                className="inline-flex items-center gap-1 rounded-full border border-black/10 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                <span>{badge.icon}</span>
                <span>{badge.label}</span>
              </span>
              <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 hidden w-44 -translate-x-1/2 rounded-lg bg-gray-900 px-3 py-2 text-center text-xs font-medium text-white shadow-lg group-hover:flex group-focus-within:flex">
                <span className="leading-snug">{badge.description}</span>
              </span>
            </span>
          ))}
        </div>
      )}
    </article>
  );
}

export default function ReviewsList({ reviews }: { reviews: BookingReview[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("relevant");
  const [showModal, setShowModal] = useState(false);

  const sortedReviews = useMemo(
    () => sortReviews(reviews, sortKey),
    [reviews, sortKey]
  );
  const featuredReviews = sortedReviews.slice(
    0,
    Math.min(8, sortedReviews.length)
  );
  const hasMore = reviews.length > featuredReviews.length;

  useEffect(() => {
    if (!showModal) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowModal(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showModal]);

  useEffect(() => {
    if (showModal) {
      const previous = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = previous;
      };
    }
    return undefined;
  }, [showModal]);

  if (!reviews?.length) return null;

  return (
    <section className="mt-6">
      <div className="rounded-2xl border border-black/10 bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-semibold sm:text-lg">
              Anglers’ reviews
            </h3>
            <p className="text-xs text-gray-500 sm:text-sm">
              {reviews.length} review{reviews.length === 1 ? "" : "s"} from
              verified trips
            </p>
          </div>
          <label className="text-xs font-medium text-gray-600">
            Sort by
            <select
              className="ml-2 rounded-full border border-black/10 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-700"
              value={sortKey}
              onChange={(event) => setSortKey(event.target.value as SortKey)}
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
          {featuredReviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>

        {hasMore && (
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-[#ec2227] shadow-sm transition hover:border-[#ec2227]/40 hover:bg-[#ec2227]/5"
            >
              See all reviews
            </button>
          </div>
        )}
      </div>

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex flex-col gap-3 border-b border-black/10 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h4 className="text-lg font-semibold">All reviews</h4>
                <p className="text-xs text-gray-500">
                  {sortedReviews.length} review
                  {sortedReviews.length === 1 ? "" : "s"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-xs font-semibold text-gray-600">
                  Sort by
                  <select
                    className="ml-2 rounded-full border border-black/10 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-700"
                    value={sortKey}
                    onChange={(event) =>
                      setSortKey(event.target.value as SortKey)
                    }
                  >
                    {SORT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  aria-label="Close reviews"
                  onClick={() => setShowModal(false)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-black/10 text-gray-500 transition hover:text-gray-800"
                >
                  <span className="text-xl">×</span>
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-6">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                {sortedReviews.map((review) => (
                  <ReviewCard key={`modal-${review.id}`} review={review} />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
