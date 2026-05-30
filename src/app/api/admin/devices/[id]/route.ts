import { NextResponse } from "next/server";

import { requireAdminUser } from "@/lib/admin-auth";
import { ApiError, errorResponse } from "@/lib/api";
import { getPrismaClient } from "@/lib/prisma";
import { serializeScanDevice } from "@/lib/serializers";
import { updateDeviceSchema } from "@/lib/validators";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const adminCheck = await requireAdminUser();
  if (!adminCheck.ok) {
    return NextResponse.json({ error: adminCheck.reason }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const parsed = updateDeviceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid device data",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const prisma = getPrismaClient();
    const existing = await prisma.scanDevice.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      throw new ApiError("Device not found", 404);
    }

    const updated = await prisma.scanDevice.update({
      where: { id },
      data: {
        name: parsed.data.name,
        type: parsed.data.type,
        location: parsed.data.location,
        serialNumber: parsed.data.serial_number || null,
      },
    });

    return NextResponse.json({ device: serializeScanDevice(updated) });
  } catch (error) {
    return errorResponse(error);
  }
}
