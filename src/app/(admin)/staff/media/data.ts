import { prisma } from "@/lib/prisma";
import { head, list } from "@vercel/blob";

import {
  BLOB_FETCH_LIMIT,
  BLOB_PAGE_SIZE,
  FETCH_LIMIT_DEFAULT,
  FETCH_LIMIT_STALE,
  Reference,
  STALE_THRESHOLD_MINUTES,
  STORAGE_SCOPE_LABEL,
  SearchParams,
  StorageRow,
  StorageScope,
  StorageSortKey,
  StorageViewModel,
  VideoRow,
  VideoStatus,
  VideoViewModel,
  classifyScope,
  extractKeyFromUrl,
  extractVerificationDocs,
  formatBytes,
  formatRelative,
  getParam,
  isStorageScope,
  normalizeKey,
} from "./shared";

// Helper to fetch blob metadata (size, content-type)
async function getBlobMetadata(url: string | null): Promise<{
  size: number | null;
  contentType: string | null;
}> {
  if (!url) return { size: null, contentType: null };

  try {
    const blob = await head(url);
    return {
      size: blob.size,
      contentType: blob.contentType || null,
    };
  } catch (error) {
    console.error(
      `[getBlobMetadata] Failed to fetch metadata for ${url}:`,
      error
    );
    return { size: null, contentType: null };
  }
}

// Helper to format resolution dimensions as "widthxheight" string
function formatResolution(
  width: number | null | undefined,
  height: number | null | undefined
): string | null {
  if (!width || !height) return null;
  return `${width}×${height}`;
}

// PendingMedia pipeline removed; loadPipelineData dropped.

export async function loadVideoData(
  searchParams: SearchParams | undefined
): Promise<VideoViewModel> {
  const statusParam = (getParam(searchParams, "status") || "")
    .toLowerCase()
    .trim() as VideoStatus | "";
  const fallbackParam = getParam(searchParams, "fallback");
  const staleOnly = getParam(searchParams, "stale") === "true";

  const statusFilter = ["queued", "processing", "ready", "failed"].includes(
    statusParam
  )
    ? (statusParam as VideoStatus)
    : null;
  const fallbackFilter =
    fallbackParam === "true" ? true : fallbackParam === "false" ? false : null;

  const where: {
    processStatus?: VideoStatus;
    didFallback?: boolean;
  } = {
    ...(statusFilter ? { processStatus: statusFilter } : {}),
    ...(fallbackFilter !== null ? { didFallback: fallbackFilter } : {}),
  };

  const fetchLimit = staleOnly ? FETCH_LIMIT_STALE : FETCH_LIMIT_DEFAULT;

  const [statusGroups, fallbackCount, rawItems] = await Promise.all([
    prisma.captainVideo.groupBy({
      by: ["processStatus"],
      _count: { _all: true },
    }),
    prisma.captainVideo.count({ where: { didFallback: true } }),
    prisma.captainVideo.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: fetchLimit,
    }),
  ]);

  const statusCounts = ["queued", "processing", "ready", "failed"].reduce<
    Record<VideoStatus, number>
  >(
    (acc, status) => {
      const match = statusGroups.find(
        (g: { processStatus: string }) => g.processStatus === status
      );
      acc[status as VideoStatus] = match?._count._all ?? 0;
      return acc;
    },
    { queued: 0, processing: 0, ready: 0, failed: 0 }
  );

  const ownerIds = Array.from(new Set(rawItems.map((item) => item.ownerId)));

  const [users, profiles] = await Promise.all([
    ownerIds.length
      ? prisma.user.findMany({
          where: { id: { in: ownerIds } },
          select: {
            id: true,
            email: true,
            name: true,
            firstName: true,
            lastName: true,
          },
        })
      : Promise.resolve([]),
    ownerIds.length
      ? prisma.captainProfile.findMany({
          where: { userId: { in: ownerIds } },
          select: { userId: true, displayName: true },
        })
      : Promise.resolve([]),
  ]);

  const userMap = new Map(users.map((user) => [user.id, user]));
  const profileMap = new Map(
    profiles.map((profile) => [profile.userId, profile.displayName])
  );

  const nowMs = Date.now();
  const staleThresholdMs = STALE_THRESHOLD_MINUTES * 60 * 1000;

  // Fetch blob metadata for original and normalized videos in parallel
  const blobMetadataPromises = rawItems.flatMap((item) => [
    getBlobMetadata(item.originalUrl).then((meta) => ({
      id: item.id,
      type: "original" as const,
      ...meta,
    })),
    getBlobMetadata(item.ready720pUrl).then((meta) => ({
      id: item.id,
      type: "normalized" as const,
      ...meta,
    })),
  ]);

  const blobMetadataResults = await Promise.allSettled(blobMetadataPromises);

  // Map metadata by video ID
  const metadataMap = new Map<
    string,
    {
      originalSize: number | null;
      normalizedSize: number | null;
    }
  >();

  blobMetadataResults.forEach((result) => {
    if (result.status === "fulfilled") {
      const { id, type, size } = result.value;
      const existing = metadataMap.get(id) || {
        originalSize: null,
        normalizedSize: null,
      };
      if (type === "original") {
        existing.originalSize = size;
      } else {
        existing.normalizedSize = size;
      }
      metadataMap.set(id, existing);
    }
  });

  const annotated: VideoRow[] = rawItems.map((item) => {
    // Helper to safely pluck optional post-migration fields without depending on generated types yet
    const pickField = <T = unknown>(key: string): T | null => {
      const record = item as unknown as Record<string, unknown>;
      const val = record[key];
      return (val === undefined ? null : (val as T)) as T | null;
    };
    const user = userMap.get(item.ownerId);
    const profileName = profileMap.get(item.ownerId);
    const displayName =
      profileName ||
      user?.name ||
      [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
      "(unknown)";
    const email = user?.email ?? "-";
    const createdAgoMs = nowMs - item.createdAt.getTime();
    const updatedAgoMs = nowMs - item.updatedAt.getTime();
    const stale =
      (item.processStatus === "queued" ||
        item.processStatus === "processing") &&
      updatedAgoMs > staleThresholdMs;

    const metadata = metadataMap.get(item.id) || {
      originalSize: null,
      normalizedSize: null,
    };

    return {
      id: item.id,
      ownerId: item.ownerId,
      originalUrl: item.originalUrl,
      blobKey: item.blobKey,
      thumbnailUrl: item.thumbnailUrl,
      thumbnailBlobKey: item.thumbnailBlobKey,
      trimStartSec: item.trimStartSec,
      ready720pUrl: item.ready720pUrl,
      normalizedBlobKey: item.normalizedBlobKey,
      processStatus: item.processStatus as VideoStatus,
      errorMessage: item.errorMessage,
      createdAt: item.createdAt,
      didFallback: item.didFallback,
      fallbackReason: item.fallbackReason,
      updatedAt: item.updatedAt,
      // These optional fields may not exist on older generated Prisma client types.
      // Cast to any to avoid type errors during deployment when the schema migration lags.
      originalDurationSec: pickField<number>("originalDurationSec"),
      processedDurationSec: pickField<number>("processedDurationSec"),
      appliedTrimStartSec: pickField<number>("appliedTrimStartSec"),
      processedAt: pickField<Date>("processedAt"),
      displayName,
      email,
      createdAgoLabel: formatRelative(createdAgoMs),
      updatedAgoLabel: formatRelative(updatedAgoMs),
      sizeBytes: null, // Legacy field
      durationSeconds: null, // Legacy field
      stale,
      // Video metadata from blob and database
      originalSize: metadata.originalSize,
      originalResolution: formatResolution(
        pickField<number>("originalWidth"),
        pickField<number>("originalHeight")
      ),
      normalizedSize: metadata.normalizedSize,
      normalizedResolution: formatResolution(
        pickField<number>("processedWidth"),
        pickField<number>("processedHeight")
      ),
    };
  });

  const staleCount = annotated.filter((row) => row.stale).length;
  const filteredRows = staleOnly
    ? annotated.filter((row) => row.stale)
    : annotated;

  return {
    statusFilter,
    fallbackFilter,
    staleOnly,
    statusCounts,
    fallbackCount,
    staleCount,
    filteredRows,
    fetchLimit,
    fetchedCount: rawItems.length,
    displayCount: filteredRows.length,
  };
}

export async function loadStorageData(
  searchParams: SearchParams | undefined
): Promise<StorageViewModel> {
  const scopeParam = getParam(searchParams, "scope");
  const linkParam = getParam(searchParams, "linked");
  const searchQuery = (getParam(searchParams, "q") || "").trim();
  const sortParam = (
    getParam(searchParams, "sort") || "uploadedAt"
  ).toLowerCase();
  const dirParam = getParam(searchParams, "dir") === "asc" ? "asc" : "desc";
  const cursorParam = getParam(searchParams, "cursor"); // Pagination cursor

  const scopeFilter = isStorageScope(scopeParam)
    ? (scopeParam as StorageScope)
    : null;
  const linkFilter =
    linkParam === "linked" || linkParam === "orphan"
      ? (linkParam as "linked" | "orphan")
      : null;
  const sortKey: StorageSortKey =
    sortParam === "size" || sortParam === "key"
      ? (sortParam as StorageSortKey)
      : "uploadedAt";
  const sortDir: "asc" | "desc" = dirParam;

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    return {
      rows: [],
      total: 0,
      linkedCount: 0,
      orphanCount: 0,
      filteredCount: 0,
      totalSize: 0,
      fetchLimit: BLOB_FETCH_LIMIT,
      currentPage: 1,
      totalPages: 0,
      scopeFilter,
      linkFilter,
      searchQuery,
      sortKey,
      sortDir,
      missingReferenced: [],
      error:
        "BLOB_READ_WRITE_TOKEN env var is required to list storage contents.",
    };
  }

  const references = new Map<string, Reference[]>();
  const addReference = (key: string | null, ref: Reference) => {
    const normalized = normalizeKey(key);
    if (!normalized) return;
    const existing = references.get(normalized);
    if (existing) existing.push(ref);
    else references.set(normalized, [ref]);
  };

  const [charterMedia, captainProfiles, verifications, captainVideos] =
    await Promise.all([
      prisma.charterMedia.findMany({
        select: {
          id: true,
          charterId: true,
          captainId: true,
          kind: true,
          storageKey: true,
          charter: { select: { name: true } },
          captain: {
            select: {
              displayName: true,
              user: { select: { email: true, name: true } },
            },
          },
        },
      }),
      prisma.captainProfile.findMany({
        select: {
          userId: true,
          displayName: true,
          avatarUrl: true,
          user: { select: { email: true, name: true } },
        },
      }),
      prisma.captainVerification.findMany({
        select: {
          userId: true,
          idFront: true,
          idBack: true,
          captainLicense: true,
          boatRegistration: true,
          fishingLicense: true,
          additional: true,
        },
      }),
      prisma.captainVideo.findMany({
        select: {
          id: true,
          ownerId: true,
          charterId: true,
          charterMediaId: true,
          originalUrl: true,
          blobKey: true,
          thumbnailUrl: true,
          thumbnailBlobKey: true,
          ready720pUrl: true,
          normalizedBlobKey: true,
          processStatus: true,
          didFallback: true,
          originalDeletedAt: true,
          createdAt: true,
        },
      }),
    ]);

  charterMedia.forEach((media) => {
    // Determine appropriate label based on whether media is finalized or pending
    let label: string;
    let href: string | undefined;

    if (media.charterId) {
      // Finalized: linked to a charter
      label = `Charter ${media.charter?.name ?? media.charterId} • ${
        media.kind
      }`;
      href = `/staff/charters/${media.charterId}`;
    } else if (media.captainId) {
      // Pending: uploaded but not yet finalized
      const captainLabel =
        media.captain?.displayName ||
        media.captain?.user?.name ||
        media.captain?.user?.email?.split("@")[0] ||
        `Captain ${media.captainId.slice(0, 8)}`;
      label = `Pending ${media.kind} • ${captainLabel}`;
      href = undefined; // No charter page yet
    } else {
      // Truly orphaned: no captain or charter
      label = `Orphan ${media.kind} • ${media.id.slice(0, 8)}`;
      href = undefined;
    }

    addReference(media.storageKey, {
      type: "CharterMedia",
      label,
      href,
    });
  });

  // PendingMedia references removed

  captainProfiles.forEach(
    (profile: {
      userId: string;
      displayName: string | null;
      avatarUrl: string | null;
      user: { email: string | null; name: string | null } | null;
    }) => {
      const key = extractKeyFromUrl(profile.avatarUrl);
      if (!key) return;
      const label =
        profile.displayName ||
        profile.user?.name ||
        profile.user?.email ||
        profile.userId;
      addReference(key, {
        type: "CaptainAvatar",
        label: `Captain avatar • ${label}`,
      });
    }
  );

  verifications.forEach(
    (row: {
      userId: string;
      idFront: unknown;
      idBack: unknown;
      captainLicense: unknown;
      boatRegistration: unknown;
      fishingLicense: unknown;
      additional: unknown;
    }) => {
      const userLabel = row.userId;
      extractVerificationDocs(row.idFront, "ID front").forEach((doc) =>
        addReference(doc.key, {
          type: "Verification",
          label: `${doc.label} • ${userLabel}`,
        })
      );
      extractVerificationDocs(row.idBack, "ID back").forEach((doc) =>
        addReference(doc.key, {
          type: "Verification",
          label: `${doc.label} • ${userLabel}`,
        })
      );
      extractVerificationDocs(row.captainLicense, "Captain license").forEach(
        (doc) =>
          addReference(doc.key, {
            type: "Verification",
            label: `${doc.label} • ${userLabel}`,
          })
      );
      extractVerificationDocs(
        row.boatRegistration,
        "Boat registration"
      ).forEach((doc) =>
        addReference(doc.key, {
          type: "Verification",
          label: `${doc.label} • ${userLabel}`,
        })
      );
      extractVerificationDocs(row.fishingLicense, "Fishing license").forEach(
        (doc) =>
          addReference(doc.key, {
            type: "Verification",
            label: `${doc.label} • ${userLabel}`,
          })
      );
      extractVerificationDocs(row.additional, "Additional doc").forEach((doc) =>
        addReference(doc.key, {
          type: "Verification",
          label: `${doc.label} • ${userLabel}`,
        })
      );
    }
  );

  // Add CaptainVideo references with relationship tracking
  const videoKeyMap = new Map<
    string,
    {
      id: string;
      ownerId: string;
      ownerName: string;
      ownerAvatar: string | null;
      status: string;
      originalKey: string | null;
      thumbnailKey: string | null;
      normalizedKey: string | null;
      didFallback: boolean;
      originalDeleted: boolean;
    }
  >();

  // Fetch owner profiles for videos
  const videoOwnerIds = Array.from(
    new Set(captainVideos.map((v) => v.ownerId))
  );
  const videoOwnerProfiles = await prisma.captainProfile.findMany({
    where: { userId: { in: videoOwnerIds } },
    select: {
      userId: true,
      displayName: true,
      avatarUrl: true,
      user: { select: { email: true, name: true } },
    },
  });
  const videoOwnerMap = new Map(
    videoOwnerProfiles.map((p) => [
      p.userId,
      {
        name:
          p.displayName ||
          p.user?.name ||
          p.user?.email?.split("@")[0] ||
          "Unknown",
        avatar: p.avatarUrl,
      },
    ])
  );

  captainVideos.forEach((video) => {
    const originalKey = extractKeyFromUrl(video.originalUrl);
    const thumbnailKey = extractKeyFromUrl(video.thumbnailUrl);
    const normalizedKey = extractKeyFromUrl(video.ready720pUrl);
    const owner = videoOwnerMap.get(video.ownerId) || {
      name: "Unknown",
      avatar: null,
    };
    const ownerLabel = owner.name;

    // Determine video status label based on linkage
    let statusSuffix = "";
    if (video.charterMediaId) {
      statusSuffix = " • Finalized";
    } else if (video.charterId) {
      statusSuffix = " • Linked to Charter";
    } else {
      statusSuffix = " • Pending";
    }

    const videoLabel = `Video ${video.id.slice(0, 8)} • ${ownerLabel} • ${
      video.processStatus
    }${statusSuffix}`;
    const originalDeleted = video.originalDeletedAt !== null;

    const videoMeta = {
      id: video.id,
      ownerId: video.ownerId,
      ownerName: owner.name,
      ownerAvatar: owner.avatar,
      status: video.processStatus,
      originalKey,
      thumbnailKey,
      normalizedKey,
      didFallback: video.didFallback,
      originalDeleted,
    };

    // Store video metadata for cross-referencing
    if (originalKey) {
      videoKeyMap.set(normalizeKey(originalKey) || originalKey, videoMeta);
    }
    if (thumbnailKey) {
      videoKeyMap.set(normalizeKey(thumbnailKey) || thumbnailKey, videoMeta);
    }
    if (normalizedKey) {
      videoKeyMap.set(normalizeKey(normalizedKey) || normalizedKey, videoMeta);
    }

    // Add references - videos are always "linked" since they belong to a captain (ownerId)
    if (originalKey && !originalDeleted) {
      addReference(originalKey, {
        type: "CaptainVideo",
        label: `${videoLabel} (original)${
          video.didFallback ? " [fallback]" : ""
        }`,
        href: `/staff/media?tab=videos&videoId=${video.id}`,
      });
    }
    if (thumbnailKey) {
      addReference(thumbnailKey, {
        type: "CaptainVideo",
        label: `${videoLabel} (thumbnail)`,
        href: `/staff/media?tab=videos&videoId=${video.id}`,
      });
    }
    if (normalizedKey) {
      addReference(normalizedKey, {
        type: "CaptainVideo",
        label: `${videoLabel} (720p)`,
        href: `/staff/media?tab=videos&videoId=${video.id}`,
      });
    }
  });

  // Fetch ALL blobs from storage (not paginated yet)
  const blobs: Array<{
    pathname: string;
    size: number;
    uploadedAt: string;
    url: string;
    contentType: string | null;
  }> = [];
  let cursor: string | undefined;
  let fetchCount = 0;
  const maxFetch = 1000; // Safety limit to prevent infinite loop

  do {
    fetchCount++;
    if (fetchCount > maxFetch / BLOB_PAGE_SIZE) break; // Prevent infinite loop

    const { blobs: page, cursor: nextCursor } = await list({
      token,
      limit: BLOB_PAGE_SIZE,
      cursor,
    });
    blobs.push(
      ...page.map((blob) => ({
        pathname: blob.pathname,
        size: blob.size,
        uploadedAt: new Date(blob.uploadedAt).toISOString(),
        url: blob.url,
        contentType:
          "contentType" in blob && typeof blob.contentType === "string"
            ? blob.contentType
            : null,
      }))
    );
    cursor = nextCursor || undefined;
  } while (cursor);

  const now = Date.now();

  const rowsRaw: StorageRow[] = blobs.map(
    (blob: {
      pathname: string;
      size: number;
      uploadedAt: string;
      url: string;
      contentType: string | null;
    }) => {
      const key = normalizeKey(blob.pathname) ?? blob.pathname;
      const refs = references.get(key) ?? [];
      const scope = classifyScope(key);
      const uploaded = new Date(blob.uploadedAt);

      // Check if this blob is part of a video pipeline
      const videoMeta = videoKeyMap.get(key);
      const isOriginal = videoMeta?.originalKey
        ? normalizeKey(videoMeta.originalKey) === key
        : false;
      const isThumbnail = videoMeta?.thumbnailKey
        ? normalizeKey(videoMeta.thumbnailKey) === key
        : false;
      const isNormalized = videoMeta?.normalizedKey
        ? normalizeKey(videoMeta.normalizedKey) === key
        : false;

      return {
        key,
        url: blob.url,
        size: blob.size,
        sizeLabel: formatBytes(blob.size),
        uploadedAtIso: uploaded.toISOString(),
        uploadedAgo: formatRelative(now - uploaded.getTime()),
        contentType: blob.contentType,
        scope,
        scopeLabel: STORAGE_SCOPE_LABEL[scope],
        linked: refs.length > 0,
        references: refs,
        // Video metadata
        linkedVideoId: videoMeta?.id,
        videoStatus: videoMeta?.status,
        originalVideoKey: videoMeta?.originalKey,
        thumbnailKey: videoMeta?.thumbnailKey,
        normalizedKey: videoMeta?.normalizedKey,
        isOriginalVideo: isOriginal,
        isThumbnail,
        isNormalizedVideo: isNormalized,
        // Owner info
        ownerName: videoMeta?.ownerName,
        ownerAvatar: videoMeta?.ownerAvatar,
        ownerId: videoMeta?.ownerId,
      };
    }
  );

  const total = rowsRaw.length;
  const totalSize = rowsRaw.reduce((sum, row) => sum + row.size, 0);
  const linkedCount = rowsRaw.filter((row) => row.linked).length;
  const orphanCount = total - linkedCount;

  // Apply filters to full dataset
  let filtered = rowsRaw;
  if (scopeFilter) {
    filtered = filtered.filter((row) => row.scope === scopeFilter);
  }
  if (linkFilter === "linked") {
    filtered = filtered.filter((row) => row.linked);
  } else if (linkFilter === "orphan") {
    filtered = filtered.filter((row) => !row.linked);
  }
  if (searchQuery) {
    const needle = searchQuery.toLowerCase();
    filtered = filtered.filter(
      (row) =>
        row.key.toLowerCase().includes(needle) ||
        row.references.some((ref) => ref.label.toLowerCase().includes(needle))
    );
  }

  // Sort filtered results
  const sorted = [...filtered].sort((a, b) => {
    let compare = 0;
    switch (sortKey) {
      case "size":
        compare = a.size - b.size;
        break;
      case "key":
        compare = a.key.localeCompare(b.key);
        break;
      case "uploadedAt":
      default: {
        const aTime = Date.parse(a.uploadedAtIso);
        const bTime = Date.parse(b.uploadedAtIso);
        compare = aTime - bTime;
        break;
      }
    }
    if (compare === 0) {
      compare = a.key.localeCompare(b.key);
    }
    return sortDir === "desc" ? -compare : compare;
  });

  // Paginate the filtered+sorted results
  const page = parseInt(cursorParam || "1", 10);
  const pageSize = BLOB_FETCH_LIMIT; // 100 per page
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const rows = sorted.slice(startIndex, endIndex);
  const totalPages = Math.ceil(sorted.length / pageSize);

  const rawKeys = new Set(rowsRaw.map((row) => row.key));
  const missingReferenced = Array.from(references.entries())
    .filter(([key]) => !rawKeys.has(key))
    .map(([key, refs]) => ({ key, references: refs }));

  return {
    rows,
    total,
    totalSize,
    linkedCount,
    orphanCount,
    filteredCount: sorted.length, // Total after filtering
    fetchLimit: BLOB_FETCH_LIMIT,
    currentPage: page,
    totalPages,
    scopeFilter,
    linkFilter,
    searchQuery,
    sortKey,
    sortDir,
    missingReferenced,
  };
}
