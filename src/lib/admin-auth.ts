import { redirect } from "next/navigation";

import { getAdminSession } from "@/lib/admin-session";
import { getPrismaClient } from "@/lib/prisma";

export async function requireAdminUser() {
  const session = await getAdminSession();

  if (!session?.email) {
    return { ok: false as const, reason: "Unauthorized" };
  }

  const prisma = getPrismaClient();
  const dbUser = await prisma.user.findUnique({
    where: { email: session.email.toLowerCase() },
    select: { id: true, email: true, role: true, status: true },
  });

  if (!dbUser || dbUser.role !== "ADMIN" || dbUser.status !== "ACTIVE") {
    return { ok: false as const, reason: "Forbidden" };
  }

  return { ok: true as const, authUser: session, dbUser };
}

export async function requireAdminOrRedirect() {
  const adminCheck = await requireAdminUser();
  if (!adminCheck.ok) {
    redirect("/admin/login");
  }

  return adminCheck;
}
