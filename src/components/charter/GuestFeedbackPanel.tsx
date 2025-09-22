import { type BookingReview } from "@/dummy/receipts";
import { summariseBadges } from "@/utils/reviewBadges";
import Stars from "./Stars";

function formatDate(iso: string | undefined) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export default function GuestFeedbackPanel({
  reviews,
  ratingAvg,
  ratingCount,
}: {
  reviews: BookingReview[];
  ratingAvg: number;
  ratingCount: number;
}) {
  if (ratingCount === 0) return null;

  const badgeSummary = summariseBadges(reviews);
  if (badgeSummary.length === 0) return null;

  const totalBadges = badgeSummary.reduce((sum, item) => sum + item.count, 0);
  const topBadges = badgeSummary.slice(0, 8);
  const highlightBadges = badgeSummary.slice(0, 3).map((item) => item.badge);

  return (
    <section className="mt-8 rounded-2xl border border-black/10 bg-white p-5 sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-semibold sm:text-lg">Guest feedback</h3>
          <p className="text-xs text-gray-500 sm:text-sm">
            Based on recent verified trips
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <span className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-1">
            <Stars value={ratingAvg} />
            <span className="font-medium">{ratingAvg.toFixed(1)}</span>
          </span>
          <span className="text-gray-500">
            {ratingCount} review{ratingCount === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-black/10 bg-white p-4 lg:col-span-2">
          <h4 className="text-sm font-semibold">Badge highlights</h4>
          {topBadges.length > 0 ? (
            <>
              <div className="mt-3 flex flex-wrap gap-2">
                {topBadges.map(({ badge, count }) => (
                  <span key={badge.id} className="group relative inline-flex">
                    <span
                      tabIndex={0}
                      className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    >
                      <span className="text-base">{badge.icon}</span>
                      <span className="text-xs font-semibold uppercase tracking-wide">
                        {badge.label}
                      </span>
                      <span className="text-[11px] font-semibold text-amber-600">
                        ×{count}
                      </span>
                    </span>
                    <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 hidden w-48 -translate-x-1/2 rounded-lg bg-gray-900 px-3 py-2 text-center text-xs font-medium text-white shadow-lg group-hover:flex group-focus-within:flex">
                      <span className="leading-snug">{badge.description}</span>
                    </span>
                  </span>
                ))}
              </div>
              <p className="mt-3 text-xs text-gray-500">
                Badges surface what guests called out most often after their
                trips.
              </p>
            </>
          ) : (
            <p className="mt-3 text-sm text-gray-500">
              No badge highlights yet — check back after the next trip.
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-black/10 bg-white p-4">
          <h4 className="text-sm font-semibold">At a glance</h4>
          <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg border border-black/5 bg-gray-50 p-3">
              <div className="text-xs text-gray-500">Avg. rating</div>
              <div className="text-base font-semibold">
                {ratingAvg.toFixed(1)} / 5
              </div>
            </div>
            <div className="rounded-lg border border-black/5 bg-gray-50 p-3">
              <div className="text-xs text-gray-500">Total badges</div>
              <div className="text-base font-semibold">{totalBadges}</div>
            </div>
            <div className="col-span-2 rounded-lg border border-black/5 bg-gray-50 p-3">
              <div className="text-xs text-gray-500">Recent activity</div>
              <div className="text-sm">{formatDate(reviews[0]?.createdAt)}</div>
            </div>
          </div>
        </div>
      </div>

      {highlightBadges.length > 0 && (
        <p className="mt-4 text-xs text-gray-500">
          Guests most often praise{" "}
          {highlightBadges.map((badge) => badge.label).join(", ")}.
        </p>
      )}
    </section>
  );
}
