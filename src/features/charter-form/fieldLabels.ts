// Field labels & helpers migrated from legacy form module
export const FIELD_LABELS: Record<string, string> = {
	charterName: "Charter name",
	description: "Description",
	city: "City",
	state: "State",
	startingPoint: "Starting point",
	latitude: "Latitude",
	longitude: "Longitude",
	"operator.displayName": "Display name",
	"operator.bio": "Captain bio",
	"boat.name": "Boat name",
	"boat.type": "Boat type",
	"boat.lengthFeet": "Boat length (ft)",
	"boat.capacity": "Boat capacity",
	trips: "Trips",
	media: "Media",
};

export function friendlyFieldLabel(path: string): string {
	if (FIELD_LABELS[path]) return FIELD_LABELS[path];
	// Provide a humanized fallback: last segment, split camelCase
	const last = path.split(".").pop() || path;
	return last
		.replace(/([a-z0-9])([A-Z])/g, "$1 $2")
		.replace(/[-_]/g, " ")
		.replace(/^\w/, (c) => c.toUpperCase());
}

