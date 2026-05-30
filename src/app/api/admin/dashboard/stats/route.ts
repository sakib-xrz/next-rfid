import { NextResponse } from "next/server";

import { requireAdminUser } from "@/lib/admin-auth";
import { errorResponse } from "@/lib/api";
import { getPrismaClient } from "@/lib/prisma";

export async function GET() {
  const adminCheck = await requireAdminUser();
  if (!adminCheck.ok) {
    return NextResponse.json({ error: adminCheck.reason }, { status: 401 });
  }

  try {
    const prisma = getPrismaClient();
    const [activeUsers, insideUsers, pendingUsers] = await Promise.all([
      prisma.user.count({
        where: {
          status: "ACTIVE",
          role: {
            not: "ADMIN",
          },
        },
      }),
      prisma.session.count({
        where: {
          outTime: null,
          user: {
            role: {
              not: "ADMIN",
            },
          },
        },
      }),
      prisma.user.count({
        where: {
          status: "PENDING",
          role: {
            not: "ADMIN",
          },
        },
      }),
    ]);

    return NextResponse.json({
      totalActiveUsers: activeUsers,
      currentlyInside: insideUsers,
      pendingRequests: pendingUsers,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
