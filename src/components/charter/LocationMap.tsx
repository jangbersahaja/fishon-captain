export default function LocationMap({
  title,
  mapEmbedSrc,
}: {
  title: string;
  mapEmbedSrc: string;
}) {
  return (
    <section className="mt-8">
      <div className="px-0">
        <h3 className="text-base font-semibold sm:text-lg">Location map</h3>
        <p className="mt-1 text-xs text-gray-500">
          Centered on the meeting point.
        </p>
      </div>
      <div className="relative mt-3">
        <iframe
          title={`Map of ${title}`}
          src={mapEmbedSrc}
          className="block w-full rounded-lg"
          style={{ aspectRatio: "16 / 9", border: 0 }}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
    </section>
  );
}
