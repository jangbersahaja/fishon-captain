// PoliciesInfoCard.tsx
import type { Charter } from "@/dummy/charter";

export default function PoliciesInfoCard({ charter }: { charter: Charter }) {
  if (!charter?.policies && !charter?.pickup) return null;

  return (
    <section className="mt-6 rounded-2xl border border-black/10 bg-white p-5 sm:p-6">
      <h3 className="text-base font-semibold sm:text-lg">
        Policies &amp; info
      </h3>
      <div className="mt-2 grid grid-cols-1 gap-4 text-sm text-gray-700 sm:grid-cols-2">
        {charter?.policies && (
          <ul className="space-y-1">
            <li>
              <strong>Catch &amp; keep:</strong>{" "}
              {charter.policies.catchAndKeep ? "Allowed" : "No"}
            </li>
            <li>
              <strong>Catch &amp; release:</strong>{" "}
              {charter.policies.catchAndRelease ? "Yes" : "No"}
            </li>
            <li>
              <strong>Child friendly:</strong>{" "}
              {charter.policies.childFriendly ? "Yes" : "No"}
            </li>
            {"wheelchairAccessible" in charter.policies && (
              <li>
                <strong>Wheelchair accessible:</strong>{" "}
                {charter.policies.wheelchairAccessible ? "Yes" : "No"}
              </li>
            )}
            {"liveBaitProvided" in charter.policies && (
              <li>
                <strong>Live bait:</strong>{" "}
                {charter.policies.liveBaitProvided
                  ? "Provided"
                  : "Not provided"}
              </li>
            )}
            {"alcoholAllowed" in charter.policies && (
              <li>
                <strong>Alcohol:</strong>{" "}
                {charter.policies.alcoholAllowed ? "Allowed" : "Not allowed"}
              </li>
            )}
            {"smokingAllowed" in charter.policies && (
              <li>
                <strong>Smoking:</strong>{" "}
                {charter.policies.smokingAllowed ? "Allowed" : "Not allowed"}
              </li>
            )}
          </ul>
        )}

        {charter?.pickup && (
          <ul className="space-y-1">
            <li>
              <strong>Pickup:</strong>{" "}
              {charter.pickup.available
                ? charter.pickup.included
                  ? "Available — included"
                  : "Available"
                : "Not available"}
            </li>
            {"fee" in charter.pickup && charter.pickup.fee !== undefined && (
              <li>
                <strong>Pickup fee:</strong> RM{charter.pickup.fee}
              </li>
            )}
            {Array.isArray(charter.pickup.areas) &&
              charter.pickup.areas.length > 0 && (
                <li>
                  <strong>Areas:</strong> {charter.pickup.areas.join(", ")}
                </li>
              )}
            {charter.pickup.notes && (
              <li>
                <strong>Notes:</strong> {charter.pickup.notes}
              </li>
            )}
          </ul>
        )}
      </div>
    </section>
  );
}
