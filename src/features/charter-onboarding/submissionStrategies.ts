// Extracted submission strategy helpers to keep hook lean.
import { emitCharterFormEvent } from "@features/charter-onboarding/analytics";
import type { CharterFormValues } from "@features/charter-onboarding/charterForm.schema";

export interface PatchEditArgs {
  charterId: string;
  values: CharterFormValues;
  setLastSavedAt: (iso: string) => void;
}

export async function patchEditCharter({
  charterId,
  values,
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
    captain: {
      displayName: values.operator.displayName,
      phone: values.operator.phone,
      bio: values.operator.bio,
      experienceYrs: values.operator.experienceYears,
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
        ?.map(
          (t: {
            id?: string;
            name: string;
            tripType: string;
            price?: number | null;
            durationHours?: number | null;
            maxAnglers?: number | null;
            charterStyle?: string;
            description?: string | null;
            startTimes?: string[];
            species?: string[];
            techniques?: string[];
          }) => ({
            id: t?.id || undefined,
            name: t.name,
            tripType: t.tripType,
            price: t.price ?? null,
            durationHours: t.durationHours ?? null,
            maxAnglers: t.maxAnglers ?? null,
            style: t.charterStyle?.toLowerCase(),
            description: t.description ?? null,
            startTimes: t.startTimes || [],
            species: t.species || [],
            techniques: t.techniques || [],
          })
        )
        ?.filter(Boolean) || [],
  };
  const res = await fetch(`/api/charters/${charterId}`, {
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

export async function finalizeDraftSubmission(args: FinalizeArgs) {
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
  if (!isEditing) {
    if (existingImages.length) {
      for (const img of existingImages) {
        if (!photosPayload.some((p) => p.name === img.name)) {
          photosPayload.push(img);
        }
      }
    }
    if (existingVideos.length) {
      for (const vid of existingVideos) {
        if (!videosPayload.some((v) => v.name === vid.name)) {
          videosPayload.push(vid);
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
  const avatarFile = values.operator.avatar;
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
      message: "Please sign in before submitting.",
    });
    return;
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
      body: JSON.stringify({
        media: {
          images: photosPayload,
          videos: videosPayload,
          imagesOrder: photosPayload.map((_, i) => i),
          videosOrder: videosPayload.map((_, i) => i),
          imagesCoverIndex: 0,
          ...(avatarPayload !== undefined ? { avatar: avatarPayload } : {}),
        },
      }),
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
  } else {
    const err = await finalizeRes.json().catch(() => ({}));
    if (process.env.NEXT_PUBLIC_CHARTER_FORM_DEBUG === "1") {
      console.error("[submission] finalize 400", {
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
    setSubmitState({
      type: "error",
      message:
        err?.error === "validation"
          ? "Please fix highlighted fields."
          : "Submission failed. Please try again.",
    });
  }
}
