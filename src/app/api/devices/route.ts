import { type NextRequest, NextResponse } from "next/server";

import { errorResponse } from "@/lib/api";
import { getPrismaClient } from "@/lib/prisma";
import { serializeScanDevice } from "@/lib/serializers";

export async function GET(request: NextRequest) {
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
