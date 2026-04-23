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
    const normalizedRfid = parsed.data.rfid_number.trim();

    const { data: user, error: userError } = await admin
      .from("users")
      .select("id, name")
      .eq("rfid_number", normalizedRfid)
      .eq("status", "ACTIVE")
      .maybeSingle();

    if (userError) {
      return NextResponse.json({ error: userError.message }, { status: 400 });
    }

    if (!user) {
      return NextResponse.json({ error: "No active user found for this RFID" }, { status: 400 });
    }

    const nowIso = new Date().toISOString();

    if (parsed.data.action === "IN") {
      const { data: existingSession, error: existingSessionError } = await admin
        .from("sessions")
        .select("id")
        .eq("user_id", user.id)
        .is("out_time", null)
        .maybeSingle();

      if (existingSessionError) {
        return NextResponse.json({ error: existingSessionError.message }, { status: 400 });
      }

      if (existingSession) {
        return NextResponse.json({ error: "Vehicle is already inside" }, { status: 400 });
      }

      const { error: insertSessionError } = await admin.from("sessions").insert({
        user_id: user.id,
        in_time: nowIso,
      });
      if (insertSessionError) {
        return NextResponse.json({ error: insertSessionError.message }, { status: 400 });
      }

      const { error: insertLogError } = await admin.from("logs").insert({
        user_id: user.id,
        action: "IN",
        created_at: nowIso,
      });
      if (insertLogError) {
        return NextResponse.json({ error: insertLogError.message }, { status: 400 });
      }
    } else {
      const { data: activeSession, error: activeSessionError } = await admin
        .from("sessions")
        .select("id, in_time")
        .eq("user_id", user.id)
        .is("out_time", null)
        .order("in_time", { ascending: false })
        .maybeSingle();

      if (activeSessionError) {
        return NextResponse.json({ error: activeSessionError.message }, { status: 400 });
      }

      if (!activeSession) {
        return NextResponse.json({ error: "No active IN session found" }, { status: 400 });
      }

      const totalTime = Math.max(
        0,
        Math.floor((new Date(nowIso).getTime() - new Date(activeSession.in_time).getTime()) / 1000)
      );

      const { error: updateSessionError } = await admin
        .from("sessions")
        .update({
          out_time: nowIso,
          total_time: totalTime,
        })
        .eq("id", activeSession.id);
      if (updateSessionError) {
        return NextResponse.json({ error: updateSessionError.message }, { status: 400 });
      }

      const { error: insertLogError } = await admin.from("logs").insert({
        user_id: user.id,
        action: "OUT",
        created_at: nowIso,
      });
      if (insertLogError) {
        return NextResponse.json({ error: insertLogError.message }, { status: 400 });
      }
    }

    return NextResponse.json({
      message:
        parsed.data.action === "IN"
          ? `${user.name} checked in successfully`
          : `${user.name} checked out successfully`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
