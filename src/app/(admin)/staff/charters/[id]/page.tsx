import authOptions from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { headers } from "next/headers";
import Image from "next/image";
import { redirect } from "next/navigation";

// Type for the complex charter query with all includes
type CharterWithIncludes = Prisma.CharterGetPayload<{
  include: {
    captain: {
      include: {
        user: {
          select: {
            id: true;
            email: true;
            role: true;
            createdAt: true;
            updatedAt: true;
            name: true;
          };
        };
      };
    };
    boat: true;
    amenities: true;
    features: true;
    media: true;
    pickup: { include: { areas: true } };
    policies: true;
    trips: {
      include: {
        species: true;
        startTimes: true;
        techniques: true;
        media: true;
      };
    };
    draft: true;
  };
}>;

// Type for captain verification query
// Type for captain verification query - using inline type definition based on actual schema
type CaptainVerificationSelect = {
  id: string;
  userId: string;
  idFront: Prisma.JsonValue | null;
  idBack: Prisma.JsonValue | null;
  captainLicense: Prisma.JsonValue | null;
  boatRegistration: Prisma.JsonValue | null;
  fishingLicense: Prisma.JsonValue | null;
  additional: Prisma.JsonValue; // array of Uploaded
  status: string; // VerificationStatus enum
  createdAt: Date;
  updatedAt: Date;
};

async function toggleActive(id: string, isActive: boolean) {
  const h = await headers();
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") || "http";
  const base = host?.startsWith("http")
    ? (host as string)
    : `${proto}://${host}`;
  const url = `${base}/api/admin/charters`;
  await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      cookie: h.get("cookie") || "",
    },
    body: JSON.stringify({ id, isActive }),
    cache: "no-store",
  });
}

export default async function StaffCharterDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user) redirect(`/auth?mode=signin&next=/staff/charters/${id}`);
  if (role !== "STAFF" && role !== "ADMIN") redirect("/captain");

  const c: CharterWithIncludes | null = await prisma.charter.findUnique({
    where: { id },
    include: {
      captain: {
        include: {
          user: {
            select: {
              id: true,
              email: true,
              role: true,
              createdAt: true,
              updatedAt: true,
              // prisma User model has optional name; include if present
              name: true,
            },
          },
        },
      },
      boat: true,
      amenities: true,
      features: true,
      media: true,
      pickup: { include: { areas: true } },
      policies: true,
      trips: {
        include: {
          species: true,
          startTimes: true,
          techniques: true,
          media: true,
        },
      },
      draft: true,
    },
  });
  if (!c) {
    return (
      <div className="px-6 py-8">
        <h1 className="text-2xl font-semibold tracking-tight">Charter</h1>
        <p className="text-sm text-slate-600">Not found.</p>
      </div>
    );
  }

  // Load captain verification for this charter's captain (if exists)
  const verification: CaptainVerificationSelect | null = c.captain?.userId
    ? await prisma.captainVerification.findUnique({
        where: { userId: c.captain.userId },
        select: {
          id: true,
          userId: true,
          idFront: true,
          idBack: true,
          captainLicense: true,
          boatRegistration: true,
          fishingLicense: true,
          additional: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      })
    : null;

  return (
    <div className="space-y-4 px-6 py-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xl font-semibold text-slate-900">{c.name}</div>
          <div className="text-sm text-slate-600">
            Captain: {c.captain?.displayName || c.captain?.userId || "—"}
          </div>
          <div className="text-slate-500">
            Created {new Date(c.createdAt).toLocaleString()} • Updated{" "}
            {new Date(c.updatedAt).toLocaleString()}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={
              c.isActive
                ? "inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800"
                : "inline-flex items-center rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700"
            }
          >
            {c.isActive ? "Active" : "Inactive"}
          </span>
          <form
            action={async () => {
              "use server";
              await toggleActive(c.id, !c.isActive);
              redirect(`/staff/charters/${c.id}`);
            }}
          >
            <button className="rounded-full border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
              {c.isActive ? "Disable" : "Enable"}
            </button>
          </form>
        </div>
      </div>

      {/* User */}
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800">User</h2>
          {verification ? (
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
              Verification: {verification.status}
            </span>
          ) : null}
        </div>
        <div className="grid gap-3 text-sm text-slate-700 sm:grid-cols-3">
          <div>
            <span className="text-slate-500">Display name:</span>{" "}
            {c.captain?.displayName || "—"}
          </div>
          <div>
            <span className="text-slate-500">User ID:</span>{" "}
            {c.captain?.userId || c.captain?.user?.id || "—"}
          </div>
          <div>
            <span className="text-slate-500">Email:</span>{" "}
            {c.captain?.user?.email || "—"}
          </div>
          <div>
            <span className="text-slate-500">Role:</span>{" "}
            {c.captain?.user?.role || "—"}
          </div>
          <div>
            <span className="text-slate-500">Account created:</span>{" "}
            {c.captain?.user?.createdAt
              ? new Date(c.captain.user.createdAt).toLocaleString()
              : "—"}
          </div>
          <div>
            <span className="text-slate-500">Account updated:</span>{" "}
            {c.captain?.user?.updatedAt
              ? new Date(c.captain.user.updatedAt).toLocaleString()
              : "—"}
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          {c.captain?.userId ? (
            <a
              href={`/staff/verification/${c.captain.userId}`}
              className="rounded-full border border-slate-300 px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-50"
            >
              Open verification
            </a>
          ) : null}
        </div>
      </section>

      {/* Draft (moved up) */}
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold text-slate-800">Draft</h2>
        {c.draft ? (
          <div className="grid gap-2 text-sm text-slate-700 sm:grid-cols-3">
            <div>ID: {c.draft.id}</div>
            <div>Status: {c.draft.status}</div>
            <div>Version: {c.draft.version}</div>
            <div>Step: {c.draft.currentStep}</div>
            <div>Form version: {c.draft.formVersion}</div>
            <div>
              Last touched: {new Date(c.draft.lastTouchedAt).toLocaleString()}
            </div>
          </div>
        ) : (
          <div className="text-sm text-slate-600">—</div>
        )}
      </section>

      {/* Captain */}
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold text-slate-800">Captain</h2>
        {c.captain ? (
          <div className="grid items-start gap-4 sm:grid-cols-4">
            {/* Avatar (left) */}
            <div>
              {c.captain.avatarUrl ? (
                <div className="relative h-24 w-24 overflow-hidden rounded-full border border-slate-200 bg-slate-100 sm:h-32 sm:w-32">
                  <Image
                    src={c.captain.avatarUrl}
                    alt="Captain avatar"
                    fill
                    sizes="(max-width: 640px) 96px, 128px"
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-xs text-slate-500 sm:h-32 sm:w-32">
                  No avatar
                </div>
              )}
            </div>

            {/* Details (right) */}
            <div className="sm:col-span-3">
              <div className="grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
                <div className="col-span-2">
                  <span className="text-slate-500">Display name:</span>{" "}
                  {c.captain.displayName}
                </div>
                <div>
                  <span className="text-slate-500">First name:</span>{" "}
                  {c.captain.firstName}
                </div>
                <div>
                  <span className="text-slate-500">Last name:</span>{" "}
                  {c.captain.lastName}
                </div>
                <div>
                  <span className="text-slate-500">Phone:</span>{" "}
                  {c.captain.phone}
                </div>
                <div>
                  <span className="text-slate-500">Experience:</span>{" "}
                  {c.captain.experienceYrs} years
                </div>
              </div>
            </div>

            {/* Bio and meta (full width below) */}
            <div className="sm:col-span-4">
              <div className="text-xs font-medium text-slate-500">Bio</div>
              <div className="whitespace-pre-wrap text-sm text-slate-700">
                {c.captain.bio || "—"}
              </div>
            </div>
            <div className="sm:col-span-4 grid gap-3 text-sm text-slate-700 sm:grid-cols-3">
              <div>
                <span className="text-slate-500">Created:</span>{" "}
                {new Date(c.captain.createdAt).toLocaleString()}
              </div>
              <div>
                <span className="text-slate-500">Updated:</span>{" "}
                {new Date(c.captain.updatedAt).toLocaleString()}
              </div>
              <div>
                <span className="text-slate-500">User ID:</span>{" "}
                {c.captain.userId}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-sm text-slate-600">—</div>
        )}
      </section>

      {/* Basics */}
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800">Basics</h2>
          <span className="text-xs text-slate-500">ID: {c.id}</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="text-sm text-slate-700">
            <div>
              <span className="text-slate-500">Type:</span> {c.charterType}
            </div>
            <div>
              <span className="text-slate-500">Pricing plan:</span>{" "}
              {c.pricingPlan}
            </div>
            <div>
              <span className="text-slate-500">Starting point:</span>{" "}
              {c.startingPoint}
            </div>
            <div>
              <span className="text-slate-500">City:</span> {c.city}
            </div>
            <div>
              <span className="text-slate-500">Postcode:</span> {c.postcode}
            </div>
          </div>
          <div className="text-sm text-slate-700">
            <div>
              <span className="text-slate-500">Latitude:</span>{" "}
              {c.latitude != null ? String(c.latitude) : "—"}
            </div>
            <div>
              <span className="text-slate-500">Longitude:</span>{" "}
              {c.longitude != null ? String(c.longitude) : "—"}
            </div>
            <div>
              <span className="text-slate-500">Boat ID:</span> {c.boatId ?? "—"}
            </div>
          </div>
        </div>
        <div className="mt-3">
          <div className="text-sm font-medium text-slate-700">Description</div>
          <p className="whitespace-pre-wrap text-sm text-slate-700">
            {c.description}
          </p>
        </div>
      </section>

      {/* Boat */}
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold text-slate-800">Boat</h2>
        {c.boat ? (
          <div className="grid gap-3 text-sm text-slate-700 sm:grid-cols-3">
            <div>
              <span className="text-slate-500">Name:</span> {c.boat.name}
            </div>
            <div>
              <span className="text-slate-500">Type:</span> {c.boat.type}
            </div>
            <div>
              <span className="text-slate-500">Length (ft):</span>{" "}
              {c.boat.lengthFt}
            </div>
            <div>
              <span className="text-slate-500">Capacity:</span>{" "}
              {c.boat.capacity}
            </div>
            <div>
              <span className="text-slate-500">Created:</span>{" "}
              {new Date(c.boat.createdAt).toLocaleString()}
            </div>
            <div>
              <span className="text-slate-500">Updated:</span>{" "}
              {new Date(c.boat.updatedAt).toLocaleString()}
            </div>
          </div>
        ) : (
          <div className="text-sm text-slate-600">No boat linked.</div>
        )}
      </section>

      {/* Amenities & Features */}
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold text-slate-800">
          Amenities & Features
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <div className="text-xs font-medium text-slate-500">Amenities</div>
            {c.amenities.length ? (
              <ul className="mt-1 list-inside list-disc text-sm text-slate-700">
                {c.amenities.map((a) => (
                  <li key={a.id}>{a.label}</li>
                ))}
              </ul>
            ) : (
              <div className="text-sm text-slate-600">—</div>
            )}
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500">Features</div>
            {c.features.length ? (
              <ul className="mt-1 list-inside list-disc text-sm text-slate-700">
                {c.features.map((f) => (
                  <li key={f.id}>{f.label}</li>
                ))}
              </ul>
            ) : (
              <div className="text-sm text-slate-600">—</div>
            )}
          </div>
        </div>
      </section>

      {/* Media (table with preview) */}
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold text-slate-800">
          Media ({c.media.length})
        </h2>
        {c.media.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs text-slate-500">
                <tr>
                  <th className="px-2 py-1">Preview</th>
                  <th className="px-2 py-1">Kind</th>
                  <th className="px-2 py-1">Mime</th>
                  <th className="px-2 py-1">Size</th>
                  <th className="px-2 py-1">Dims</th>
                  <th className="px-2 py-1">Created</th>
                </tr>
              </thead>
              <tbody>
                {c.media.map((m) => (
                  <tr key={m.id} className="border-t align-middle">
                    <td className="px-2 py-1">
                      <a href={m.url} target="_blank" className="block">
                        {m.mimeType?.startsWith("image/") || isImage(m.url) ? (
                          <div className="relative h-16 w-24 overflow-hidden rounded border border-slate-200">
                            <Image
                              src={m.url}
                              alt={m.url}
                              fill
                              sizes="96px"
                              className="object-cover"
                            />
                          </div>
                        ) : (
                          <div className="flex h-16 w-24 items-center justify-center rounded border border-slate-200 bg-slate-50 text-[10px] text-slate-600">
                            {m.mimeType || "file"}
                          </div>
                        )}
                      </a>
                    </td>
                    <td className="px-2 py-1 text-slate-700">{m.kind}</td>
                    <td className="px-2 py-1 text-slate-700">
                      {m.mimeType || "—"}
                    </td>
                    <td className="px-2 py-1 text-slate-700">
                      {m.sizeBytes ?? "—"}
                    </td>
                    <td className="px-2 py-1 text-slate-700">
                      {m.width && m.height ? `${m.width}×${m.height}` : "—"}
                    </td>
                    <td className="px-2 py-1 text-slate-700">
                      {new Date(m.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-sm text-slate-600">—</div>
        )}
      </section>

      {/* Pickup */}
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold text-slate-800">Pickup</h2>
        {c.pickup ? (
          <div className="grid gap-3 text-sm text-slate-700 sm:grid-cols-3">
            <div>Available: {c.pickup.available ? "Yes" : "No"}</div>
            <div>Fee: {c.pickup.fee != null ? String(c.pickup.fee) : "—"}</div>
            <div>Notes: {c.pickup.notes || "—"}</div>
            <div className="sm:col-span-3">
              <div className="text-xs font-medium text-slate-500">Areas</div>
              {c.pickup.areas.length ? (
                <ul className="mt-1 list-inside list-disc">
                  {c.pickup.areas.map((a) => (
                    <li key={a.id} className="text-sm text-slate-700">
                      {a.label}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-sm text-slate-600">—</div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-sm text-slate-600">—</div>
        )}
      </section>

      {/* Policies */}
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold text-slate-800">Policies</h2>
        {c.policies ? (
          <div className="grid gap-2 text-sm text-slate-700 sm:grid-cols-3">
            <div>
              License provided: {c.policies.licenseProvided ? "Yes" : "No"}
            </div>
            <div>Catch & keep: {c.policies.catchAndKeep ? "Yes" : "No"}</div>
            <div>
              Catch & release: {c.policies.catchAndRelease ? "Yes" : "No"}
            </div>
            <div>Child friendly: {c.policies.childFriendly ? "Yes" : "No"}</div>
            <div>
              Live bait provided: {c.policies.liveBaitProvided ? "Yes" : "No"}
            </div>
            <div>
              Alcohol not allowed: {c.policies.alcoholNotAllowed ? "Yes" : "No"}
            </div>
            <div>
              Smoking not allowed: {c.policies.smokingNotAllowed ? "Yes" : "No"}
            </div>
          </div>
        ) : (
          <div className="text-sm text-slate-600">—</div>
        )}
      </section>

      {/* Trips */}
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold text-slate-800">
          Trips ({c.trips.length})
        </h2>
        {c.trips.length ? (
          <div className="space-y-4">
            {c.trips.map((t) => (
              <div
                key={t.id}
                className="rounded-lg border border-slate-200 p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-medium text-slate-800">{t.name}</div>
                  <div className="text-xs text-slate-500">
                    Updated {new Date(t.updatedAt).toLocaleString()}
                  </div>
                </div>
                <div className="mt-1 grid gap-2 text-sm text-slate-700 sm:grid-cols-3">
                  <div>Type: {t.tripType}</div>
                  <div>Style: {t.style}</div>
                  <div>Price: {String(t.price)}</div>
                  <div>Duration: {t.durationHours} hours</div>
                  <div>Max anglers: {t.maxAnglers}</div>
                </div>
                {t.description ? (
                  <div className="mt-2 text-sm text-slate-700">
                    {t.description}
                  </div>
                ) : null}
                <div className="mt-2 grid gap-3 sm:grid-cols-3">
                  <div>
                    <div className="text-xs font-medium text-slate-500">
                      Species
                    </div>
                    {t.species.length ? (
                      <ul className="list-inside list-disc text-sm text-slate-700">
                        {t.species.map((s) => (
                          <li key={s.id}>{s.value}</li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-sm text-slate-600">—</div>
                    )}
                  </div>
                  <div>
                    <div className="text-xs font-medium text-slate-500">
                      Techniques
                    </div>
                    {t.techniques.length ? (
                      <ul className="list-inside list-disc text-sm text-slate-700">
                        {t.techniques.map((tech) => (
                          <li key={tech.id}>{tech.value}</li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-sm text-slate-600">—</div>
                    )}
                  </div>
                  <div>
                    <div className="text-xs font-medium text-slate-500">
                      Start times
                    </div>
                    {t.startTimes.length ? (
                      <ul className="list-inside list-disc text-sm text-slate-700">
                        {t.startTimes.map((st) => (
                          <li key={st.id}>{st.value}</li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-sm text-slate-600">—</div>
                    )}
                  </div>
                </div>
                {t.media.length ? (
                  <div className="mt-2 space-y-2">
                    <div className="text-xs text-slate-500">
                      Trip media: {t.media.length}
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {t.media.map((m) => (
                        <a
                          key={m.id}
                          href={m.url}
                          target="_blank"
                          className="group block overflow-hidden rounded-md border border-slate-200"
                        >
                          {m.mimeType?.startsWith("image/") ||
                          isImage(m.url) ? (
                            <div className="relative h-24 w-full">
                              <Image
                                src={m.url}
                                alt={m.url}
                                fill
                                sizes="(max-width: 640px) 50vw, 25vw"
                                className="object-cover transition group-hover:opacity-90"
                              />
                            </div>
                          ) : (
                            <div className="flex h-24 w-full items-center justify-center bg-slate-50 text-xs text-slate-600">
                              {m.mimeType || "file"}
                            </div>
                          )}
                        </a>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-slate-600">—</div>
        )}
      </section>

      {/* Verification documents (table) */}
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-2 flex items-start justify-between">
          <h2 className="text-sm font-semibold text-slate-800">
            Verification documents
          </h2>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            {verification ? (
              <span>
                Updated {new Date(verification.updatedAt).toLocaleString()}
              </span>
            ) : null}
            {c.captain?.userId ? (
              <a
                href={`/staff/verification/${c.captain.userId}`}
                className="rounded-full border border-slate-300 px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-50"
              >
                Open verification
              </a>
            ) : null}
          </div>
        </div>
        {!verification ? (
          <div className="text-sm text-slate-600">
            No verification record found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs text-slate-500">
                <tr>
                  <th className="px-2 py-1">Preview</th>
                  <th className="px-2 py-1">Type</th>
                  <th className="px-2 py-1">Name</th>
                  <th className="px-2 py-1">Status</th>
                  <th className="px-2 py-1">Valid until</th>
                  <th className="px-2 py-1">Updated</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const rows: { type: string; d: DocData | null }[] = [];
                  const docs = {
                    "ID: Front": toDoc(verification?.idFront),
                    "ID: Back": toDoc(verification?.idBack),
                    "Captain license": toDoc(verification?.captainLicense),
                    "Boat registration": toDoc(verification?.boatRegistration),
                    "Fishing license": toDoc(verification?.fishingLicense),
                  } as const;
                  Object.entries(docs).forEach(([type, d]) =>
                    rows.push({ type, d })
                  );
                  if (Array.isArray(verification?.additional)) {
                    (verification!.additional as unknown[])
                      .map((x) => toDoc(x))
                      .filter(Boolean)
                      .forEach((d) =>
                        rows.push({ type: "Additional", d: d as DocData })
                      );
                  }
                  return rows.map(({ type, d }, idx) => (
                    <tr
                      key={`${type}-${idx}`}
                      className="border-t align-middle"
                    >
                      <td className="px-2 py-2">
                        {d?.url ? (
                          isImage(d.name || d.url) ? (
                            <div className="relative h-16 w-24 overflow-hidden rounded border border-slate-200">
                              <Image
                                src={d.url}
                                alt={d.name}
                                fill
                                sizes="96px"
                                className="object-contain bg-slate-50"
                              />
                            </div>
                          ) : (
                            <div className="flex h-16 w-24 items-center justify-center rounded border border-slate-200 bg-slate-50 text-[10px] text-slate-600">
                              file
                            </div>
                          )
                        ) : (
                          <div className="flex h-16 w-24 items-center justify-center rounded border border-dashed border-slate-200 bg-slate-50 text-[10px] text-slate-400">
                            none
                          </div>
                        )}
                      </td>
                      <td className="px-2 py-2 text-slate-700">{type}</td>
                      <td className="break-all px-2 py-2 text-slate-700">
                        {d?.name || "—"}
                      </td>
                      <td className="px-2 py-2 text-slate-700">
                        {d?.status || "—"}
                      </td>
                      <td className="px-2 py-2 text-slate-700">
                        {d?.validForPeriod?.forever
                          ? "Forever"
                          : d?.validForPeriod?.to
                          ? new Date(d.validForPeriod.to).toLocaleDateString()
                          : d?.status && d.status.toLowerCase() === "validated"
                          ? "Forever"
                          : "—"}
                      </td>
                      <td className="px-2 py-2 text-slate-700">
                        {d?.updatedAt
                          ? new Date(d.updatedAt).toLocaleString()
                          : "—"}
                      </td>
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

// ----------------------
// Helpers
// ----------------------
function isImage(nameOrUrl: string | undefined | null): boolean {
  if (!nameOrUrl) return false;
  const s = String(nameOrUrl).toLowerCase();
  return [".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif", ".heic"].some(
    (ext) => s.includes(ext)
  );
}

// Enhanced DocData type with better type safety for verification documents
type DocData = {
  key?: string;
  name: string;
  url: string;
  status?: string;
  validForPeriod?: {
    from?: string | Date;
    to?: string | Date;
    forever?: boolean;
  };
  updatedAt?: string | Date;
};

// Type guard to ensure we have valid DocData
function isValidDocData(data: DocData | null): data is DocData {
  return (
    data !== null &&
    typeof data.name === "string" &&
    typeof data.url === "string"
  );
}

// Enhanced toDoc function with better type safety and validation
function toDoc(x: unknown): DocData | null {
  if (!x) return null;

  try {
    // Handle simple string URL case
    if (typeof x === "string") {
      const result = { name: x.split("/").pop() || x, url: x };
      return isValidDocData(result) ? result : null;
    }

    // Handle object case with proper type checking
    if (typeof x === "object" && x !== null) {
      const o = x as Record<string, unknown>;

      // Extract URL
      const urlVal = o.url ?? o.href;
      const url = typeof urlVal === "string" ? urlVal : undefined;

      // Extract name
      const nameVal =
        o.name ?? (url ? String(url).split("/").pop() : undefined);
      const name = typeof nameVal === "string" ? nameVal : undefined;

      // Early return if we don't have required fields
      if (!url || !name) return null;

      // Extract optional fields
      const keyVal = o.key ?? o.id ?? url;
      const key = typeof keyVal === "string" ? keyVal : url;
      const status = typeof o.status === "string" ? o.status : undefined;

      // Extract valid period with better type safety
      const validForPeriod = (() => {
        const v = o.validForPeriod ?? o.valid;
        if (typeof v === "object" && v !== null) {
          const vv = v as Record<string, unknown>;
          const from =
            typeof vv.from === "string" || vv.from instanceof Date
              ? vv.from
              : undefined;
          const to =
            typeof vv.to === "string" || vv.to instanceof Date
              ? vv.to
              : undefined;
          const forever =
            typeof vv.forever === "boolean" ? vv.forever : undefined;

          // Only return if at least one field is defined
          if (from !== undefined || to !== undefined || forever !== undefined) {
            return { from, to, forever };
          }
        }
        return undefined;
      })();

      // Extract updated date
      const updatedAtVal = o.updatedAt ?? o.updated;
      const updatedAt =
        typeof updatedAtVal === "string" || updatedAtVal instanceof Date
          ? updatedAtVal
          : undefined;

      const result = { key, name, url, status, validForPeriod, updatedAt };
      return isValidDocData(result) ? result : null;
    }
  } catch (error) {
    // Better error handling - log in development
    if (process.env.NODE_ENV === "development") {
      console.warn("toDoc failed to parse document data:", error);
    }
  }

  return null;
}
