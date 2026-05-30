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

    const result = await prisma.user.updateMany({
      where: {
        id,
        role: {
          not: "ADMIN",
        },
        status: "PENDING",
      },
      data: {
        status: "REJECTED",
      },
    });

    if (result.count === 0) {
      throw new ApiError("Only pending users can be rejected", 400);
    }

    return NextResponse.json({ message: "User rejected successfully" });
  } catch (error) {
    return errorResponse(error);
  }
}
