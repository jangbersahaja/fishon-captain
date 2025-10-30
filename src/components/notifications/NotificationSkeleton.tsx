/**
 * NotificationSkeleton Component
 *
 * Loading skeleton for notification items
 */

export function NotificationSkeleton() {
  return (
    <div className="flex gap-3 p-3 sm:p-4 animate-pulse">
      {/* Icon skeleton */}
      <div className="flex-shrink-0">
        <div className="w-5 h-5 bg-gray-200 rounded-full sm:w-6 sm:h-6" />
      </div>

      {/* Content skeleton */}
      <div className="flex-1 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 space-y-2">
            <div className="w-3/4 h-4 bg-gray-200 rounded" />
            <div className="w-full h-3 bg-gray-100 rounded" />
            <div className="w-2/3 h-3 bg-gray-100 rounded" />
          </div>
          <div className="w-2 h-2 bg-gray-200 rounded-full" />
        </div>
        <div className="w-24 h-3 bg-gray-100 rounded" />
      </div>
    </div>
  );
}

export function NotificationListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="bg-white border divide-y rounded-lg shadow-sm">
      {Array.from({ length: count }).map((_, i) => (
        <NotificationSkeleton key={i} />
      ))}
    </div>
  );
}
