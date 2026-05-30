import { NextResponse } from "next/server";

import { requireAdminUser } from "@/lib/admin-auth";
import { errorResponse } from "@/lib/api";
import { getPrismaClient } from "@/lib/prisma";
import { serializeUser } from "@/lib/serializers";

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
    const prisma = getPrismaClient();
    const users = await prisma.user.findMany({
      where: {
        role: {
          not: "ADMIN",
        },
        ...(status ? { status } : {}),
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ users: users.map(serializeUser) });
  } catch (error) {
    return errorResponse(error);
  }
}
