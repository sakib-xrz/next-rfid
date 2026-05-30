import { Badge } from "@/components/ui/badge";
import type { ActionType, StatusType } from "@/lib/types";

export function UserStatusBadge({ status }: { status: StatusType }) {
  const variantByStatus = {
    ACTIVE: "success",
    PENDING: "warning",
    INACTIVE: "neutral",
    REJECTED: "destructive",
  } as const;

  return <Badge variant={variantByStatus[status]}>{status}</Badge>;
}

export function ActionBadge({ action }: { action: ActionType }) {
  return (
    <Badge variant={action === "IN" ? "default" : "secondary"}>
      {action === "IN" ? "CHECK-IN" : "CHECK-OUT"}
    </Badge>
  );
}

export function DeviceStatusBadge({ active }: { active: boolean }) {
  return (
    <Badge variant={active ? "success" : "destructive"}>
      {active ? "Active" : "Inactive"}
    </Badge>
  );
}
