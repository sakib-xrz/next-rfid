import { NextResponse } from "next/server";

import { requireAdminUser } from "@/lib/admin-auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

const STATUS_VALUES = ["PENDING", "ACTIVE", "INACTIVE", "REJECTED"] as const;
type StatusValue = (typeof STATUS_VALUES)[number];

function parseStatus(value: string | null): StatusValue | null {
  if (!value) return null;
  const normalized = value.toUpperCase();
  return STATUS_VALUES.includes(normalized as StatusValue) ? (normalized as StatusValue) : null;
}

export async function GET(request: Request) {
  const adminCheck = await requireAdminUser();
  if (!adminCheck.ok) {
    return NextResponse.json({ error: adminCheck.reason }, { status: 401 });
  }

  const status = parseStatus(new URL(request.url).searchParams.get("status"));

  try {
    const admin = createAdminSupabaseClient();
    let query = admin
      .from("users")
      .select(
        "id, name, email, phone, car_number, course, role, license_front_url, license_back_url, rfid_number, status, created_at"
      )
      .neq("role", "ADMIN")
      .order("created_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ users: data ?? [] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
