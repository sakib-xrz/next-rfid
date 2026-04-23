import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminUser } from "@/lib/admin-auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

const updateStatusSchema = z.object({
  status: z.enum(["ACTIVE", "INACTIVE", "REJECTED"]),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminCheck = await requireAdminUser();
  if (!adminCheck.ok) {
    return NextResponse.json({ error: adminCheck.reason }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateStatusSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
    }

    const admin = createAdminSupabaseClient();
    const { data: currentUser, error: currentUserError } = await admin
      .from("users")
      .select("id, status, role, rfid_number")
      .eq("id", id)
      .single();

    if (currentUserError || !currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (currentUser.role === "ADMIN") {
      return NextResponse.json({ error: "Admin status cannot be changed here" }, { status: 400 });
    }

    if (currentUser.status === "PENDING") {
      return NextResponse.json(
        { error: "Pending users must be approved or rejected from pending actions" },
        { status: 400 }
      );
    }

    if (parsed.data.status === "ACTIVE" && !currentUser.rfid_number) {
      return NextResponse.json({ error: "RFID is required before setting user active" }, { status: 400 });
    }

    const { error } = await admin.from("users").update({ status: parsed.data.status }).eq("id", id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ message: "User status updated" });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
