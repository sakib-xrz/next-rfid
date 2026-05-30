import { NextResponse } from "next/server";
import { z } from "zod";

import { setAdminSessionCookie } from "@/lib/admin-session";
import { errorResponse } from "@/lib/api";
import { verifyPassword } from "@/lib/password";
import { getPrismaClient } from "@/lib/prisma";

export const runtime = "nodejs";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid login payload" }, { status: 400 });
    }

    const prisma = getPrismaClient();
    const user = await prisma.user.findUnique({
      where: {
        email: parsed.data.email.toLowerCase(),
      },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        passwordHash: true,
      },
    });

    const validPassword = await verifyPassword(parsed.data.password, user?.passwordHash ?? null);
    if (!user || user.role !== "ADMIN" || user.status !== "ACTIVE" || !validPassword) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const response = NextResponse.json({ message: "Login successful" });
    setAdminSessionCookie(response, {
      userId: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
    });

    return response;
  } catch (error) {
    return errorResponse(error, "Login failed");
  }
}
