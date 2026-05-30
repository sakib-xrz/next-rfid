import { NextResponse } from "next/server";

import { requireAdminUser } from "@/lib/admin-auth";
import { ApiError, errorResponse } from "@/lib/api";
import { getPrismaClient } from "@/lib/prisma";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminCheck = await requireAdminUser();
  if (!adminCheck.ok) {
    return NextResponse.json({ error: adminCheck.reason }, { status: 401 });
  }

  try {
    const { id } = await params;
    const prisma = getPrismaClient();
    const now = new Date();

    const session = await prisma.session.findFirst({
      where: {
        id,
        outTime: null,
      },
      select: {
        id: true,
        inTime: true,
      },
    });

    if (!session) {
      throw new ApiError("Session is already closed or does not exist", 400);
    }

    await prisma.session.update({
      where: { id: session.id },
      data: {
        outTime: now,
        totalTime: Math.max(0, Math.floor((now.getTime() - session.inTime.getTime()) / 1000)),
      },
    });

    return NextResponse.json({ message: "Session force-closed successfully" });
  } catch (error) {
    return errorResponse(error);
  }
}
