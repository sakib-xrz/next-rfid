import { NextResponse } from "next/server";

import { errorResponse } from "@/lib/api";
import { getPrismaClient } from "@/lib/prisma";
import { registerSchema } from "@/lib/validators";

export const runtime = "nodejs";

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

    const prisma = getPrismaClient();
    const payload = parsed.data;

    await prisma.user.create({
      data: {
        idFromInstitution: payload.institution_id,
        name: payload.name,
        email: payload.email.toLowerCase(),
        phone: payload.phone,
        carNumber: payload.car_number,
        course: payload.course ?? null,
        role: payload.role,
        status: "PENDING",
        licenseFrontUrl: payload.license_front_url,
        licenseBackUrl: payload.license_back_url,
      },
    });

    return NextResponse.json(
      { message: "Request submitted successfully" },
      { status: 201 }
    );
  } catch (error) {
    return errorResponse(error);
  }
}
