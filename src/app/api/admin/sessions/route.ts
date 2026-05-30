import { NextResponse } from "next/server";

import { requireAdminUser } from "@/lib/admin-auth";
import { errorResponse } from "@/lib/api";
import { getPrismaClient } from "@/lib/prisma";
import { serializeSession } from "@/lib/serializers";

export async function GET() {
  const adminCheck = await requireAdminUser();
  if (!adminCheck.ok) {
    return NextResponse.json({ error: adminCheck.reason }, { status: 401 });
  }

  try {
    const prisma = getPrismaClient();
    const sessions = await prisma.session.findMany({
      where: {
        user: {
          role: {
            not: "ADMIN",
          },
        },
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            rfidNumber: true,
          },
        },
      },
      orderBy: {
        inTime: "desc",
      },
      take: 300,
    });

    return NextResponse.json({ sessions: sessions.map(serializeSession) });
  } catch (error) {
    return errorResponse(error);
  }
}
