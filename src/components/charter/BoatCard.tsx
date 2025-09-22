import type { Charter } from "@/dummy/charter";

export default function BoatCard({ charter }: { charter: Charter }) {
  const boat = charter.boat;
  if (!boat) return null;
  return (
    <div className="mt-6 rounded-2xl border border-black/10 bg-white p-5 sm:p-6">
      <h3 className="text-base font-semibold sm:text-lg">Boat</h3>
      <ul className="mt-2 grid grid-cols-1 gap-2 text-sm text-gray-700 sm:grid-cols-2">
        {boat.name && (
          <li>
            <strong>Name:</strong> {boat.name}
          </li>
        )}
        {boat.type && (
          <li>
            <strong>Type:</strong> {boat.type}
          </li>
        )}
        {boat.length && (
          <li>
            <strong>Length:</strong> {boat.length}
          </li>
        )}
        {typeof boat.capacity === "number" && (
          <li>
            <strong>Capacity:</strong> {boat.capacity} pax
          </li>
        )}
        {Array.isArray(boat.features) && boat.features.length > 0 && (
          <li className="sm:col-span-2">
            <strong>Features:</strong> {boat.features.join(", ")}
          </li>
        )}
      </ul>
    </div>
  );
}
