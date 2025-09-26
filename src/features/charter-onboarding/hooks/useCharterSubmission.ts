"use client";
/**
 * useCharterSubmission (Phase 5)
 * Extracts all submission & edit-save logic from FormSection.
 * Responsibilities:
 *  - Provide saveEditChanges for live charter editing
 *  - Provide onSubmit handler (finalize draft or route to edit save)
 *  - Provide handleFormSubmit (form element handler, with edit bypass)
 *  - Provide triggerSubmit (invoked by confirmation dialog)
 *  - Maintain submit state & saving flags
 */
import { emitCharterFormEvent } from "@features/charter-onboarding/analytics";
import type { CharterFormValues } from "@features/charter-onboarding/charterForm.schema";
import {
  useCallback,
  useState,
  type FormEvent,
  type FormEventHandler,
} from "react";
import type { SubmitHandler, UseFormReturn } from "react-hook-form";

export interface UseCharterSubmissionArgs {
  form: UseFormReturn<CharterFormValues>;
  isEditing: boolean;
  currentCharterId: string | null;
  serverDraftId: string | null;
  serverVersion: number | null; // used only for finalize headers
  saveServerDraftSnapshot: () => Promise<number | null>;
  existingImages: { name: string; url: string }[]; // for bypass logic & finalize merge
  defaultState: CharterFormValues;
  clearDraft: () => void;
  initializeDraftState: (
    values: CharterFormValues,
    draftId: string | null
  ) => void;
  setLastSavedAt: (iso: string | null) => void;
  router: { push: (href: string) => void };
}

export interface UseCharterSubmissionResult {
  submitState: { type: "success" | "error"; message: string } | null;
  savingEdit: boolean;
  setSubmitState: React.Dispatch<
    React.SetStateAction<{ type: "success" | "error"; message: string } | null>
  >;
  saveEditChanges: () => Promise<void>;
  onSubmit: (values: CharterFormValues) => Promise<void>;
  handleFormSubmit: FormEventHandler<HTMLFormElement>;
  triggerSubmit: () => void;
}

export function useCharterSubmission({
  form,
  isEditing,
  currentCharterId,
  serverDraftId,
  serverVersion,
  saveServerDraftSnapshot,
  existingImages,
  defaultState,
  clearDraft,
  initializeDraftState,
  setLastSavedAt,
  router,
}: UseCharterSubmissionArgs): UseCharterSubmissionResult {
  const [submitState, setSubmitState] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  // Live charter edit PATCH
  const saveEditChanges = useCallback(async () => {
    if (!isEditing || !currentCharterId) return;
    setSavingEdit(true);
    try {
      const values = form.getValues();
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
            ?.map((t) => ({
              id: (t as unknown as { id?: string }).id || undefined,
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
            }))
            ?.filter(Boolean) || [],
      };
      const res = await fetch(`/api/charters/${currentCharterId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setLastSavedAt(new Date().toISOString());
        setSubmitState({ type: "success", message: "Saved changes" });
      } else {
        setSubmitState({ type: "error", message: "Save failed" });
      }
    } catch {
      setSubmitState({ type: "error", message: "Save error" });
    } finally {
      setSavingEdit(false);
    }
  }, [isEditing, currentCharterId, form, setLastSavedAt]);

  // Finalize or edit save
  const onSubmit = useCallback(
    async (values: CharterFormValues) => {
      setSubmitState(null);
      if (isEditing) {
        await saveEditChanges();
        return;
      }
      // Upload helper
      const uploadOriginalToBlob = async (
        file: File,
        opts?: { docType?: string; charterId?: string | null }
      ): Promise<{ key: string; url: string }> => {
        const fd = new FormData();
        fd.set("file", file);
        if (opts?.docType) fd.set("docType", opts.docType);
        if (opts?.charterId) fd.set("charterId", opts.charterId);
        const res = await fetch("/api/blob/upload", {
          method: "POST",
          body: fd,
        });
        if (!res.ok) throw new Error("upload failed");
        const j = await res.json();
        return { key: j.key, url: j.url };
      };
      // Upload new photos/videos only (existing handled separately)
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
      try {
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
                ...(avatarPayload !== undefined
                  ? { avatar: avatarPayload }
                  : {}),
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
          form.reset(defaultState);
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
      } catch (e) {
        setSubmitState({
          type: "error",
          message: e instanceof Error ? e.message : "Something went wrong",
        });
      }
    },
    [
      form,
      isEditing,
      currentCharterId,
      serverDraftId,
      serverVersion,
      saveServerDraftSnapshot,
      defaultState,
      clearDraft,
      initializeDraftState,
      setLastSavedAt,
      router,
      saveEditChanges,
    ]
  );

  // Form element submit handler (edit bypass for photos requirement)
  const handleFormSubmit: FormEventHandler<HTMLFormElement> = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (isEditing && existingImages.length >= 3) {
        void onSubmit(form.getValues());
        return;
      }
      return form.handleSubmit(onSubmit as SubmitHandler<CharterFormValues>)(
        e as unknown as React.BaseSyntheticEvent<object, Event>
      ) as unknown as void;
    },
    [form, onSubmit, isEditing, existingImages.length]
  );

  const triggerSubmit = useCallback(() => {
    if (isEditing && existingImages.length >= 3) {
      void onSubmit(form.getValues());
      return;
    }
    return form.handleSubmit(
      onSubmit as SubmitHandler<CharterFormValues>
    )() as unknown as void;
  }, [form, onSubmit, isEditing, existingImages.length]);

  return {
    submitState,
    savingEdit,
    setSubmitState,
    saveEditChanges,
    onSubmit,
    handleFormSubmit,
    triggerSubmit,
  };
}
