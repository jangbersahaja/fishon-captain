// Extracted submission strategy helpers to keep hook lean.
import { emitCharterFormEvent } from "@features/charter-onboarding/analytics";
import type { CharterFormValues } from "@features/charter-onboarding/charterForm.schema";
import { CharterMessages } from "./errors";

export interface PatchEditArgs {
  charterId: string;
  values: CharterFormValues;
  adminUserId?: string | null;
  setLastSavedAt: (iso: string) => void;
}

export async function patchEditCharter({
  charterId,
  values,
  adminUserId,
  setLastSavedAt,
}: PatchEditArgs): Promise<{ ok: boolean }> {
  const payload = {
    charter: {
      charterType: values.charterType,
      name: values.charterName,
      state: values.state,
      city: values.city,
      startingPoint: values.startingPoint,
      postcode: values.postcode,
      latitude: values.latitude || null,
      longitude: values.longitude || null,
      description: values.description,
    },
    captain: values.operator
      ? {
          displayName: values.operator.displayName,
          phone: values.operator.phone,
          backupPhone: values.operator.backupPhone || null,
          bio: values.operator.bio,
          experienceYrs: values.operator.experienceYears,
          // Include avatarUrl when editing so live charter updates get propagated without separate endpoint.
          avatarUrl: values.operator.avatarUrl || null,
        }
      : {
          displayName: "",
          phone: "",
          backupPhone: null,
          bio: "",
          experienceYrs: undefined,
          avatarUrl: null,
        },
    boat: values.boat
      ? {
          name: values.boat.name,
          type: values.boat.type,
          lengthFt: values.boat.lengthFeet ?? null,
          capacity: values.boat.capacity ?? null,
          features: values.boat.features || [],
        }
      : undefined,
    amenities: values.amenities || [],
    features: values.boat?.features || [],
    policies: values.policies ? { ...values.policies } : undefined,
    pickup: values.pickup
      ? {
          available: values.pickup.available,
          fee: values.pickup.fee ?? null,
          notes: values.pickup.notes,
          areas: values.pickup.areas || [],
        }
      : undefined,
    trips:
      values.trips
        ?.filter((t) => t.name && t.tripType) // Only include trips with required fields
        ?.map((t) => ({
          name: t.name ?? "",
          tripType: t.tripType ?? "",
          price: t.price ?? null,
          promoPrice: t.promoPrice ?? null,
          durationHours: t.durationHours ?? null,
          maxAnglers: t.maxAnglers ?? null,
          style: t.charterStyle?.toLowerCase(),
          description: t.description ?? null,
          startTimes: t.startTimes || [],
          species: t.species || [],
          techniques: t.techniques || [],
        }))
        ?.filter(Boolean) || [],
  };
  const adminParam = adminUserId
    ? `?adminUserId=${encodeURIComponent(adminUserId)}`
    : "";
  const res = await fetch(`/api/charters/${charterId}${adminParam}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (res.ok) setLastSavedAt(new Date().toISOString());
  return { ok: res.ok };
}

export interface FinalizeArgs {
  values: CharterFormValues;
  isEditing: boolean;
  serverDraftId: string;
  currentCharterId: string | null;
  serverVersion: number | null;
  saveServerDraftSnapshot: () => Promise<number | null>;
  setSubmitState: (s: { type: "success" | "error"; message: string }) => void;
  defaultState: CharterFormValues;
  formReset: (v: CharterFormValues) => void;
  clearDraft: () => void;
  initializeDraftState: (v: CharterFormValues, draftId: string | null) => void;
  setLastSavedAt: (iso: string | null) => void;
  router: { push: (href: string) => void };
  /** Lookup for already uploaded media (create flow pre-upload on step advance) */
  getUploadedMediaInfo?: (
    file: File,
    kind: "photo" | "video" | "avatar"
  ) => { name: string; url: string } | null;
  /** Pre-uploaded media that lives in existingImages state (create flow). */
  existingImages?: { name: string; url: string }[];
  existingVideos?: { name: string; url: string }[];
}

export async function finalizeDraftSubmission(args: FinalizeArgs): Promise<{
  ok: boolean;
  status?: number;
  errorCode?: string;
  details?: unknown;
}> {
  const {
    values,
    isEditing,
    serverDraftId,
    currentCharterId,
    serverVersion,
    saveServerDraftSnapshot,
    setSubmitState,
    defaultState,
    formReset,
    clearDraft,
    initializeDraftState,
    setLastSavedAt,
    router,
    getUploadedMediaInfo,
    existingImages = [],
    existingVideos = [],
  } = args;
  // Upload helper
  const uploadOriginalToBlob = async (
    file: File,
    opts?: { docType?: string; charterId?: string | null }
  ): Promise<{ key: string; url: string }> => {
    const fd = new FormData();
    fd.set("file", file);
    if (opts?.docType) fd.set("docType", opts.docType);
    if (opts?.charterId) fd.set("charterId", opts.charterId);
    const res = await fetch("/api/blob/upload", { method: "POST", body: fd });
    if (!res.ok) throw new Error("upload failed");
    const j = await res.json();
    return { key: j.key, url: j.url };
  };

  // Photos / videos upload (skip files already pre-uploaded).
  const photosPayload: { name: string; url: string }[] = [];
  const videosPayload: { name: string; url: string }[] = [];

  // Seed payload with already-uploaded media in create flow (not editing). These were
  // uploaded earlier then moved from form.photos -> existingImages to keep the UI clean.
  // Only include videos with valid name and url
  const filteredExistingVideos = existingVideos.filter(
    (v) =>
      typeof v.name === "string" &&
      v.name.length > 0 &&
      typeof v.url === "string" &&
      v.url.length > 0
  );

  if (!isEditing) {
    if (existingImages.length) {
      for (const img of existingImages) {
        if (!photosPayload.some((p) => p.name === img.name)) {
          photosPayload.push(img);
        }
      }
    }
    if (filteredExistingVideos.length) {
      for (const vid of filteredExistingVideos) {
        if (!videosPayload.some((v) => v.name === vid.name)) {
          videosPayload.push(vid);
        }
      }
    }
    // Fallback: if no existingImages/videos state (hydration missed) but form still has uploadedPhotos/uploadedVideos arrays
    if (
      photosPayload.length === 0 &&
      Array.isArray(values.uploadedPhotos) &&
      values.uploadedPhotos.length
    ) {
      for (const p of values.uploadedPhotos) {
        if (p && typeof p.name === "string" && typeof p.url === "string") {
          if (!photosPayload.some((x) => x.name === p.name))
            photosPayload.push({ name: p.name, url: p.url });
        }
      }
    }
    if (
      videosPayload.length === 0 &&
      Array.isArray(values.uploadedVideos) &&
      values.uploadedVideos.length
    ) {
      for (const v of values.uploadedVideos) {
        if (v && typeof v.name === "string" && typeof v.url === "string") {
          if (!videosPayload.some((x) => x.name === v.name))
            videosPayload.push({ name: v.name, url: v.url });
        }
      }
    }
  }
  const maybeUploadSet = async (
    files: File[] | undefined,
    kind: "photo" | "video"
  ) => {
    if (!files || !files.length) return;
    for (const f of files) {
      const pre = getUploadedMediaInfo?.(f, kind);
      if (pre) {
        // Avoid duplicates by name
        const arr = kind === "photo" ? photosPayload : videosPayload;
        if (!arr.some((m) => m.name === pre.name)) arr.push(pre);
        continue;
      }
      try {
        const { key, url } = await uploadOriginalToBlob(f, {
          docType: "charter_media",
          charterId: currentCharterId,
        });
        (kind === "photo" ? photosPayload : videosPayload).push({
          name: key,
          url,
        });
      } catch {
        /* swallow individual errors; user can retry by re-submitting */
      }
    }
  };
  await maybeUploadSet(values.photos as File[] | undefined, "photo");
  await maybeUploadSet(values.videos as File[] | undefined, "video");

  // Avatar (only during create)
  let avatarPayload: { name: string; url: string } | null | undefined =
    undefined;
  const avatarFile = values.operator?.avatar;
  if (!isEditing && avatarFile instanceof File) {
    const pre = getUploadedMediaInfo?.(avatarFile, "avatar");
    if (pre) {
      avatarPayload = pre;
    } else {
      try {
        const { key, url } = await uploadOriginalToBlob(avatarFile, {
          docType: "charter_avatar",
        });
        avatarPayload = { name: key, url };
      } catch {
        avatarPayload = undefined;
      }
    }
  } else if (!isEditing && !avatarFile && values.operator?.avatarUrl) {
    // No file in form (maybe uploaded earlier in flow) but we have a persisted avatarUrl.
    // Provide a synthetic name so backend can persist reference.
    avatarPayload = { name: "avatar", url: values.operator.avatarUrl };
  }

  emitCharterFormEvent({
    type: "finalize_attempt",
    images: photosPayload.length,
    videos: videosPayload.length,
    trips: Array.isArray(values.trips) ? values.trips.length : 0,
  });
  if (!serverDraftId) {
    setSubmitState({
      type: "error",
      message: CharterMessages.finalize.authRequired,
    });
    return { ok: false, errorCode: "no_draft" };
  }
  const patchedVersion = await saveServerDraftSnapshot();
  const versionForFinalize =
    patchedVersion !== null ? patchedVersion : serverVersion;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (versionForFinalize !== null)
    headers["x-draft-version"] = String(versionForFinalize);
  const finalizeRes = await fetch(
    `/api/charter-drafts/${serverDraftId}/finalize`,
    {
      method: "POST",
      headers,
      body: (() => {
        // Sanitize storage keys to match backend schema expectations.
        const extractKey = (url: string): string | null => {
          if (typeof url !== "string") return null;
          const idxCapt = url.indexOf("captains/");
          if (idxCapt !== -1) {
            const slice = url.slice(idxCapt);
            const m = slice.match(
              /^(captains\/[A-Za-z0-9_-]+\/(?:media|avatar)\/[A-Za-z0-9._-]+)/
            );
            if (m) return m[1];
          }
          const idxChar = url.indexOf("charters/");
          if (idxChar !== -1) {
            const slice = url.slice(idxChar);
            const m = slice.match(
              /^(charters\/[A-Za-z0-9_-]+\/media\/[A-Za-z0-9._-]+)/
            );
            if (m) return m[1];
          }
          return null;
        };
        const isValidKey = (name: string) =>
          /^[\w.-]+\.(jpg|jpeg|png|webp|gif)$/i.test(name) ||
          (name.startsWith("captains/") && name.includes("/avatar/")) ||
          (name.startsWith("captains/") && name.includes("/media/")) ||
          (name.startsWith("charters/") && name.includes("/media/"));

        const sanitizeList = (
          items: { name: string; url: string }[]
        ): { name: string; url: string }[] =>
          items.map((m) => {
            if (isValidKey(m.name)) return m;
            const extracted = extractKey(m.url);
            return extracted && isValidKey(extracted)
              ? { ...m, name: extracted }
              : m; // fallback (will let backend validate)
          });

        const sanitizedImages = sanitizeList(photosPayload);
        const sanitizedVideos = sanitizeList(videosPayload);
        let sanitizedAvatar: { name: string; url: string } | null | undefined =
          avatarPayload;
        if (sanitizedAvatar) {
          if (!isValidKey(sanitizedAvatar.name)) {
            const extracted = extractKey(sanitizedAvatar.url);
            if (extracted && isValidKey(extracted)) {
              sanitizedAvatar = { ...sanitizedAvatar, name: extracted };
            } else sanitizedAvatar = null; // drop invalid avatar to avoid rejection
          }
        }
        return JSON.stringify({
          media: {
            images: sanitizedImages,
            videos: sanitizedVideos,
            imagesOrder: sanitizedImages.map((_, i) => i),
            videosOrder: sanitizedVideos.map((_, i) => i),
            imagesCoverIndex: sanitizedImages.length ? 0 : undefined,
            ...(sanitizedAvatar !== undefined
              ? { avatar: sanitizedAvatar }
              : {}),
          },
        });
      })(),
    }
  );
  if (finalizeRes.ok) {
    await finalizeRes.json().catch(() => ({}));
    emitCharterFormEvent({
      type: "finalize_success",
      charterId: currentCharterId || "unknown",
      images: photosPayload.length,
      videos: videosPayload.length,
      trips: Array.isArray(values.trips) ? values.trips.length : 0,
    });
    setSubmitState({
      type: "success",
      message: isEditing
        ? "Charter updated successfully."
        : "Thanks! We will be in touch shortly.",
    });
    formReset(defaultState);
    clearDraft();
    initializeDraftState(defaultState, null);
    setLastSavedAt(null);
    router.push(isEditing ? "/captain" : "/thank-you");
    return { ok: true, status: finalizeRes.status };
  }
  const err = await finalizeRes.json().catch(() => ({}));
  if (process.env.NEXT_PUBLIC_CHARTER_FORM_DEBUG === "1") {
    console.error("[submission] finalize non-200", {
      status: finalizeRes.status,
      err,
      payload: {
        images: photosPayload.map((p) => p.name),
        videos: videosPayload.map((v) => v.name),
        avatar: avatarPayload?.name,
      },
      headersSent: headers,
      versionForFinalize,
    });
  }
  // Prefer backend error message if present, fallback to mapped message
  let errorMsg: string | undefined = undefined;
  if (typeof err?.error === "string") {
    // Map known backend error codes to user-friendly messages
    switch (err.error) {
      case "rate_limited":
        errorMsg = "You are submitting too quickly. Please wait and try again.";
        break;
      case "unauthorized":
        errorMsg = CharterMessages.finalize.authRequired;
        break;
      case "not_found":
        errorMsg = "Draft not found. Please refresh and try again.";
        break;
      case "invalid_draft_data":
        errorMsg = "Draft data is invalid. Please review your form.";
        break;
      case "missing_captain_profile":
        errorMsg = "Your captain profile is missing. Please contact support.";
        break;
      case "validation":
        errorMsg = CharterMessages.finalize.validationFail;
        break;
      default:
        // If backend provides a message, use it; else fallback
        errorMsg = err.message || CharterMessages.finalize.genericFail;
    }
  }
  setSubmitState({
    type: "error",
    message: errorMsg || CharterMessages.finalize.genericFail,
  });
  // Optionally, surface requestId for support/debugging
  if (typeof window !== "undefined" && err?.requestId) {
    // Attach requestId to error toast for support
    try {
      window.sessionStorage.setItem(
        "last_finalize_request_id",
        String(err.requestId)
      );
    } catch {}
  }
  return {
    ok: false,
    status: finalizeRes.status,
    errorCode: typeof err?.error === "string" ? err.error : undefined,
    details: err,
  };
}
