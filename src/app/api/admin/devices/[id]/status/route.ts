import { NextResponse } from "next/server";

import { requireAdminUser } from "@/lib/admin-auth";
import { ApiError, errorResponse } from "@/lib/api";
import { getPrismaClient } from "@/lib/prisma";
import { serializeScanDevice } from "@/lib/serializers";

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const adminCheck = await requireAdminUser();
  if (!adminCheck.ok) {
    return NextResponse.json({ error: adminCheck.reason }, { status: 401 });
  }

  const { id } = await params;

  try {
    const prisma = getPrismaClient();
    const device = await prisma.scanDevice.findUnique({
      where: { id },
      select: { id: true, isActive: true },
    });

    if (!device) {
      throw new ApiError("Device not found", 404);
    }

    const updated = await prisma.scanDevice.update({
      where: { id },
      data: { isActive: !device.isActive },
    });

    return NextResponse.json({ device: serializeScanDevice(updated) });
  } catch (error) {
    return errorResponse(error);
  }
}
