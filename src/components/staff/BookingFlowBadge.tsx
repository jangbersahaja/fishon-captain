import { Badge } from "@/components/ui/badge";

interface BookingFlowBadgeProps {
  flowType: "MANUAL" | "AUTO";
  size?: "sm" | "default";
}

export function BookingFlowBadge({
  flowType,
  size = "default",
}: BookingFlowBadgeProps) {
  return (
    <Badge
      variant={flowType === "MANUAL" ? "default" : "secondary"}
      style={
        size === "sm"
          ? { fontSize: "0.75rem", padding: "0.125rem 0.5rem" }
          : undefined
      }
    >
      {flowType}
    </Badge>
  );
}
