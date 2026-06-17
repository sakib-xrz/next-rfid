import { ApiError } from "@/lib/api";
import { triggerGateOpen } from "@/lib/gate-control";
import { getPrismaClient } from "@/lib/prisma";
import type { ActionType } from "@/lib/types";

type ProcessScanInput = {
  rfidNumber: string;
  deviceId: string;
};

type ProcessScanResult = {
  action: ActionType;
  message: string;
  name: string;
  userId: string;
  deviceId: string;
};

export async function processScan({
  rfidNumber,
  deviceId,
}: ProcessScanInput): Promise<ProcessScanResult> {
  const prisma = getPrismaClient();
  const normalizedRfid = rfidNumber.trim();

  if (!normalizedRfid) {
    throw new ApiError("RFID number is required", 400);
  }

  const device = await prisma.scanDevice.findUnique({
    where: { id: deviceId },
    select: { id: true, type: true, isActive: true, name: true },
  });

  if (!device) {
    throw new ApiError("Scan device not found", 400);
  }

  if (!device.isActive) {
    throw new ApiError("Scan device is inactive", 400);
  }

  const action = device.type as ActionType;

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.findFirst({
      where: {
        rfidNumber: normalizedRfid,
        status: "ACTIVE",
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!user) {
      throw new ApiError("No active user found for this RFID", 400);
    }

    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${user.id}))`;

    const now = new Date();

    if (action === "IN") {
      const existingSession = await tx.session.findFirst({
        where: {
          userId: user.id,
          outTime: null,
        },
        select: {
          id: true,
        },
      });

      if (existingSession) {
        throw new ApiError("Vehicle is already inside", 400);
      }

      await tx.session.create({
        data: {
          userId: user.id,
          inTime: now,
          deviceId: device.id,
        },
      });

      await tx.log.create({
        data: {
          userId: user.id,
          action: "IN",
          deviceId: device.id,
          createdAt: now,
        },
      });
    } else {
      const activeSession = await tx.session.findFirst({
        where: {
          userId: user.id,
          outTime: null,
        },
        orderBy: {
          inTime: "desc",
        },
        select: {
          id: true,
          inTime: true,
        },
      });

      if (!activeSession) {
        throw new ApiError("No active IN session found", 400);
      }

      const totalTime = Math.max(
        0,
        Math.floor((now.getTime() - activeSession.inTime.getTime()) / 1000),
      );

      await tx.session.update({
        where: {
          id: activeSession.id,
        },
        data: {
          outTime: now,
          totalTime,
        },
      });

      await tx.log.create({
        data: {
          userId: user.id,
          action: "OUT",
          deviceId: device.id,
          createdAt: now,
        },
      });
    }

    return {
      name: user.name,
      action,
      userId: user.id,
      deviceId: device.id,
    };
  });

  void triggerGateOpen({
    deviceId: result.deviceId,
    action: result.action,
    userId: result.userId,
    reason: "RFID scan approved",
  }).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Unknown gate error";
    console.error(`[GATE] Failed to open gate for device ${result.deviceId}:`, message);
  });

  return {
    ...result,
    message:
      result.action === "IN"
        ? `${result.name} checked in successfully`
        : `${result.name} checked out successfully`,
  };
}
