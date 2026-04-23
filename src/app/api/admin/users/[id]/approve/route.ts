import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminUser } from "@/lib/admin-auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

const approveSchema = z.object({
  rfid_number: z.string().trim().min(1).max(24),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminCheck = await requireAdminUser();
  if (!adminCheck.ok) {
    return NextResponse.json({ error: adminCheck.reason }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = approveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid RFID number" }, { status: 400 });
    }

    const { id } = await params;
    const admin = createAdminSupabaseClient();

    const { error } = await admin
      .from("users")
      .update({
        rfid_number: parsed.data.rfid_number,
        status: "ACTIVE",
      })
      .eq("id", id)
      .in("status", ["PENDING", "INACTIVE"]);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ message: "User approved successfully" });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
