import { prisma } from "@/lib/prisma";
import type { PendingMediaStatus } from "@prisma/client";
import { list } from "@vercel/blob";

import {
  AnnotatedRow,
  BLOB_FETCH_LIMIT,
  BLOB_PAGE_SIZE,
  FETCH_LIMIT_DEFAULT,
  FETCH_LIMIT_STALE,
  Kind,
  PipelineViewModel,
  Reference,
  STALE_THRESHOLD_MINUTES,
  STATUSES,
  STORAGE_SCOPE_LABEL,
  SearchParams,
  Status,
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

export async function loadPipelineData(
  searchParams: SearchParams | undefined
): Promise<PipelineViewModel> {
  const statusParam = (getParam(searchParams, "status") || "")
    .toUpperCase()
    .trim() as Status | "";
  const kindParam = (getParam(searchParams, "kind") || "")
    .toUpperCase()
    .trim() as Kind | "";
  const staleOnly = getParam(searchParams, "stale") === "true";

  const statusFilter = STATUSES.includes(statusParam as Status)
    ? (statusParam as Status)
    : null;
  const kindFilter =
    kindParam === "IMAGE" || kindParam === "VIDEO" ? (kindParam as Kind) : null;

  const where: { status?: PendingMediaStatus; kind?: string } = {
    ...(statusFilter ? { status: statusFilter as PendingMediaStatus } : {}),
    ...(kindFilter ? { kind: kindFilter } : {}),
  };

  const fetchLimit = staleOnly ? FETCH_LIMIT_STALE : FETCH_LIMIT_DEFAULT;

  const [statusGroups, rawItems] = await Promise.all([
    prisma.pendingMedia
      .groupBy({
        by: ["status"],
        _count: { _all: true },
      })
      .then(
        (rows) =>
          rows as Array<{
            status: PendingMediaStatus;
            _count: { _all: number };
          }>
      ),
    prisma.pendingMedia.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: fetchLimit,
    }),
  ]);

  const statusCounts = STATUSES.reduce<Record<Status, number>>(
    (acc, status) => {
      const match = statusGroups.find(
        (g: { status: PendingMediaStatus }) =>
          g.status === (status as PendingMediaStatus)
      );
      acc[status] = match?._count._all ?? 0;
      return acc;
    },
    { QUEUED: 0, TRANSCODING: 0, READY: 0, FAILED: 0 }
  );

  const userIds = Array.from(new Set(rawItems.map((item) => item.userId)));
  const charterIds = Array.from(
    new Set(rawItems.map((item) => item.charterId).filter(Boolean))
  ) as string[];

  const [users, profiles, charters] = await Promise.all([
    userIds.length
      ? prisma.user.findMany({
          where: { id: { in: userIds } },
          select: {
            id: true,
            email: true,
            name: true,
            firstName: true,
            lastName: true,
          },
        })
      : Promise.resolve([]),
    userIds.length
      ? prisma.captainProfile.findMany({
          where: { userId: { in: userIds } },
          select: { userId: true, displayName: true },
        })
      : Promise.resolve([]),
    charterIds.length
      ? prisma.charter.findMany({
          where: { id: { in: charterIds } },
          select: { id: true, name: true, isActive: true },
        })
      : Promise.resolve([]),
  ]);

  const userMap = new Map(users.map((user) => [user.id, user]));
  const profileMap = new Map(
    profiles.map((profile) => [profile.userId, profile.displayName])
  );
  const charterMap = new Map(charters.map((charter) => [charter.id, charter]));

  const nowMs = Date.now();
  const staleThresholdMs = STALE_THRESHOLD_MINUTES * 60 * 1000;

  const annotated: AnnotatedRow[] = rawItems.map((item) => {
    const user = userMap.get(item.userId);
    const profileName = profileMap.get(item.userId);
    const charter = item.charterId ? charterMap.get(item.charterId) : undefined;
    const displayName =
      profileName ||
      user?.name ||
      [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
      "(unknown)";
    const email = user?.email ?? "-";
    const createdAgoMs = nowMs - item.createdAt.getTime();
    const updatedAgoMs = nowMs - item.updatedAt.getTime();
    const consumedAgoMs = item.consumedAt
      ? nowMs - item.consumedAt.getTime()
      : NaN;
    const stale =
      (item.status === "QUEUED" || item.status === "TRANSCODING") &&
      updatedAgoMs > staleThresholdMs;
    const awaitingFinalAsset =
      item.status === "READY" && (!item.finalUrl || !item.finalKey);
    return {
      id: item.id,
      userId: item.userId,
      charterId: item.charterId,
      status: item.status as Status,
      kind: (item.kind === "VIDEO" ? "VIDEO" : "IMAGE") as Kind,
      originalKey: item.originalKey,
      originalUrl: item.originalUrl,
      finalKey: item.finalKey,
      finalUrl: item.finalUrl,
      thumbnailUrl: item.thumbnailUrl,
      sizeBytes: item.sizeBytes,
      mimeType: item.mimeType,
      durationSeconds: item.durationSeconds,
      error: item.error,
      correlationId: item.correlationId,
      consumedAt: item.consumedAt,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      charterMediaId: item.charterMediaId,
      displayName,
      email,
      charterName: charter?.name ?? null,
      charterActive: charter?.isActive ?? null,
      stale,
      createdAgoLabel: formatRelative(createdAgoMs),
      updatedAgoLabel: formatRelative(updatedAgoMs),
      consumedAgoLabel: Number.isFinite(consumedAgoMs)
        ? formatRelative(consumedAgoMs)
        : "-",
      awaitingFinalAsset,
    };
  });

  const staleCount = annotated.filter((row) => row.stale).length;
  const filteredRows = staleOnly
    ? annotated.filter((row) => row.stale)
    : annotated;

  return {
    statusFilter,
    kindFilter,
    staleOnly,
    statusCounts,
    staleCount,
    filteredRows,
    fetchLimit,
    fetchedCount: rawItems.length,
    displayCount: filteredRows.length,
  };
}

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
      select: {
        id: true,
        ownerId: true,
        originalUrl: true,
        blobKey: true,
        thumbnailUrl: true,
        thumbnailBlobKey: true,
        trimStartSec: true,
        ready720pUrl: true,
        normalizedBlobKey: true,
        processStatus: true,
        errorMessage: true,
        createdAt: true,
        didFallback: true,
        fallbackReason: true,
        updatedAt: true,
        originalDurationSec: true,
        processedDurationSec: true,
        appliedTrimStartSec: true,
        processedAt: true,
      },
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

  const annotated: VideoRow[] = rawItems.map((item) => {
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
      originalDurationSec: item.originalDurationSec,
      processedDurationSec: item.processedDurationSec,
      appliedTrimStartSec: item.appliedTrimStartSec,
      processedAt: item.processedAt,
      displayName,
      email,
      createdAgoLabel: formatRelative(createdAgoMs),
      updatedAgoLabel: formatRelative(updatedAgoMs),
      sizeBytes: null, // Could be fetched from blob metadata if needed
      durationSeconds: null, // Could be extracted from video metadata if needed
      stale,
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
      fetchLimit: BLOB_FETCH_LIMIT,
      hasMore: false,
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

  const [charterMedia, pendingMedia, captainProfiles, verifications] =
    await Promise.all([
      prisma.charterMedia.findMany({
        select: {
          id: true,
          charterId: true,
          kind: true,
          storageKey: true,
          charter: { select: { name: true } },
        },
      }),
      prisma.pendingMedia.findMany({
        select: {
          id: true,
          originalKey: true,
          finalKey: true,
          thumbnailKey: true,
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
    ]);

  charterMedia.forEach((media) => {
    addReference(media.storageKey, {
      type: "CharterMedia",
      label: `Charter ${media.charter?.name ?? media.charterId ?? ""} • ${
        media.kind
      }`,
      href: media.charterId ? `/staff/charters/${media.charterId}` : undefined,
    });
  });

  pendingMedia.forEach(
    (item: {
      id: string;
      originalKey: string | null;
      finalKey: string | null;
      thumbnailKey: string | null;
    }) => {
      addReference(item.originalKey, {
        type: "PendingMedia",
        label: `Pending ${item.id} • original`,
      });
      addReference(item.finalKey, {
        type: "PendingMedia",
        label: `Pending ${item.id} • final`,
      });
      addReference(item.thumbnailKey, {
        type: "PendingMedia",
        label: `Pending ${item.id} • thumbnail`,
      });
    }
  );

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

  const blobs: Array<{
    pathname: string;
    size: number;
    uploadedAt: string;
    url: string;
    contentType: string | null;
  }> = [];
  let cursor: string | undefined;
  do {
    const remaining = BLOB_FETCH_LIMIT - blobs.length;
    if (remaining <= 0) break;
    const { blobs: page, cursor: nextCursor } = await list({
      token,
      limit: Math.min(BLOB_PAGE_SIZE, remaining),
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

  const hasMore = Boolean(cursor);
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
      };
    }
  );

  const total = rowsRaw.length;
  const linkedCount = rowsRaw.filter((row) => row.linked).length;
  const orphanCount = total - linkedCount;

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

  const rows = [...filtered].sort((a, b) => {
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

  const rawKeys = new Set(rowsRaw.map((row) => row.key));
  const missingReferenced = Array.from(references.entries())
    .filter(([key]) => !rawKeys.has(key))
    .map(([key, refs]) => ({ key, references: refs }));

  return {
    rows,
    total,
    linkedCount,
    orphanCount,
    filteredCount: rows.length,
    fetchLimit: BLOB_FETCH_LIMIT,
    hasMore,
    scopeFilter,
    linkFilter,
    searchQuery,
    sortKey,
    sortDir,
    missingReferenced,
  };
}
