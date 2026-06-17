import { NextResponse } from "next/server";

import { errorResponse } from "@/lib/api";
import { getGateControlStatus } from "@/lib/gate-control";

export async function GET() {
  try {
    const status = await getGateControlStatus();
    return NextResponse.json(status);
  } catch (error) {
    return errorResponse(error);
  }
}
