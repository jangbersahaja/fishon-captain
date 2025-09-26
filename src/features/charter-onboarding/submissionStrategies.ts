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

  // Upload new photos/videos only
  const photosUploaded = await Promise.all(
    (values.photos ?? []).map(async (f) => {
      try {
        const { key, url } = await uploadOriginalToBlob(f, {
          docType: "charter_media",
          charterId: currentCharterId,
        });
        return { name: key, url };
      } catch {
        return null;
      }
    })
  );
  const videosUploaded = await Promise.all(
    (values.videos ?? []).map(async (f) => {
      try {
        const { key, url } = await uploadOriginalToBlob(f, {
          docType: "charter_media",
          charterId: currentCharterId,
        });
        return { name: key, url };
      } catch {
        return null;
      }
    })
  );
  const photosPayload = photosUploaded.filter(Boolean) as {
    name: string;
    url: string;
  }[];
  const videosPayload = videosUploaded.filter(Boolean) as {
    name: string;
    url: string;
  }[];

  // Avatar (only during create)
  let avatarPayload: { name: string; url: string } | null | undefined =
    undefined;
  const avatarFile = values.operator.avatar;
  if (!isEditing && avatarFile instanceof File) {
    try {
      const { key, url } = await uploadOriginalToBlob(avatarFile, {
        docType: "charter_avatar",
      });
      avatarPayload = { name: key, url };
    } catch {
      avatarPayload = undefined;
    }
  }

  emitCharterFormEvent({ type: "finalize_attempt" });
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
    setSubmitState({
      type: "error",
      message:
        err?.error === "validation"
          ? "Please fix highlighted fields."
          : "Submission failed. Please try again.",
    });
  }
}
