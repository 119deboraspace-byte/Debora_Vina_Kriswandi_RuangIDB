import { SITUATION_LABEL, type RoomSituation } from "@/lib/rbac";
import { Badge, type BadgeTone } from "./ui/badge";

const TONE: Record<RoomSituation, BadgeTone> = {
  KOSONG: "ok",
  TERPAKAI: "busy",
  MENUNGGU_APPROVE: "hold",
  DITOLAK: "blocked",
};

export function SituationBadge({ situation, className }: { situation: RoomSituation; className?: string }) {
  return (
    <Badge tone={TONE[situation]} dot className={className}>
      {SITUATION_LABEL[situation]}
    </Badge>
  );
}
