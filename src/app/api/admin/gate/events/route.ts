import { NextResponse } from "next/server";

import { requireAdminUser } from "@/lib/admin-auth";
import { errorResponse } from "@/lib/api";
import { getPrismaClient } from "@/lib/prisma";
import { serializeGateEvent } from "@/lib/serializers";

export async function GET() {
  const adminCheck = await requireAdminUser();
  if (!adminCheck.ok) {
    return NextResponse.json({ error: adminCheck.reason }, { status: 401 });
  }

  try {
    const prisma = getPrismaClient();
    const events = await prisma.gateEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        device: {
          select: {
            name: true,
            type: true,
            location: true,
          },
        },
        user: {
          select: {
            name: true,
            email: true,
            rfidNumber: true,
          },
        },
      },
    });

    return NextResponse.json({
      events: events.map(serializeGateEvent),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
