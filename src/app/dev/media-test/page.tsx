// app/dev/media-test/page.tsx
import { prisma } from "@/lib/prisma";
import Image from "next/image";

export default async function MediaTestPage() {
  const rows = await prisma.charterMedia.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      kind: true,
      url: true,
      storageKey: true,
      mimeType: true,
    },
  });

  return (
    <main className="p-6 space-y-6">
      <h1 className="text-xl font-bold">Latest media (20)</h1>
      <ul className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {rows.map((m) => (
          <li key={m.id} className="rounded-xl border p-4 space-y-2">
            <div className="text-sm text-slate-600">
              <div>
                <b>kind:</b> {m.kind}
              </div>
              <div>
                <b>key:</b> {m.storageKey}
              </div>
              <div>
                <b>mime:</b> {m.mimeType ?? "n/a"}
              </div>
              <div className="truncate">
                <b>url:</b>{" "}
                <a className="underline" href={m.url} target="_blank">
                  {m.url}
                </a>
              </div>
            </div>

            {m.kind === "CHARTER_PHOTO" ? (
              <Image
                src={m.url}
                alt={m.storageKey}
                className="w-full h-auto rounded-lg border"
                width={300}
                height={200}
              />
            ) : (
              <video
                src={m.url}
                className="w-full rounded-lg border"
                controls
                preload="metadata"
              />
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
