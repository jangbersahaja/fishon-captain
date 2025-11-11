import { AdminBypassLink } from "@/components/admin";
import authOptions from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ForceSubmitButton } from "./_components/ForceSubmitButton";

function safePretty(obj: unknown) {
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return "{}";
  }
}

async function addNote(formData: FormData) {
  "use server";
  const draftId = formData.get("draftId") as string;
  const body = (formData.get("body") as string)?.trim();
  if (!draftId || !body) return;
  const session = await getServerSession(authOptions);
  if (!session?.user) return;
  const user = session.user as { id: string; role?: string };
  if (user.role !== "STAFF" && user.role !== "ADMIN") return;
  await prisma.draftNote.create({
    data: { draftId, body, authorId: user.id },
  });
  revalidatePath(`/staff/registrations/${draftId}`);
}

async function forceSubmit(formData: FormData) {
  "use server";
  const draftId = formData.get("draftId") as string;
  const targetUserId = formData.get("targetUserId") as string;

  if (!draftId || !targetUserId)
    return { success: false, error: "Missing parameters" };

  const session = await getServerSession(authOptions);
  if (!session?.user) return { success: false, error: "Unauthorized" };

  const user = session.user as { id: string; role?: string };
  if (user.role !== "STAFF" && user.role !== "ADMIN") {
    return { success: false, error: "Insufficient permissions" };
  }

  try {
    // Fetch the draft
    const draft = await prisma.charterDraft.findUnique({
      where: { id: draftId },
      include: {
        user: { select: { id: true } },
      },
    });

    if (!draft) return { success: false, error: "Draft not found" };
    if (draft.status !== "DRAFT") {
      return { success: false, error: "Draft is not in DRAFT status" };
    }

    // No longer send media payload - finalize route uses canonical CharterMedia and CaptainVideo tables
    // Media is already stored in CharterMedia (photos) and CaptainVideo (videos) tables
    // The finalize route will query these tables directly based on captainId/userId

    // Call finalize endpoint with adminUserId parameter
    const h = await import("next/headers").then((m) => m.headers());
    const host = (await h).get("host");
    const proto = (await h).get("x-forwarded-proto") || "http";
    const base = host?.startsWith("http") ? host : `${proto}://${host}`;
    const url = `${base}/api/charter-drafts/${draftId}/finalize?adminUserId=${targetUserId}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-draft-version": String(draft.version),
        cookie: (await h).get("cookie") || "",
      },
      body: JSON.stringify({}),
      cache: "no-store",
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("[forceSubmit] Error response:", errorData);

      // Format validation errors if present
      let errorMessage = errorData.error || `HTTP ${response.status}`;
      if (errorData.issues && Array.isArray(errorData.issues)) {
        const issueDetails = errorData.issues
          .map(
            (issue: { path: unknown[]; message: string }) =>
              `${issue.path.join(".")}: ${issue.message}`
          )
          .join("; ");
        errorMessage = `Validation failed: ${issueDetails}`;
      }

      return {
        success: false,
        error: errorMessage,
      };
    }

    const result = await response.json();
    revalidatePath(`/staff/registrations/${draftId}`);
    revalidatePath("/staff/registrations");

    return {
      success: true,
      charterId: result.charterId,
      message: "Draft successfully submitted",
    };
  } catch (error) {
    console.error("Force submit error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export default async function StaffRegistrationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user)
    redirect(`/auth?mode=signin&next=/staff/registrations/${id}`);
  if (role !== "STAFF" && role !== "ADMIN") redirect("/captain");

  const draft = await prisma.charterDraft.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, email: true, name: true, createdAt: true } },
      charter: { select: { id: true, name: true } },
    },
  });
  if (!draft) {
    return (
      <div className="px-6 py-8">
        <h1 className="text-xl font-semibold">Registration</h1>
        <p className="text-sm text-slate-600">Draft not found.</p>
      </div>
    );
  }

  // Notes (separate fetch to avoid include issues in stale client environments)
  let notes: {
    id: string;
    body: string;
    createdAt: Date;
    authorId: string;
    author?: { id: string; name: string | null; email: string | null };
  }[] = [];
  let notesEnabled = true;
  try {
    notes = await prisma.draftNote.findMany({
      where: { draftId: draft.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { author: { select: { id: true, name: true, email: true } } },
    });
  } catch {
    notesEnabled = false;
  }

  const TOTAL_STEPS = 6;
  const effectiveStepCount =
    draft.status === "SUBMITTED" ? TOTAL_STEPS : draft.currentStep + 1;
  const progress = Math.round((effectiveStepCount / TOTAL_STEPS) * 100);

  // Count media in draft data for display (check both field naming conventions)
  const mediaCount = { photos: 0, videos: 0 };
  try {
    const draftData = draft.data as Record<string, unknown>;
    const photosArray = (draftData?.uploadedPhotos ||
      draftData?.photos) as unknown;
    if (photosArray && Array.isArray(photosArray)) {
      mediaCount.photos = photosArray.length;
    }
    const videosArray = (draftData?.uploadedVideos ||
      draftData?.videos) as unknown;
    if (videosArray && Array.isArray(videosArray)) {
      mediaCount.videos = videosArray.length;
    }
  } catch {
    // Ignore parsing errors
  }

  return (
    <div className="px-6 py-8 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Registration Draft
          </h1>
          <p className="text-sm text-slate-600">Draft ID: {draft.id}</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/staff/registrations"
            className="rounded-full border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            Back
          </Link>
          {(() => {
            const draftData = draft.data as Record<string, unknown>;
            const operatorPhone = (draftData?.operator as { phone?: string })
              ?.phone;
            if (!operatorPhone) return null;
            return (
              <a
                href={`tel:${operatorPhone}`}
                className="rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-sm text-emerald-700 hover:bg-emerald-100"
              >
                📞 Call User
              </a>
            );
          })()}
          <AdminBypassLink
            href={`/captain/form?adminUserId=${draft.user.id}`}
            confirmTitle="Admin Impersonation - Open Draft Form"
            confirmDescription={`You are about to open the registration form as:\n\nUser: ${
              draft.user.name || "Unknown"
            }\nEmail: ${draft.user.email || "No email"}\nDraft ID: ${
              draft.id
            }\n\nThis will allow you to view and edit their draft. Please enter your admin password to confirm.`}
            variant="outline"
            size="sm"
            className="text-orange-700 border-orange-300 bg-orange-50 hover:bg-orange-100"
          >
            🛡️ Open Form
          </AdminBypassLink>
          <ForceSubmitButton
            draftId={draft.id}
            targetUserId={draft.user.id}
            status={draft.status}
            forceSubmitAction={forceSubmit}
          />
        </div>
      </div>

      {/* Summary */}
      <section className="p-4 bg-white border rounded-xl border-slate-200">
        <h2 className="mb-3 text-sm font-semibold text-slate-800">Summary</h2>
        <div className="grid gap-3 text-sm text-slate-700 sm:grid-cols-3">
          <div>
            <span className="text-slate-500">User:</span>{" "}
            {draft.user.name || "—"}
            <div className="text-[11px] text-slate-500">{draft.user.id}</div>
          </div>
          <div>
            <span className="text-slate-500">Email:</span> {draft.user.email}
          </div>
          <div>
            <span className="text-slate-500">Status:</span> {draft.status}
          </div>
          <div>
            <span className="text-slate-500">Step:</span>{" "}
            {draft.status === "SUBMITTED"
              ? `${TOTAL_STEPS} / ${TOTAL_STEPS}`
              : `${draft.currentStep + 1} / ${TOTAL_STEPS}`}
          </div>
          <div>
            <span className="text-slate-500">Progress:</span> {progress}%
          </div>
          <div>
            <span className="text-slate-500">Version:</span> {draft.version}
          </div>
          <div>
            <span className="text-slate-500">Form version:</span>{" "}
            {draft.formVersion}
          </div>
          <div>
            <span className="text-slate-500">Charter Linked:</span>{" "}
            {draft.charter ? (
              <Link
                href={`/staff/charters/${draft.charter.id}`}
                className="text-sky-600 hover:underline"
              >
                {draft.charter.name || draft.charter.id}
              </Link>
            ) : (
              "—"
            )}
          </div>
          <div>
            <span className="text-slate-500">Last touched:</span>{" "}
            {new Date(draft.lastTouchedAt).toLocaleString()}
          </div>
          <div>
            <span className="text-slate-500">Updated:</span>{" "}
            {new Date(draft.updatedAt).toLocaleString()}
          </div>
          <div>
            <span className="text-slate-500">Created:</span>{" "}
            {new Date(draft.createdAt).toLocaleString()}
          </div>
          <div>
            <span className="text-slate-500">Media:</span>{" "}
            <span
              className={
                mediaCount.photos < 3 ? "text-amber-600 font-medium" : ""
              }
            >
              {mediaCount.photos} photo{mediaCount.photos !== 1 ? "s" : ""}
            </span>
            {", "}
            {mediaCount.videos} video{mediaCount.videos !== 1 ? "s" : ""}
            {mediaCount.photos < 3 && (
              <span className="ml-2 text-[10px] text-amber-600">
                ⚠ Need 3+ photos
              </span>
            )}
          </div>
        </div>
        <div className="mt-4">
          <div className="w-full h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full bg-sky-500"
              style={{ width: progress + "%" }}
            />
          </div>
        </div>
      </section>

      {/* Draft Data Cards */}
      {(() => {
        const draftData = draft.data as Record<string, unknown>;
        const operator = draftData?.operator as
          | {
              displayName?: string;
              name?: string;
              phone?: string;
              backupPhone?: string;
              email?: string;
              experienceYears?: number;
              bio?: string;
              avatarUrl?: string;
            }
          | undefined;
        const charterData = {
          charterType: draftData?.charterType as string | undefined,
          charterName: draftData?.charterName as string | undefined,
          state: draftData?.state as string | undefined,
          city: draftData?.city as string | undefined,
          startingPoint: draftData?.startingPoint as string | undefined,
          postcode: draftData?.postcode as string | undefined,
          latitude: draftData?.latitude as number | undefined,
          longitude: draftData?.longitude as number | undefined,
          description: draftData?.description as string | undefined,
          generatedDescription: draftData?.generatedDescription as
            | string
            | undefined,
          tone: draftData?.tone as string | undefined,
          withoutBoat: draftData?.withoutBoat as boolean | undefined,
          scheduleType: draftData?.scheduleType as string | undefined,
          operationalDays: draftData?.operationalDays as number[] | undefined,
        };
        const boat = draftData?.boat as
          | {
              name?: string;
              type?: string;
              lengthFeet?: number;
              capacity?: number;
              features?: string[];
            }
          | undefined;
        const amenities = (draftData?.amenities || []) as string[];
        const pickup = draftData?.pickup as
          | {
              available?: boolean;
              fee?: number | null;
              areas?: string[];
              notes?: string;
            }
          | undefined;
        const trips = (draftData?.trips || []) as {
          id?: string;
          name?: string;
          tripType?: string;
          durationHours?: number;
          price?: number;
          promoPrice?: number;
          maxAnglers?: number;
          charterStyle?: string;
          startTimes?: string[];
          description?: string;
          species?: string[];
          techniques?: string[];
        }[];
        const policies = draftData?.policies as
          | {
              licenseProvided?: boolean;
              catchAndKeep?: boolean;
              catchAndRelease?: boolean;
              childFriendly?: boolean;
              liveBaitProvided?: boolean;
              alcoholNotAllowed?: boolean;
              smokingNotAllowed?: boolean;
            }
          | undefined;
        const uploadedPhotos = (draftData?.uploadedPhotos || []) as {
          name: string;
          url: string;
        }[];
        const uploadedVideos = (draftData?.uploadedVideos || []) as {
          name: string;
          url: string;
        }[];

        return (
          <div className="space-y-4">
            {/* Operator Details */}
            <section className="p-4 bg-white border rounded-xl border-slate-200">
              <h2 className="mb-3 text-sm font-semibold text-slate-800">
                Operator Details
              </h2>
              <div className="space-y-3 text-sm text-slate-700">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <span className="text-slate-500">Display Name:</span>{" "}
                    {operator?.displayName || "—"}
                  </div>
                  <div>
                    <span className="text-slate-500">Experience:</span>{" "}
                    {operator?.experienceYears !== undefined
                      ? `${operator.experienceYears} years`
                      : "—"}
                  </div>
                  <div>
                    <span className="text-slate-500">Phone:</span>{" "}
                    {operator?.phone ? (
                      <a
                        href={`tel:${operator.phone}`}
                        className="text-emerald-600 hover:underline"
                      >
                        {operator.phone}
                      </a>
                    ) : (
                      "—"
                    )}
                  </div>
                  {operator?.backupPhone && (
                    <div>
                      <span className="text-slate-500">Backup Phone:</span>{" "}
                      <a
                        href={`tel:${operator.backupPhone}`}
                        className="text-emerald-600 hover:underline"
                      >
                        {operator.backupPhone}
                      </a>
                    </div>
                  )}
                  {operator?.email && (
                    <div>
                      <span className="text-slate-500">Email:</span>{" "}
                      <a
                        href={`mailto:${operator.email}`}
                        className="text-sky-600 hover:underline"
                      >
                        {operator.email}
                      </a>
                    </div>
                  )}
                  {operator?.avatarUrl && (
                    <div>
                      <span className="text-slate-500">Avatar:</span>{" "}
                      <a
                        href={operator.avatarUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sky-600 hover:underline"
                      >
                        View
                      </a>
                    </div>
                  )}
                </div>
                {operator?.bio && (
                  <div>
                    <span className="text-slate-500">Bio:</span>
                    <p className="mt-1 whitespace-pre-wrap text-slate-700">
                      {operator.bio}
                    </p>
                  </div>
                )}
              </div>
            </section>

            {/* Charter Details */}
            <section className="p-4 bg-white border rounded-xl border-slate-200">
              <h2 className="mb-3 text-sm font-semibold text-slate-800">
                Charter Details
              </h2>
              <div className="space-y-3 text-sm text-slate-700">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <span className="text-slate-500">Charter Name:</span>{" "}
                    <span className="font-medium">
                      {charterData.charterName || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Charter Type:</span>{" "}
                    {charterData.charterType || "—"}
                  </div>
                  <div>
                    <span className="text-slate-500">State:</span>{" "}
                    {charterData.state || "—"}
                  </div>
                  <div>
                    <span className="text-slate-500">City:</span>{" "}
                    {charterData.city || "—"}
                  </div>
                  <div>
                    <span className="text-slate-500">Postcode:</span>{" "}
                    {charterData.postcode || "—"}
                  </div>
                  <div>
                    <span className="text-slate-500">Without Boat:</span>{" "}
                    {charterData.withoutBoat ? "Yes" : "No"}
                  </div>
                  <div>
                    <span className="text-slate-500">Schedule Type:</span>{" "}
                    {charterData.scheduleType || "—"}
                  </div>
                  {charterData.tone && (
                    <div>
                      <span className="text-slate-500">Description Tone:</span>{" "}
                      {charterData.tone}
                    </div>
                  )}
                </div>
                {charterData.startingPoint && (
                  <div>
                    <span className="text-slate-500">Starting Point:</span>
                    <p className="mt-1 text-slate-700">
                      {charterData.startingPoint}
                    </p>
                  </div>
                )}
                {(charterData.latitude !== undefined ||
                  charterData.longitude !== undefined) && (
                  <div>
                    <span className="text-slate-500">Coordinates:</span>{" "}
                    <code className="text-xs text-slate-600">
                      {charterData.latitude?.toFixed(6) || "—"},{" "}
                      {charterData.longitude?.toFixed(6) || "—"}
                    </code>
                  </div>
                )}
                {charterData.operationalDays &&
                  charterData.operationalDays.length > 0 && (
                    <div>
                      <span className="text-slate-500">Operational Days:</span>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {charterData.operationalDays.map((day) => (
                          <span
                            key={day}
                            className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700"
                          >
                            {
                              [
                                "Sunday",
                                "Monday",
                                "Tuesday",
                                "Wednesday",
                                "Thursday",
                                "Friday",
                                "Saturday",
                              ][day]
                            }
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                {charterData.description && (
                  <div>
                    <span className="text-slate-500">Description:</span>
                    <p className="mt-1 whitespace-pre-wrap text-slate-700">
                      {charterData.description}
                    </p>
                  </div>
                )}
                {charterData.generatedDescription && (
                  <div>
                    <span className="text-slate-500">
                      Generated Description (baseline):
                    </span>
                    <p className="mt-1 text-xs italic whitespace-pre-wrap text-slate-600">
                      {charterData.generatedDescription}
                    </p>
                  </div>
                )}
              </div>
            </section>

            {/* Boat Details */}
            <section className="p-4 bg-white border rounded-xl border-slate-200">
              <h2 className="mb-3 text-sm font-semibold text-slate-800">
                Boat Details
              </h2>
              <div className="space-y-3 text-sm text-slate-700">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <span className="text-slate-500">Name:</span>{" "}
                    {boat?.name || "—"}
                  </div>
                  <div>
                    <span className="text-slate-500">Type:</span>{" "}
                    {boat?.type || "—"}
                  </div>
                  <div>
                    <span className="text-slate-500">Length:</span>{" "}
                    {boat?.lengthFeet ? `${boat.lengthFeet} ft` : "—"}
                  </div>
                  <div>
                    <span className="text-slate-500">Capacity:</span>{" "}
                    {boat?.capacity ? `${boat.capacity} people` : "—"}
                  </div>
                </div>
                {boat?.features && boat.features.length > 0 && (
                  <div>
                    <span className="text-slate-500">Features:</span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {boat.features.map((feature, i) => (
                        <span
                          key={i}
                          className="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800"
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Amenities */}
            {amenities.length > 0 && (
              <section className="p-4 bg-white border rounded-xl border-slate-200">
                <h2 className="mb-3 text-sm font-semibold text-slate-800">
                  Amenities ({amenities.length})
                </h2>
                <div className="flex flex-wrap gap-1.5">
                  {amenities.map((amenity, i) => (
                    <span
                      key={i}
                      className="inline-flex rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800"
                    >
                      {amenity}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Pickup Service */}
            <section className="p-4 bg-white border rounded-xl border-slate-200">
              <h2 className="mb-3 text-sm font-semibold text-slate-800">
                Pickup Service
              </h2>
              <div className="space-y-2 text-sm text-slate-700">
                <div>
                  <span className="text-slate-500">Available:</span>{" "}
                  {pickup?.available ? "Yes" : "No"}
                </div>
                {pickup?.available && (
                  <>
                    <div>
                      <span className="text-slate-500">Fee:</span>{" "}
                      {pickup.fee !== null && pickup.fee !== undefined
                        ? `RM ${pickup.fee.toFixed(2)}`
                        : "—"}
                    </div>
                    {pickup.areas && pickup.areas.length > 0 && (
                      <div>
                        <span className="text-slate-500">Areas:</span>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {pickup.areas.map((area, i) => (
                            <span
                              key={i}
                              className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800"
                            >
                              {area}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {pickup.notes && (
                      <div>
                        <span className="text-slate-500">Notes:</span>
                        <p className="mt-1 text-slate-700">{pickup.notes}</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </section>

            {/* Trips */}
            {trips.length > 0 && (
              <section className="p-4 bg-white border rounded-xl border-slate-200">
                <h2 className="mb-3 text-sm font-semibold text-slate-800">
                  Trips ({trips.length})
                </h2>
                <div className="space-y-3">
                  {trips.map((trip, i) => (
                    <div
                      key={i}
                      className="p-3 border rounded-lg border-slate-200 bg-slate-50/40"
                    >
                      <div className="space-y-2 text-sm">
                        <div className="font-medium text-slate-800">
                          {trip.name || "Untitled Trip"}
                        </div>
                        <div className="grid gap-2 text-xs sm:grid-cols-2">
                          <div>
                            <span className="text-slate-500">Type:</span>{" "}
                            {trip.tripType || "—"}
                          </div>
                          <div>
                            <span className="text-slate-500">Duration:</span>{" "}
                            {trip.durationHours
                              ? `${trip.durationHours} hours`
                              : "—"}
                          </div>
                          <div>
                            <span className="text-slate-500">Price:</span>{" "}
                            {trip.price !== undefined ? (
                              <span className="font-medium text-emerald-700">
                                RM {trip.price.toFixed(2)}
                              </span>
                            ) : (
                              "—"
                            )}
                          </div>
                          {trip.promoPrice !== undefined &&
                            trip.promoPrice > 0 && (
                              <div>
                                <span className="text-slate-500">
                                  Promo Price:
                                </span>{" "}
                                <span className="font-medium text-orange-600">
                                  RM {trip.promoPrice.toFixed(2)}
                                </span>
                              </div>
                            )}
                          <div>
                            <span className="text-slate-500">Max Anglers:</span>{" "}
                            {trip.maxAnglers || "—"}
                          </div>
                          <div>
                            <span className="text-slate-500">
                              Charter Style:
                            </span>{" "}
                            {trip.charterStyle || "—"}
                          </div>
                        </div>
                        {trip.startTimes && trip.startTimes.length > 0 && (
                          <div>
                            <span className="text-xs text-slate-500">
                              Start Times:
                            </span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {trip.startTimes.map((time, j) => (
                                <span
                                  key={j}
                                  className="inline-flex rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-medium text-slate-700"
                                >
                                  {time}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {trip.species && trip.species.length > 0 && (
                          <div>
                            <span className="text-xs text-slate-500">
                              Species:
                            </span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {trip.species.map((species, j) => (
                                <span
                                  key={j}
                                  className="inline-flex rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800"
                                >
                                  {species}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {trip.techniques && trip.techniques.length > 0 && (
                          <div>
                            <span className="text-xs text-slate-500">
                              Techniques:
                            </span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {trip.techniques.map((tech, j) => (
                                <span
                                  key={j}
                                  className="inline-flex rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800"
                                >
                                  {tech}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {trip.description && (
                          <p className="text-xs text-slate-600">
                            {trip.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Policies */}
            <section className="p-4 bg-white border rounded-xl border-slate-200">
              <h2 className="mb-3 text-sm font-semibold text-slate-800">
                Policies & Rules
              </h2>
              <div className="grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
                <div>
                  <span className="text-slate-500">License Provided:</span>{" "}
                  {policies?.licenseProvided ? "✅ Yes" : "❌ No"}
                </div>
                <div>
                  <span className="text-slate-500">Catch & Keep:</span>{" "}
                  {policies?.catchAndKeep ? "✅ Allowed" : "❌ Not allowed"}
                </div>
                <div>
                  <span className="text-slate-500">Catch & Release:</span>{" "}
                  {policies?.catchAndRelease ? "✅ Allowed" : "❌ Not allowed"}
                </div>
                <div>
                  <span className="text-slate-500">Child Friendly:</span>{" "}
                  {policies?.childFriendly ? "✅ Yes" : "❌ No"}
                </div>
                <div>
                  <span className="text-slate-500">Live Bait Provided:</span>{" "}
                  {policies?.liveBaitProvided ? "✅ Yes" : "❌ No"}
                </div>
                <div>
                  <span className="text-slate-500">Alcohol:</span>{" "}
                  {policies?.alcoholNotAllowed
                    ? "❌ Not allowed"
                    : "✅ Allowed"}
                </div>
                <div>
                  <span className="text-slate-500">Smoking:</span>{" "}
                  {policies?.smokingNotAllowed
                    ? "❌ Not allowed"
                    : "✅ Allowed"}
                </div>
              </div>
            </section>

            {/* Uploaded Media */}
            {(uploadedPhotos.length > 0 || uploadedVideos.length > 0) && (
              <section className="p-4 bg-white border rounded-xl border-slate-200">
                <h2 className="mb-3 text-sm font-semibold text-slate-800">
                  Uploaded Media
                </h2>
                <div className="space-y-3">
                  {uploadedPhotos.length > 0 && (
                    <div>
                      <h3 className="mb-2 text-xs font-medium text-slate-600">
                        Photos ({uploadedPhotos.length})
                      </h3>
                      <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                        {uploadedPhotos.map((photo, i) => (
                          <a
                            key={i}
                            href={photo.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block overflow-hidden border rounded-lg border-slate-200 hover:border-sky-400"
                          >
                            <img
                              src={photo.url}
                              alt={photo.name}
                              className="object-cover w-full h-32"
                            />
                            <div className="p-2 text-[10px] text-slate-600 bg-slate-50 truncate">
                              {photo.name}
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                  {uploadedVideos.length > 0 && (
                    <div>
                      <h3 className="mb-2 text-xs font-medium text-slate-600">
                        Videos ({uploadedVideos.length})
                      </h3>
                      <div className="space-y-2">
                        {uploadedVideos.map((video, i) => (
                          <a
                            key={i}
                            href={video.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 p-2 border rounded-lg border-slate-200 hover:border-sky-400 hover:bg-slate-50"
                          >
                            <span className="text-2xl">🎥</span>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-medium truncate text-slate-700">
                                {video.name}
                              </div>
                              <div className="text-[10px] text-slate-500 truncate">
                                {video.url}
                              </div>
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Raw Data (Collapsed) */}
            <details className="p-4 bg-white border rounded-xl border-slate-200">
              <summary className="text-sm font-semibold cursor-pointer text-slate-800 hover:text-slate-600">
                Raw Draft Data (JSON)
              </summary>
              <pre className="max-h-[480px] overflow-auto mt-3 rounded-lg bg-slate-900 p-4 text-[11px] leading-relaxed text-slate-100 shadow-inner whitespace-pre-wrap break-all">
                {safePretty(draft.data)}
              </pre>
            </details>
          </div>
        );
      })()}

      {/* Notes */}
      <section className="p-4 space-y-4 bg-white border rounded-xl border-slate-200">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800">
            Internal Notes
          </h2>
          <span className="text-xs text-slate-500">Latest 50</span>
        </div>
        {notesEnabled ? (
          <>
            <form action={addNote} className="space-y-2">
              <input type="hidden" name="draftId" value={draft.id} />
              <textarea
                name="body"
                required
                minLength={2}
                rows={3}
                placeholder="Add a note for other staff (outreach done, missing data, etc.)"
                className="w-full px-3 py-2 text-sm bg-white border rounded-md resize-none border-slate-300 text-slate-800 placeholder-slate-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
              <div className="flex items-center justify-end">
                <button
                  type="submit"
                  className="rounded-full bg-sky-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
                >
                  Add Note
                </button>
              </div>
            </form>
            <div className="border divide-y rounded-md divide-slate-200 border-slate-200 bg-slate-50/40">
              {notes.length === 0 ? (
                <div className="p-4 text-sm text-slate-500">No notes yet.</div>
              ) : (
                notes.map((n) => (
                  <div
                    key={n.id}
                    className="flex flex-col gap-1 p-3 bg-white/60 hover:bg-white"
                  >
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="font-medium text-slate-700">
                        {n.author?.name || n.author?.email || n.authorId}
                      </span>
                      <span>•</span>
                      <time dateTime={n.createdAt.toISOString()}>
                        {new Date(n.createdAt).toLocaleString()}
                      </time>
                      <span className="ml-auto inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium tracking-wide text-slate-600">
                        #{n.id.slice(0, 6)}
                      </span>
                    </div>
                    <div className="text-sm leading-relaxed whitespace-pre-wrap text-slate-800">
                      {n.body}
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          <div className="p-3 text-xs border rounded-md border-amber-300 bg-amber-50 text-amber-800">
            Notes unavailable (stale Prisma client). Restart dev server after
            migration.
          </div>
        )}
      </section>
    </div>
  );
}
