import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminUser } from "@/lib/admin-auth";
import { ApiError, errorResponse } from "@/lib/api";
import { getPrismaClient } from "@/lib/prisma";

const approveSchema = z.object({
  rfid_number: z.string().trim().min(1).max(24),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminCheck = await requireAdminUser();
  if (!adminCheck.ok) {
    return NextResponse.json({ error: adminCheck.reason }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = approveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid RFID number" }, { status: 400 });
    }

    const { id } = await params;
    const prisma = getPrismaClient();

    const result = await prisma.user.updateMany({
      where: {
        id,
        role: {
          not: "ADMIN",
        },
        status: {
          in: ["PENDING", "INACTIVE"],
        },
      },
      data: {
        rfidNumber: parsed.data.rfid_number,
        status: "ACTIVE",
      },
    });

    if (result.count === 0) {
      throw new ApiError("User cannot be approved from the current status", 400);
    }

    return NextResponse.json({ message: "User approved successfully" });
  } catch (error) {
    return errorResponse(error);
  }
}
