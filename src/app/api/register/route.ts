import { NextResponse } from "next/server";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { registerSchema } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const admin = createAdminSupabaseClient();
    const payload = parsed.data;

    const { error } = await admin.from("users").insert({
      name: payload.name,
      email: payload.email.toLowerCase(),
      phone: payload.phone,
      car_number: payload.car_number,
      course: payload.course,
      role: "STUDENT",
      status: "PENDING",
      license_front_url: payload.license_front_url,
      license_back_url: payload.license_back_url,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { message: "Request submitted successfully" },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
