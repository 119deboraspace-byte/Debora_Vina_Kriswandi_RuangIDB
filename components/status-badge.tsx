import { STATUS_LABEL, STATUS_TONE, type BookingStatus } from "@/lib/rbac";
import { Badge, type BadgeTone } from "@/components/ui/badge";

const toneMap: Record<string, BadgeTone> = {
  ok: "ok",
  wait: "hold",
  bad: "busy",
  muted: "muted",
  info: "brand",
};

export function StatusBadge({ status }: { status: BookingStatus }) {
  return (
    <Badge tone={toneMap[STATUS_TONE[status]] ?? "muted"} dot>
      {STATUS_LABEL[status]}
    </Badge>
  );
}
