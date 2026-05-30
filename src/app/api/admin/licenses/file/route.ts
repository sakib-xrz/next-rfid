import { NextResponse } from "next/server";

import { requireAdminUser } from "@/lib/admin-auth";
import { errorResponse } from "@/lib/api";
import { readLicenseFile } from "@/lib/license-storage";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const adminCheck = await requireAdminUser();
  if (!adminCheck.ok) {
    return NextResponse.json({ error: adminCheck.reason }, { status: 401 });
  }

  try {
    const path = new URL(request.url).searchParams.get("path");
    if (!path) {
      return NextResponse.json({ error: "Storage path is required" }, { status: 400 });
    }

    const file = await readLicenseFile(path);
    return new NextResponse(file.data, {
      headers: {
        "Cache-Control": "private, max-age=300",
        "Content-Type": file.contentType,
      },
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: unknown }).code === "ENOENT"
    ) {
      return NextResponse.json({ error: "License file not found" }, { status: 404 });
    }

    return errorResponse(error);
  }
}
