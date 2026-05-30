import { NextResponse } from "next/server";

import { requireAdminUser } from "@/lib/admin-auth";
import { errorResponse } from "@/lib/api";
import { getPrismaClient } from "@/lib/prisma";
import { serializeLog } from "@/lib/serializers";

export async function GET() {
  const adminCheck = await requireAdminUser();
  if (!adminCheck.ok) {
    return NextResponse.json({ error: adminCheck.reason }, { status: 401 });
  }

  try {
    const prisma = getPrismaClient();
    const logs = await prisma.log.findMany({
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
        createdAt: "desc",
      },
      take: 200,
    });

    return NextResponse.json({ logs: logs.map(serializeLog) });
  } catch (error) {
    return errorResponse(error);
  }
}
