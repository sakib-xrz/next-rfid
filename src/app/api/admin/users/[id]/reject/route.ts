import { NextResponse } from "next/server";

import { requireAdminUser } from "@/lib/admin-auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminCheck = await requireAdminUser();
  if (!adminCheck.ok) {
    return NextResponse.json({ error: adminCheck.reason }, { status: 401 });
  }

  try {
    const { id } = await params;
    const admin = createAdminSupabaseClient();

    const { error } = await admin
      .from("users")
      .update({ status: "REJECTED" })
      .eq("id", id)
      .eq("status", "PENDING");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ message: "User rejected successfully" });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
