export type SearchParams = Record<string, string | string[] | undefined>;

export type Status = "QUEUED" | "TRANSCODING" | "READY" | "FAILED";
export type VideoStatus = "queued" | "processing" | "ready" | "failed";
export type Kind = "IMAGE" | "VIDEO";
export type Tab = "pipeline" | "storage" | "videos";

export type Reference = {
  type: string;
  label: string;
  href?: string;
};

export type AnnotatedRow = {
  id: string;
  userId: string;
  charterId: string | null;
  status: Status;
  kind: Kind;
  originalKey: string;
  originalUrl: string;
  finalKey: string | null;
  finalUrl: string | null;
  thumbnailUrl: string | null;
  sizeBytes: number | null;
  mimeType: string | null;
  durationSeconds: number | null;
  error: string | null;
  correlationId: string | null;
  consumedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  charterMediaId: string | null;
  displayName: string;
  email: string;
  charterName: string | null;
  charterActive: boolean | null;
  stale: boolean;
  createdAgoLabel: string;
  updatedAgoLabel: string;
  consumedAgoLabel: string;
  awaitingFinalAsset: boolean;
};

export type PipelineViewModel = {
  statusFilter: Status | null;
  kindFilter: Kind | null;
  staleOnly: boolean;
  statusCounts: Record<Status, number>;
  staleCount: number;
  filteredRows: AnnotatedRow[];
  fetchLimit: number;
  fetchedCount: number;
  displayCount: number;
};

export type VideoRow = {
  id: string;
  ownerId: string;
  originalUrl: string;
  blobKey: string | null;
  thumbnailUrl: string | null;
  thumbnailBlobKey: string | null;
  trimStartSec: number;
  ready720pUrl: string | null;
  normalizedBlobKey: string | null;
  processStatus: VideoStatus;
  errorMessage: string | null;
  createdAt: Date;
  didFallback: boolean;
  fallbackReason: string | null;
  updatedAt: Date;
  originalDurationSec?: number | null;
  processedDurationSec?: number | null;
  appliedTrimStartSec?: number | null;
  processedAt?: Date | null;
  // Enhanced with user data
  displayName: string;
  email: string;
  createdAgoLabel: string;
  updatedAgoLabel: string;
  sizeBytes: number | null;
  durationSeconds: number | null;
  stale: boolean;
  // Video metadata
  originalSize: number | null;
  originalResolution: string | null;
  normalizedSize: number | null;
  normalizedResolution: string | null;
};

export type VideoViewModel = {
  statusFilter: VideoStatus | null;
  fallbackFilter: boolean | null;
  staleOnly: boolean;
  statusCounts: Record<VideoStatus, number>;
  fallbackCount: number;
  staleCount: number;
  filteredRows: VideoRow[];
  fetchLimit: number;
  fetchedCount: number;
  displayCount: number;
};

export type StorageScope =
  | "charter-media"
  | "avatar"
  | "verification"
  | "captain-videos"
  | "legacy"
  | "other";

export type StorageSortKey = "uploadedAt" | "size" | "key";

export type StorageRow = {
  key: string;
  url: string;
  size: number;
  sizeLabel: string;
  uploadedAtIso: string;
  uploadedAgo: string;
  contentType: string | null;
  scope: StorageScope;
  scopeLabel: string;
  linked: boolean;
  references: Reference[];
  // Video-specific metadata
  linkedVideoId?: string;
  videoStatus?: string;
  originalVideoKey?: string | null;
  thumbnailKey?: string | null;
  normalizedKey?: string | null;
  isOriginalVideo?: boolean;
  isThumbnail?: boolean;
  isNormalizedVideo?: boolean;
  // Owner info for captain-videos
  ownerName?: string;
  ownerAvatar?: string | null;
  ownerId?: string;
};

export type StorageViewModel = {
  rows: StorageRow[];
  total: number; // Total blobs across all pages
  linkedCount: number;
  orphanCount: number;
  filteredCount: number; // Total after filtering, before pagination
  totalSize: number; // Sum of all blob sizes in bytes (all pages)
  fetchLimit: number;
  currentPage: number;
  totalPages: number;
  scopeFilter: StorageScope | null;
  linkFilter: "linked" | "orphan" | null;
  searchQuery: string;
  sortKey: StorageSortKey;
  sortDir: "asc" | "desc";
  missingReferenced: { key: string; references: Reference[] }[];
  error?: string;
};

export const STATUSES: Status[] = ["QUEUED", "TRANSCODING", "READY", "FAILED"];

export const STATUS_LABEL: Record<Status, string> = {
  QUEUED: "Queued",
  TRANSCODING: "Transcoding",
  READY: "Ready",
  FAILED: "Failed",
};

export const STATUS_BADGE_CLASSES: Record<Status, string> = {
  QUEUED: "bg-slate-100 text-slate-700 border border-slate-200",
  TRANSCODING: "bg-blue-100 text-blue-700 border border-blue-200",
  READY: "bg-emerald-100 text-emerald-800 border border-emerald-200",
  FAILED: "bg-rose-100 text-rose-700 border border-rose-200",
};

export const KIND_LABEL: Record<Kind, string> = {
  IMAGE: "Image",
  VIDEO: "Video",
};

export const STORAGE_SCOPE_LABEL: Record<StorageScope, string> = {
  "charter-media": "Photos",
  avatar: "Avatar",
  verification: "Verification",
  "captain-videos": "Videos",
  legacy: "Legacy",
  other: "Other",
};

export const STORAGE_SCOPE_OPTIONS: Array<{
  value: StorageScope | null;
  label: string;
}> = [
  { value: null, label: "All scopes" },
  { value: "charter-media", label: "Photos" },
  { value: "avatar", label: "Avatars" },
  { value: "verification", label: "Verification" },
  { value: "captain-videos", label: "Videos" },
  { value: "legacy", label: "Legacy" },
  { value: "other", label: "Other" },
];

export const STORAGE_SORT_LABEL: Record<StorageSortKey, string> = {
  uploadedAt: "Uploaded",
  size: "Size",
  key: "Key",
};

export const STALE_THRESHOLD_MINUTES = 15;
export const FETCH_LIMIT_DEFAULT = 100;
export const FETCH_LIMIT_STALE = 200;
export const BLOB_FETCH_LIMIT = 100; // Per page for pagination
export const BLOB_PAGE_SIZE = 100; // Items per API call

const STORAGE_SCOPES: StorageScope[] = [
  "charter-media",
  "avatar",
  "verification",
  "captain-videos",
  "legacy",
  "other",
];

export const getParam = (
  params: SearchParams | undefined,
  key: string
): string | null => {
  const value = params?.[key];
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
};

export const buildHref = (
  basePath: string,
  params: SearchParams | undefined,
  updates: Record<string, string | null>
) => {
  const qp = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([paramKey, paramValue]) => {
      if (
        paramValue === undefined ||
        Object.prototype.hasOwnProperty.call(updates, paramKey)
      ) {
        return;
      }
      if (Array.isArray(paramValue)) {
        paramValue.forEach((v) => qp.append(paramKey, v));
      } else if (paramValue !== undefined) {
        qp.set(paramKey, paramValue);
      }
    });
  }

  Object.entries(updates).forEach(([updateKey, updateValue]) => {
    if (updateValue === null) {
      qp.delete(updateKey);
    } else {
      qp.set(updateKey, updateValue);
    }
  });

  const qs = qp.toString();
  return qs ? `${basePath}?${qs}` : basePath;
};

export const formatRelative = (ms: number) => {
  if (!Number.isFinite(ms)) return "-";
  const sec = Math.max(0, Math.floor(ms / 1000));
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) {
    const rem = min % 60;
    return rem > 0 ? `${hrs}h ${rem}m ago` : `${hrs}h ago`;
  }
  const days = Math.floor(hrs / 24);
  return days === 1 ? "1 day ago" : `${days} days ago`;
};

export const formatBytes = (bytes: number | null | undefined) => {
  if (bytes === null || bytes === undefined) return "-";
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const idx = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, idx);
  return `${value.toFixed(idx === 0 ? 0 : 1)} ${units[idx]}`;
};

export const formatDuration = (seconds: number | null | undefined) => {
  if (seconds === null || seconds === undefined) return "-";
  const total = Math.round(seconds);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs.toString().padStart(2, "0")}s`;
};

export const normalizeKey = (raw: string | null | undefined): string | null => {
  if (!raw || typeof raw !== "string") return null;
  let key = raw.trim();
  if (!key) return null;
  if (/^https?:\/\//i.test(key)) {
    try {
      const url = new URL(key);
      key = url.pathname;
    } catch {
      const idx = key.indexOf("//");
      if (idx >= 0) {
        const rest = key.slice(idx + 2);
        const slash = rest.indexOf("/");
        key = slash >= 0 ? rest.slice(slash) : rest;
      }
    }
  }
  key = key.replace(/^\/+/, "");
  if (!key) return null;
  try {
    key = decodeURIComponent(key);
  } catch {
    // ignore decode errors
  }
  return key;
};

export const extractKeyFromUrl = (
  url: string | null | undefined
): string | null => normalizeKey(url);

export const extractVerificationDocs = (
  value: unknown,
  label: string
): Array<{ key: string; label: string }> => {
  if (!value || typeof value !== "object") return [];
  const entries: unknown[] = Array.isArray(value)
    ? value
    : [value as Record<string, unknown>];
  const results: Array<{ key: string; label: string }> = [];
  entries.forEach((entry, idx) => {
    if (!entry || typeof entry !== "object") return;
    const record = entry as Record<string, unknown>;
    const key = normalizeKey(
      typeof record.key === "string" ? record.key : undefined
    );
    const name = typeof record.name === "string" ? record.name : undefined;
    if (key) {
      results.push({
        key,
        label: name
          ? `${label}: ${name}`
          : label + (entries.length > 1 ? ` #${idx + 1}` : ""),
      });
    }
  });
  return results;
};

export const classifyScope = (key: string): StorageScope => {
  if (key.startsWith("captains/") && key.includes("/avatar/")) return "avatar";
  if (key.startsWith("captains/") && key.includes("/media/"))
    return "charter-media";
  if (key.startsWith("captain-videos/")) return "captain-videos";
  if (key.startsWith("captains/") && key.includes("/videos/"))
    return "captain-videos";
  if (key.startsWith("verification/")) return "verification";
  if (key.startsWith("charters/")) return "legacy";
  return "other";
};

export const isStorageScope = (value: string | null): value is StorageScope =>
  value !== null && STORAGE_SCOPES.includes(value as StorageScope);

export const parseTab = (value: string | null): Tab => {
  if (value === "storage") return "storage";
  if (value === "videos") return "videos";
  return "videos"; // Default to videos instead of pipeline
};

// PendingMedia removed; no conversion needed.
