import { NextResponse } from "next/server";

import { ApiError, errorResponse } from "@/lib/api";
import { getPrismaClient } from "@/lib/prisma";
import { scanSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = scanSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid scan payload" }, { status: 400 });
    }

    const prisma = getPrismaClient();
    const normalizedRfid = parsed.data.rfid_number.trim();

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

      if (parsed.data.action === "IN") {
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
          },
        });

        await tx.log.create({
          data: {
            userId: user.id,
            action: "IN",
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
            createdAt: now,
          },
        });
      }

      return {
        name: user.name,
        action: parsed.data.action,
      };
    });

    return NextResponse.json({
      message:
        result.action === "IN"
          ? `${result.name} checked in successfully`
          : `${result.name} checked out successfully`,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
