import { NextResponse } from "next/server";

import { requireAdminUser } from "@/lib/admin-auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

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

    const admin = createAdminSupabaseClient();
    const { data, error } = await admin.storage
      .from("licenses")
      .createSignedUrl(path, 60 * 5);

    if (error || !data?.signedUrl) {
      return NextResponse.json(
        { error: error?.message ?? "Unable to generate signed URL" },
        { status: 400 }
      );
    }

    return NextResponse.json({ signedUrl: data.signedUrl });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
