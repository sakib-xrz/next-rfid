import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminUser } from "@/lib/admin-auth";
import { errorResponse } from "@/lib/api";
import { getPrismaClient } from "@/lib/prisma";

const updateStatusSchema = z.object({
  status: z.enum(["ACTIVE", "INACTIVE", "REJECTED"]),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminCheck = await requireAdminUser();
  if (!adminCheck.ok) {
    return NextResponse.json({ error: adminCheck.reason }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateStatusSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
    }

    const prisma = getPrismaClient();
    const currentUser = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        role: true,
        rfidNumber: true,
      },
    });

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (currentUser.role === "ADMIN") {
      return NextResponse.json({ error: "Admin status cannot be changed here" }, { status: 400 });
    }

    if (currentUser.status === "PENDING") {
      return NextResponse.json(
        { error: "Pending users must be approved or rejected from pending actions" },
        { status: 400 }
      );
    }

    if (parsed.data.status === "ACTIVE" && !currentUser.rfidNumber) {
      return NextResponse.json({ error: "RFID is required before setting user active" }, { status: 400 });
    }

    await prisma.user.update({
      where: { id },
      data: { status: parsed.data.status },
    });

    return NextResponse.json({ message: "User status updated" });
  } catch (error) {
    return errorResponse(error);
  }
}
