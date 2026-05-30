import { NextResponse } from "next/server";

import { requireAdminUser } from "@/lib/admin-auth";
import { errorResponse } from "@/lib/api";
import { resolveLicensePath } from "@/lib/license-storage";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const adminCheck = await requireAdminUser();
  if (!adminCheck.ok) {
    return NextResponse.json({ error: adminCheck.reason }, { status: 401 });
  }

  try {
    const { path } = (await request.json()) as { path?: string };
    if (!path) {
      return NextResponse.json({ error: "Storage path is required" }, { status: 400 });
    }

    resolveLicensePath(path);
    const signedUrl = new URL("/api/admin/licenses/file", request.url);
    signedUrl.searchParams.set("path", path);

    return NextResponse.json({ signedUrl: signedUrl.toString() });
  } catch (error) {
    return errorResponse(error);
  }
}
