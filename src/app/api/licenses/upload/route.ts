import { NextResponse } from "next/server";

import { ApiError, errorResponse } from "@/lib/api";
import { saveLicenseFile } from "@/lib/license-storage";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const side = formData.get("side");

    if (!(file instanceof File)) {
      throw new ApiError("License image is required", 400);
    }

    if (side !== "front" && side !== "back") {
      throw new ApiError("License side must be front or back", 400);
    }

    const path = await saveLicenseFile(file, side);
    return NextResponse.json({ path }, { status: 201 });
  } catch (error) {
    return errorResponse(error, "Upload failed");
  }
}
