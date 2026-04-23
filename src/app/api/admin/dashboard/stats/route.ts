import { NextResponse } from "next/server";

import { requireAdminUser } from "@/lib/admin-auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function GET() {
  const adminCheck = await requireAdminUser();
  if (!adminCheck.ok) {
    return NextResponse.json({ error: adminCheck.reason }, { status: 401 });
  }

  try {
    const admin = createAdminSupabaseClient();
    const [activeUsers, insideUsers, pendingUsers] = await Promise.all([
      admin
        .from("users")
        .select("id", { count: "exact", head: true })
        .eq("status", "ACTIVE")
        .neq("role", "ADMIN"),
      admin
        .from("sessions")
        .select("id,users!inner(role)", { count: "exact", head: true })
        .is("out_time", null)
        .neq("users.role", "ADMIN"),
      admin
        .from("users")
        .select("id", { count: "exact", head: true })
        .eq("status", "PENDING")
        .neq("role", "ADMIN"),
    ]);

    if (activeUsers.error || insideUsers.error || pendingUsers.error) {
      const firstError = activeUsers.error ?? insideUsers.error ?? pendingUsers.error;
      return NextResponse.json({ error: firstError?.message ?? "Failed to load dashboard stats" }, { status: 400 });
    }

    return NextResponse.json({
      totalActiveUsers: activeUsers.count ?? 0,
      currentlyInside: insideUsers.count ?? 0,
      pendingRequests: pendingUsers.count ?? 0,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
