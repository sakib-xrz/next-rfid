import { type NextRequest, NextResponse } from "next/server";

import { requireAdminUser } from "@/lib/admin-auth";
import { errorResponse } from "@/lib/api";
import { getPrismaClient } from "@/lib/prisma";
import { serializeScanDevice } from "@/lib/serializers";
import { createDeviceSchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  const adminCheck = await requireAdminUser();
  if (!adminCheck.ok) {
    return NextResponse.json({ error: adminCheck.reason }, { status: 401 });
  }

  const active = request.nextUrl.searchParams.get("active");

  try {
    const prisma = getPrismaClient();
    const devices = await prisma.scanDevice.findMany({
      where: active === "true" ? { isActive: true } : {},
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ devices: devices.map(serializeScanDevice) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  const adminCheck = await requireAdminUser();
  if (!adminCheck.ok) {
    return NextResponse.json({ error: adminCheck.reason }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = createDeviceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid device data", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const prisma = getPrismaClient();
    const device = await prisma.scanDevice.create({
      data: {
        name: parsed.data.name,
        type: parsed.data.type,
        location: parsed.data.location,
        serialNumber: parsed.data.serial_number || null,
        gateRelayPort: parsed.data.gate_relay_port?.trim() || null,
        stationId: parsed.data.station_id?.trim() || null,
        gateEnabled: parsed.data.gate_enabled ?? true,
      },
    });

    return NextResponse.json(
      { device: serializeScanDevice(device) },
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
