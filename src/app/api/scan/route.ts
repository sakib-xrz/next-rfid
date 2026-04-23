import { NextResponse } from "next/server";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { scanSchema } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = scanSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid scan payload" }, { status: 400 });
    }

    const admin = createAdminSupabaseClient();
    const { data, error } = await admin.rpc("scan_rfid", {
      p_rfid_number: parsed.data.rfid_number.trim(),
      p_action: parsed.data.action,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const result = Array.isArray(data) ? data[0] : data;

    return NextResponse.json({
      message:
        parsed.data.action === "IN"
          ? `${result?.user_name ?? "User"} checked in successfully`
          : `${result?.user_name ?? "User"} checked out successfully`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
