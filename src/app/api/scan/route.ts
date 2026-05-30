import { NextResponse } from "next/server";

import { errorResponse } from "@/lib/api";
import { processScan } from "@/lib/scan-service";
import { scanSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = scanSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid scan payload" }, { status: 400 });
    }

    const result = await processScan({
      rfidNumber: parsed.data.rfid_number,
      deviceId: parsed.data.device_id,
    });

    return NextResponse.json({ message: result.message });
  } catch (error) {
    return errorResponse(error);
  }
}
