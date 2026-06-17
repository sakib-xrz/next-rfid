import { NextResponse } from "next/server";

import { requireAdminUser } from "@/lib/admin-auth";
import { errorResponse } from "@/lib/api";
import { triggerManualGateOpen } from "@/lib/gate-control";
import { manualGateOpenSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const adminCheck = await requireAdminUser();
  if (!adminCheck.ok) {
    return NextResponse.json({ error: adminCheck.reason }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = manualGateOpenSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid gate open request",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    await triggerManualGateOpen({
      deviceId: parsed.data.device_id,
      reason: parsed.data.reason,
    });

    return NextResponse.json({ message: "Gate open signal sent" });
  } catch (error) {
    return errorResponse(error);
  }
}
