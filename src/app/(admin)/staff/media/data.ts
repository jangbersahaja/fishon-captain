import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
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

  const where: Prisma.PendingMediaWhereInput = {
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(kindFilter ? { kind: kindFilter } : {}),
  };

  const fetchLimit = staleOnly ? FETCH_LIMIT_STALE : FETCH_LIMIT_DEFAULT;

  const [statusGroups, rawItems] = await Promise.all([
    prisma.pendingMedia.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.pendingMedia.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: fetchLimit,
    }),
  ]);

  const statusCounts = STATUSES.reduce<Record<Status, number>>(
    (acc, status) => {
      const match = statusGroups.find((g) => g.status === status);
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

  pendingMedia.forEach((item) => {
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
  });

  captainProfiles.forEach((profile) => {
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
  });

  verifications.forEach((row) => {
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
    extractVerificationDocs(row.boatRegistration, "Boat registration").forEach(
      (doc) =>
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
  });

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

  const rowsRaw: StorageRow[] = blobs.map((blob) => {
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
  });

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
