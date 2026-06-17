import type { ActionType, GateEventStatusType } from "@/lib/types";
import { getPrismaClient } from "@/lib/prisma";

type RecordGateEventInput = {
  deviceId: string;
  userId?: string | null;
  action: ActionType;
  status: GateEventStatusType;
  reason?: string | null;
  error?: string | null;
};

export async function recordGateEvent(input: RecordGateEventInput) {
  const prisma = getPrismaClient();

  return prisma.gateEvent.create({
    data: {
      deviceId: input.deviceId,
      userId: input.userId ?? null,
      action: input.action,
      status: input.status,
      reason: input.reason ?? null,
      error: input.error ?? null,
    },
  });
}
