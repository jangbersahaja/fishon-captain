"use client";

import { useToasts } from "@/components/toast/ToastContext";
import { Button } from "@/components/ui/button";
import {
  Clock,
  DollarSign,
  Edit2,
  MapPin,
  Plus,
  Ship,
  Trash2,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { TripDialog } from "./TripDialog";

type Trip = {
  id: string;
  name: string;
  tripType: string;
  price: number;
  durationHours: number;
  maxAnglers: number;
  style: string;
  description: string | null;
  promoPrice: number | null;
  species: Array<{ id: string; value: string }>;
  startTimes: Array<{ id: string; value: string }>;
  techniques: Array<{ id: string; value: string }>;
  charter: {
    id: string;
    name: string;
  };
};

type Charter = {
  id: string;
  name: string;
};

type TripListProps = {
  trips: Trip[];
  charters: Charter[];
  adminUserId?: string;
};

export function TripList({ trips, charters, adminUserId }: TripListProps) {
  const router = useRouter();
  const { push } = useToasts();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const handleAdd = () => {
    setSelectedTrip(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (trip: Trip) => {
    setSelectedTrip(trip);
    setIsDialogOpen(true);
  };

  const handleDelete = async (tripId: string, tripName: string) => {
    if (
      !confirm(
        `Are you sure you want to delete trip "${tripName}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    setIsDeleting(tripId);
    try {
      const url = adminUserId
        ? `/api/captain/trips/${tripId}?adminUserId=${adminUserId}`
        : `/api/captain/trips/${tripId}`;

      const response = await fetch(url, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete trip");
      }

      push({
        message: "Trip deleted successfully",
        type: "success",
      });
      router.refresh();
    } catch (error) {
      console.error("Delete trip error:", error);
      push({
        message:
          error instanceof Error ? error.message : "Failed to delete trip",
        type: "error",
      });
    } finally {
      setIsDeleting(null);
    }
  };

  const handleSuccess = () => {
    setIsDialogOpen(false);
    setSelectedTrip(null);
    router.refresh();
  };

  // Format price in MYR
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-MY", {
      style: "currency",
      currency: "MYR",
    }).format(price);
  };

  return (
    <>
      <div className="space-y-4">
        {/* Add Trip Button */}
        <div className="flex justify-end">
          <Button
            onClick={handleAdd}
            className="bg-[#ec2227] hover:bg-[#d81e23]"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Trip
          </Button>
        </div>

        {/* Trips List */}
        {trips.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-12 text-center">
            <Ship className="mx-auto h-12 w-12 text-slate-400" />
            <h3 className="mt-4 text-lg font-semibold text-slate-900">
              No trips yet
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              Get started by creating your first trip package
            </p>
            <Button
              onClick={handleAdd}
              className="mt-4 bg-[#ec2227] hover:bg-[#d81e23]"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Trip
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {trips.map((trip) => (
              <div
                key={trip.id}
                className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Trip Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900 text-lg">
                      {trip.name}
                    </h3>
                    <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3" />
                      {trip.charter.name}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEdit(trip)}
                      disabled={isDeleting === trip.id}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(trip.id, trip.name)}
                      disabled={isDeleting === trip.id}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Trip Type Badge */}
                <div className="mb-4">
                  <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                    {trip.tripType}
                  </span>
                </div>

                {/* Trip Details */}
                <div className="space-y-3 mb-4">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <DollarSign className="w-4 h-4 text-slate-400" />
                    <span className="font-semibold text-slate-900">
                      {formatPrice(trip.price)}
                    </span>
                    {trip.promoPrice && (
                      <span className="text-xs text-green-600">
                        (Promo: {formatPrice(trip.promoPrice)})
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span>{trip.durationHours} hours</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Users className="w-4 h-4 text-slate-400" />
                    <span>Max {trip.maxAnglers} anglers</span>
                  </div>
                </div>

                {/* Description */}
                {trip.description && (
                  <p className="text-sm text-slate-600 mb-4 line-clamp-2">
                    {trip.description}
                  </p>
                )}

                {/* Species */}
                {trip.species.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-medium text-slate-700 mb-1">
                      Target Species:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {trip.species.slice(0, 3).map((species) => (
                        <span
                          key={species.id}
                          className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs text-green-700"
                        >
                          {species.value}
                        </span>
                      ))}
                      {trip.species.length > 3 && (
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                          +{trip.species.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Techniques */}
                {trip.techniques.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-medium text-slate-700 mb-1">
                      Techniques:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {trip.techniques.slice(0, 2).map((technique) => (
                        <span
                          key={technique.id}
                          className="inline-flex items-center rounded-full bg-purple-50 px-2 py-0.5 text-xs text-purple-700"
                        >
                          {technique.value}
                        </span>
                      ))}
                      {trip.techniques.length > 2 && (
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                          +{trip.techniques.length - 2} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Start Times */}
                {trip.startTimes.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-slate-700 mb-1">
                      Start Times:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {trip.startTimes.slice(0, 3).map((time) => (
                        <span
                          key={time.id}
                          className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700"
                        >
                          {time.value}
                        </span>
                      ))}
                      {trip.startTimes.length > 3 && (
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                          +{trip.startTimes.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <TripDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        trip={selectedTrip}
        charters={charters}
        adminUserId={adminUserId}
        onSuccess={handleSuccess}
      />
    </>
  );
}
